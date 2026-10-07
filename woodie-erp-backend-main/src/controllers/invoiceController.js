const { Invoice, INVOICE_TYPES, PAYMENT_METHODS } = require("../models/Invoice");
const { WorkOrder } = require("../models/WorkOrder");
const { BoqQuotation } = require("../models/BoqQuotation");
const { Inquiry } = require("../models/Inquiry");
const { openSnagCount } = require("../middleware/workOrderAccess");
const { generateInvoicePDF } = require("../utils/generateInvoicePdf");
const {
  generateInvoiceNumber,
  applyInvoiceAmounts,
  syncInvoiceStatus,
  timelineEntry,
  roundMoney,
  resolveContractExTax,
  resolveContractInclTax,
  resolveTaxPercent,
  deriveWorkOrderPaymentStatus,
  syncWorkOrderPaymentStatus,
  MAX_FOLLOW_UPS,
} = require("../utils/invoiceHelpers");

async function listInvoices(req, res) {
  try {
    const { status, workOrderId, type, q = "" } = req.query ?? {};
    const filter = {};
    const search = String(q).trim();
    if (status && status !== "All") filter.status = status;
    if (workOrderId) filter.workOrderId = workOrderId;
    if (type && type !== "All") filter.type = type;
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { workOrderNumber: { $regex: search, $options: "i" } },
        { clientName: { $regex: search, $options: "i" } },
        { projectName: { $regex: search, $options: "i" } },
      ];
    }

    const pageParam = Number(req.query?.page);
    const pageSizeParam = Number(req.query?.pageSize);
    const usePagination = Number.isFinite(pageParam) && pageParam > 0;
    if (!usePagination) {
      const rows = await Invoice.find(filter).sort({ updatedAt: -1 }).limit(500);
      return res.json(rows);
    }

    const page = Math.max(1, Math.floor(pageParam));
    const pageSize = Math.min(100, Math.max(1, Math.floor(pageSizeParam || 20)));
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      Invoice.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(pageSize),
      Invoice.countDocuments(filter),
    ]);
    return res.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to list invoices" });
  }
}

async function getInvoiceById(req, res) {
  try {
    const doc = await Invoice.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Invoice not found" });
    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load invoice" });
  }
}

