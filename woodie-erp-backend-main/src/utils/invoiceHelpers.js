const { Invoice } = require("../models/Invoice");

const MAX_FOLLOW_UPS = 3;

async function generateInvoiceNumber() {
  const rows = await Invoice.find({ invoiceNumber: /^INV-\d+$/ }).select("invoiceNumber").lean();
  let maxSeq = 0;
  for (const row of rows) {
    const match = /^INV-(\d+)$/.exec(String(row.invoiceNumber ?? ""));
    if (match) maxSeq = Math.max(maxSeq, Number(match[1]));
  }
  return `INV-${String(maxSeq + 1).padStart(4, "0")}`;
}

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function resolveTaxPercent(quotation, fallback = 5) {
  const raw = Number(quotation?.taxPercent);
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
}

/**
 * Contract value for invoicing is always EXCLUDING VAT.
 * Prefer BOQ: subtotal - discount (or grandTotal - taxAmount).
 * Fallback: WO.approvedAmount (stored ex-tax for new WOs).
 */
function resolveContractExTax(workOrder, quotation) {
  const taxPercent = resolveTaxPercent(quotation);
  if (quotation) {
    const subtotal = Number(quotation.subtotal);
    const discountAmount = Number(quotation.discountAmount) || 0;
    if (Number.isFinite(subtotal) && subtotal > 0) {
      return roundMoney(Math.max(0, subtotal - discountAmount));
    }
    const grand = Number(quotation.grandTotal) || 0;
    const taxAmt = Number(quotation.taxAmount);
    if (Number.isFinite(taxAmt) && taxAmt >= 0 && grand > 0) {
      return roundMoney(Math.max(0, grand - taxAmt));
    }
    if (grand > 0) {
      return roundMoney(grand / (1 + taxPercent / 100));
    }
  }
  const approved = Number(workOrder?.approvedAmount) || 0;
  return roundMoney(Math.max(0, approved));
}

function resolveContractInclTax(workOrder, quotation, contractExTax) {
  const taxPercent = resolveTaxPercent(quotation);
  if (quotation) {
    const grand = Number(quotation.grandTotal);
    if (Number.isFinite(grand) && grand > 0) return roundMoney(grand);
    const taxAmt = Number(quotation.taxAmount);
    if (Number.isFinite(taxAmt)) return roundMoney(contractExTax + taxAmt);
  }
  return roundMoney(contractExTax * (1 + taxPercent / 100));
}

function applyInvoiceAmounts(doc) {
  const amount = Number(doc.amount) || 0;
  const taxPercent = Number.isFinite(Number(doc.taxPercent)) ? Number(doc.taxPercent) : 5;
  doc.taxPercent = taxPercent;
  doc.taxAmount = roundMoney((amount * taxPercent) / 100);
  doc.totalAmount = roundMoney(amount + doc.taxAmount);
  const paid = (doc.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  doc.paidAmount = roundMoney(paid);
  doc.outstandingBalance = roundMoney(Math.max(0, doc.totalAmount - doc.paidAmount));
}

function syncInvoiceStatus(doc) {
  if (doc.status === "Cancelled" || doc.status === "Draft" || doc.status === "Escalated") {
    return;
  }
  if (doc.outstandingBalance <= 0 && doc.paidAmount > 0) {
    doc.status = "Paid";
  } else if (doc.paidAmount > 0 && doc.outstandingBalance > 0) {
    doc.status = "Partially Paid";
  } else if (doc.sentAt && doc.status !== "Escalated") {
    doc.status = "Awaiting Payment";
  }
}

/**
 * Derive WO payment status from invoice cash vs outstanding.
 * - Paid: invoice(s) fully settled (outstanding ~0 with payments)
 * - Partially Paid: any payment recorded
 * - Unpaid: invoiced but nothing collected
 */
function deriveWorkOrderPaymentStatus({ totalPaid, outstanding, hasInvoice }) {
  if (!hasInvoice) return "Unpaid";
  const paid = roundMoney(totalPaid || 0);
  const due = roundMoney(outstanding || 0);
  if (paid > 0 && due <= 0.009) return "Paid";
  if (paid > 0) return "Partially Paid";
  return "Unpaid";
}

async function syncWorkOrderPaymentStatus(workOrderId, { totalPaid, outstanding, hasInvoice, req }) {
  const { WorkOrder } = require("../models/WorkOrder");
  const wo = await WorkOrder.findById(workOrderId);
  if (!wo) return null;

  const next = deriveWorkOrderPaymentStatus({ totalPaid, outstanding, hasInvoice });
  if (wo.paymentStatus === next) return wo;

  const prev = wo.paymentStatus || "Unpaid";
  wo.paymentStatus = next;
  if (next === "Paid" && prev !== "Paid") {
    wo.activityTimeline.unshift({
      action: "Fully Paid",
      note: "Contract amount fully received — no further invoices",
      createdBy: req?.user?.name || "System",
      createdAt: new Date(),
    });
  } else if (next === "Partially Paid" && prev === "Unpaid") {
    wo.activityTimeline.unshift({
      action: "Payment Started",
      note: "First payment recorded against work order invoice",
      createdBy: req?.user?.name || "System",
      createdAt: new Date(),
    });
  }
  await wo.save();
  return wo;
}

function timelineEntry(action, note, req) {
  return {
    action,
    note: note || "",
    by: req?.user?._id,
    byName: req?.user?.name || "System",
    at: new Date(),
  };
}

function timelineEntrySystem(action, note) {
  return timelineEntry(action, note, null);
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

module.exports = {
  MAX_FOLLOW_UPS,
  generateInvoiceNumber,
  roundMoney,
  resolveTaxPercent,
  resolveContractExTax,
  resolveContractInclTax,
  applyInvoiceAmounts,
  syncInvoiceStatus,
  deriveWorkOrderPaymentStatus,
  syncWorkOrderPaymentStatus,
  timelineEntry,
  timelineEntrySystem,
  startOfToday,
};