async function createInvoice(req, res) {
  try {
    const { workOrderId, type, taxPercent, dueDate } = req.body ?? {};

    if (!workOrderId) return res.status(400).json({ message: "workOrderId is required" });
    if (!INVOICE_TYPES.includes(type)) {
      return res.status(400).json({ message: "type must be Advance, Progress, or Final" });
    }

    const wo = await WorkOrder.findById(workOrderId);
    if (!wo) return res.status(404).json({ message: "Work order not found" });

    if (wo.paymentStatus === "Paid") {
      return res.status(400).json({
        message: "Work order is fully paid — no further invoices can be created",
      });
    }

    const existingActive = await Invoice.findOne({
      workOrderId: wo._id,
      status: { $ne: "Cancelled" },
    }).sort({ createdAt: 1 });
    if (existingActive) {
      const activeCount = await Invoice.countDocuments({
        workOrderId: wo._id,
        status: { $ne: "Cancelled" },
      });
      if (activeCount > 1) {
        return res.status(400).json({
          message:
            "This work order has multiple invoices. Record payments on the existing invoices; creating another is blocked. Prefer settling balance on the earliest invoice.",
          existingInvoiceId: existingActive._id,
          invoiceNumber: existingActive.invoiceNumber,
        });
      }

      const quotationForExisting = wo.quotationId
        ? await BoqQuotation.findById(wo.quotationId).lean()
        : null;
      const contractForExisting = resolveContractExTax(wo, quotationForExisting);
      const shortfall = roundMoney(contractForExisting - (Number(existingActive.amount) || 0));

      // Legacy under-billed invoices: expand amount to full contract on the same record.
      if (shortfall > 0.009) {
        existingActive.amount = contractForExisting;
        applyInvoiceAmounts(existingActive);
        if (existingActive.status === "Paid" && existingActive.outstandingBalance > 0.009) {
          existingActive.status = "Partially Paid";
        } else if (
          existingActive.status !== "Draft" &&
          existingActive.status !== "Cancelled" &&
          existingActive.status !== "Escalated"
        ) {
          syncInvoiceStatus(existingActive);
        }
        existingActive.activityTimeline.push(
          timelineEntry(
            "Invoice Adjusted",
            `Amount set to full contract ex-tax AED ${contractForExisting.toFixed(2)}. Record remaining payments on this invoice.`,
            req,
          ),
        );
        await existingActive.save();

        wo.activityTimeline.unshift({
          action: "Invoice Adjusted",
          note: `${existingActive.invoiceNumber} expanded to full contract`,
          createdBy: req.user?.name || "System",
          createdAt: new Date(),
        });
        await wo.save();

        return res.json(existingActive);
      }

      return res.status(400).json({
        message:
          "An invoice already exists for this work order. Record additional payments on that invoice instead of creating a new one.",
        existingInvoiceId: existingActive._id,
        invoiceNumber: existingActive.invoiceNumber,
      });
    }

    if (type === "Final" && openSnagCount(wo) > 0) {
      return res.status(400).json({
        message: "Cannot create Final invoice while open snags exist on this work order",
      });
    }

    const quotation = wo.quotationId
      ? await BoqQuotation.findById(wo.quotationId).lean()
      : null;
    const contractExTax = resolveContractExTax(wo, quotation);
    if (contractExTax <= 0) {
      return res.status(400).json({ message: "Work order has no contract amount to invoice" });
    }

    // One ledger invoice per WO — always for the full contract (ex-tax).
    // Advances / later collections are recorded as payments on this invoice.
    const amt = contractExTax;
    const resolvedTax = taxPercent != null ? Number(taxPercent) : resolveTaxPercent(quotation);
    const invoiceNumber = await generateInvoiceNumber();
    const doc = new Invoice({
      invoiceNumber,
      type,
      status: "Draft",
      workOrderId: wo._id,
      workOrderNumber: wo.workOrderNumber,
      projectName: wo.projectName || "",
      clientName: wo.clientName,
      clientPhone: wo.clientPhone || "",
      clientEmail: wo.clientEmail || "",
      amount: amt,
      taxPercent: Number.isFinite(resolvedTax) ? resolvedTax : 5,
      paidAmount: 0,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: req.user._id,
      createdByName: req.user?.name || "",
      activityTimeline: [
        timelineEntry(
          "Invoice Created",
          `${type} invoice created for full contract ex-tax AED ${amt.toFixed(2)}. Record payments (advance, progress, final) on this invoice.`,
          req,
        ),
      ],
    });

    applyInvoiceAmounts(doc);
    await doc.save();

    if (!wo.paymentStatus) wo.paymentStatus = "Unpaid";
    wo.activityTimeline.unshift({
      action: "Invoice Created",
      note: `${invoiceNumber} (${type}) — full contract draft. Collect payments on this invoice.`,
      createdBy: req.user?.name || "System",
      createdAt: new Date(),
    });
    await wo.save();

    return res.status(201).json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to create invoice" });
  }
}

async function sendInvoice(req, res) {
  try {
    const doc = await Invoice.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Invoice not found" });
    if (doc.status !== "Draft") {
      return res.status(400).json({ message: "Only Draft invoices can be sent" });
    }

    doc.status = "Awaiting Payment";
    doc.sentAt = new Date();
    doc.activityTimeline.push(
      timelineEntry("Invoice Sent", "Invoice sent to client — awaiting payment", req),
    );
    await doc.save();
    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to send invoice" });
  }
}

async function recordPayment(req, res) {
  try {
    const doc = await Invoice.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Invoice not found" });
    if (doc.status === "Cancelled" || doc.status === "Paid") {
      return res.status(400).json({ message: "Cannot record payment on this invoice status" });
    }

    if (doc.status === "Draft") {
      doc.status = "Awaiting Payment";
      doc.sentAt = doc.sentAt || new Date();
    }

    let payAmount = Number(req.body?.amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ message: "amount must be positive" });
    }

    applyInvoiceAmounts(doc);
    const outstanding = roundMoney(doc.outstandingBalance);
    if (payAmount > outstanding + 0.009) {
      return res.status(400).json({
        message: `Payment exceeds remaining balance. Outstanding AED ${outstanding.toFixed(2)}`,
      });
    }
    payAmount = roundMoney(Math.min(payAmount, outstanding));

    const method = String(req.body?.method ?? "").trim();
    if (!PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({ message: "Valid payment method is required" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "receiptFile is required" });
    }

    const receiptUrl = `/uploads/receipts/${doc._id}/${file.filename}`;
    doc.payments.push({
      amount: payAmount,
      method,
      receiptUrl,
      recordedBy: req.user._id,
      recordedByName: req.user?.name || "",
      recordedAt: new Date(),
    });

    applyInvoiceAmounts(doc);
    syncInvoiceStatus(doc);

    doc.activityTimeline.push(
      timelineEntry(
        "Payment Recorded",
        `${method}: AED ${payAmount.toFixed(2)}. Outstanding: AED ${doc.outstandingBalance.toFixed(2)}`,
        req,
      ),
    );

    if (doc.outstandingBalance <= 0) {
      doc.followUpCount = 0;
      doc.escalatedAt = null;
    }

    await doc.save();

    const wo = await WorkOrder.findById(doc.workOrderId);
    if (wo) {
      const activeInvoices = await Invoice.find({
        workOrderId: wo._id,
        status: { $ne: "Cancelled" },
      })
        .select("paidAmount outstandingBalance")
        .lean();
      const totalPaid = roundMoney(
        activeInvoices.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0),
      );
      const outstanding = roundMoney(
        activeInvoices.reduce((s, r) => s + (Number(r.outstandingBalance) || 0), 0),
      );
      await syncWorkOrderPaymentStatus(wo._id, {
        totalPaid,
        outstanding,
        hasInvoice: true,
        req,
      });
    }

    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to record payment" });
  }
}

async function escalateInvoice(req, res) {
  try {
    const doc = await Invoice.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Invoice not found" });
    if (doc.followUpCount < MAX_FOLLOW_UPS) {
      return res.status(400).json({
        message: `Escalation requires at least ${MAX_FOLLOW_UPS} follow-ups (current: ${doc.followUpCount})`,
      });
    }
    if (doc.status === "Escalated") {
      return res.status(400).json({ message: "Invoice is already escalated" });
    }

    doc.status = "Escalated";
    doc.escalatedAt = new Date();
    doc.activityTimeline.push(timelineEntry("Escalated", "Escalated to manager for follow-up", req));
    await doc.save();
    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to escalate invoice" });
  }
}

async function resolveEscalation(req, res) {
  try {
    const doc = await Invoice.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Invoice not found" });
    if (doc.status !== "Escalated") {
      return res.status(400).json({ message: "Only escalated invoices can be resolved" });
    }

    const action = String(req.body?.action ?? "").trim();
    const note = String(req.body?.note ?? "").trim();
    if (!note) return res.status(400).json({ message: "note is required" });

    if (action === "Resume") {
      doc.status = doc.paidAmount > 0 ? "Partially Paid" : "Awaiting Payment";
      doc.followUpCount = 0;
      doc.escalatedAt = null;
      doc.activityTimeline.push(timelineEntry("Escalation Resolved", `Resume: ${note}`, req));
    } else if (action === "Write Off") {
      doc.status = "Cancelled";
      doc.activityTimeline.push(timelineEntry("Written Off", note, req));
    } else {
      return res.status(400).json({ message: "action must be Resume or Write Off" });
    }

    await doc.save();
    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to resolve escalation" });
  }
}

async function recordFollowUp(req, res) {
  try {
    const doc = await Invoice.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Invoice not found" });
    if (doc.status === "Draft") {
      return res.status(400).json({ message: "Send the invoice before recording follow-ups" });
    }
    if (doc.status === "Paid" || doc.status === "Cancelled") {
      return res.status(400).json({ message: "Cannot follow up on this invoice status" });
    }
    if (doc.status === "Escalated") {
      return res.status(400).json({ message: "Invoice is already escalated" });
    }
    if (doc.outstandingBalance <= 0) {
      return res.status(400).json({ message: "Invoice has no outstanding balance" });
    }
    if (doc.followUpCount >= MAX_FOLLOW_UPS) {
      return res.status(400).json({
        message: `Maximum ${MAX_FOLLOW_UPS} follow-ups reached. Escalate to manager.`,
      });
    }

    const note = String(req.body?.note ?? "").trim();
    doc.followUpCount += 1;
    doc.lastFollowUpAt = new Date();
    doc.activityTimeline.push(
      timelineEntry(
        `Follow-up ${doc.followUpCount}/${MAX_FOLLOW_UPS}`,
        note ||
          `Payment reminder recorded (outstanding AED ${doc.outstandingBalance.toFixed(2)})`,
        req,
      ),
    );
    await doc.save();
    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to record follow-up" });
  }
}

async function financeStats(_req, res) {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [awaitingPayment, escalated, paidThisMonth, outstandingAgg] = await Promise.all([
      Invoice.countDocuments({ status: "Awaiting Payment", outstandingBalance: { $gt: 0 } }),
      Invoice.countDocuments({ status: "Escalated" }),
      Invoice.countDocuments({ status: "Paid", updatedAt: { $gte: startOfMonth } }),
      Invoice.aggregate([
        { $match: { outstandingBalance: { $gt: 0 }, status: { $ne: "Cancelled" } } },
        { $group: { _id: null, total: { $sum: "$outstandingBalance" } } },
      ]),
    ]);

    return res.json({
      awaitingPayment,
      escalatedInvoices: escalated,
      paidThisMonth,
      totalOutstanding: outstandingAgg[0]?.total ?? 0,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load finance stats" });
  }
}

async function downloadInvoicePdf(req, res) {
  try {
    const doc = await Invoice.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const wo = doc.workOrderId ? await WorkOrder.findById(doc.workOrderId).lean() : null;
    let boqData = null;
    let inquiryData = null;

    if (wo?.quotationId) {
      boqData = await BoqQuotation.findById(wo.quotationId).lean();
    }
    if (wo?.inquiryId) {
      inquiryData = await Inquiry.findById(wo.inquiryId).lean();
    }

    const pdfBuffer = await generateInvoicePDF(doc, boqData, inquiryData, wo);
    const safeNumber = String(doc.invoiceNumber || doc._id).replace(/[^\w.-]+/g, "_");
    const filename = `invoice-${safeNumber}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Invoice PDF generation failed:", error);
    return res.status(500).json({
      message: error.message || "Failed to generate invoice PDF",
    });
  }
}

async function workOrderInvoiceSummary(req, res) {
  try {
    const { workOrderId } = req.params;
    const wo = await WorkOrder.findById(workOrderId).lean();
    if (!wo) return res.status(404).json({ message: "Work order not found" });

    const quotation = wo.quotationId
      ? await BoqQuotation.findById(wo.quotationId)
          .select("quotationNumber subtotal discountAmount taxPercent taxAmount grandTotal projectName")
          .lean()
      : null;

    const rows = await Invoice.find({ workOrderId, status: { $ne: "Cancelled" } })
      .sort({ createdAt: 1 })
      .lean();

    const contractExTax = resolveContractExTax(wo, quotation);
    const contractInclTax = resolveContractInclTax(wo, quotation, contractExTax);
    const taxPercent = resolveTaxPercent(quotation);
    const invoicedExTax = roundMoney(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0));
    const totalInvoiced = roundMoney(rows.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0));
    const totalPaid = roundMoney(rows.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0));
    const outstanding = roundMoney(
      rows.reduce((s, r) => s + (Number(r.outstandingBalance) || 0), 0),
    );
    const remainingToInvoice = roundMoney(Math.max(0, contractExTax - invoicedExTax));
    const hasInvoice = rows.length > 0;
    const paymentStatus = deriveWorkOrderPaymentStatus({
      totalPaid,
      outstanding,
      hasInvoice,
    });
    const fullyPaid = paymentStatus === "Paid";
    const primaryInvoice = rows[0] || null;
    const canCreateInvoice = !hasInvoice && !fullyPaid && contractExTax > 0;

    return res.json({
      workOrderId: String(wo._id),
      workOrderNumber: wo.workOrderNumber,
      quotationNumber: quotation?.quotationNumber || null,
      quotationId: quotation?._id ? String(quotation._id) : null,
      contractExTax,
      contractInclTax,
      taxPercent,
      invoicedExTax,
      totalInvoiced,
      remainingToInvoice,
      totalPaid,
      outstanding,
      invoiceCount: rows.length,
      invoices: rows,
      paymentStatus: hasInvoice ? paymentStatus : "Not invoiced",
      fullyPaid,
      canCreateInvoice,
      primaryInvoiceId: primaryInvoice?._id ? String(primaryInvoice._id) : null,
      advanceCollected: totalPaid > 0,
      paidPercent:
        contractInclTax > 0
          ? Math.min(100, Math.round((totalPaid / contractInclTax) * 100))
          : totalInvoiced > 0
            ? Math.min(100, Math.round((totalPaid / totalInvoiced) * 100))
            : 0,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load summary" });
  }
}

module.exports = {
  listInvoices,
  getInvoiceById,
  downloadInvoicePdf,
  createInvoice,
  sendInvoice,
  recordPayment,
  recordFollowUp,
  escalateInvoice,
  resolveEscalation,
  financeStats,
  workOrderInvoiceSummary,
};
