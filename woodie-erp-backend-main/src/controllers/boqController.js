const { BoqQuotation, recalculateTotals } = require("../models/BoqQuotation");
const { Inquiry } = require("../models/Inquiry");
const { WorkOrder } = require("../models/WorkOrder");

const QUOTATION_DELETABLE_STATUSES = [
  "BOQ In Progress",
  "Quotation Draft",
  "Pending Approval",
  "Rejected",
  "Revision Requested",
  "Lost",
];
const { validateBoqPayload } = require("../utils/boqValidation");
const { formatCount } = require("../utils/formatCount");
const {
  itemsFromSiteReport,
  itemsFromWorkItems,
  mergeBoqItems,
  projectNameFromInquiry,
  siteInformationFromInquiry,
  resolveSiteBlocks,
} = require("../utils/siteReportToBoq");

const SALES_EDIT_STATUSES = [
  "BOQ In Progress",
  "Quotation Draft",
  "Revision Requested",
  "Rejected",
  "Pending Approval",
  "Approved",
  "Quotation Sent",
  "Negotiation",
];
const SUBMIT_STATUSES = ["BOQ In Progress", "Quotation Draft", "Revision Requested", "Rejected"];

function activity(action, note, createdBy = "System") {
  return { action, note, createdBy };
}

function actorName(req) {
  return req.user?.name || "System";
}

async function generateQuotationNumber() {
  const rows = await BoqQuotation.find({ quotationNumber: /^QT-\d+$/ }).select("quotationNumber").lean();
  let maxSeq = 0;
  for (const row of rows) {
    const match = /^QT-(\d+)$/.exec(String(row.quotationNumber ?? ""));
    if (match) maxSeq = Math.max(maxSeq, Number(match[1]));
  }
  return `QT-${String(maxSeq + 1).padStart(4, "0")}`;
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    _id: item._id,
    itemCode: String(item.itemCode ?? "").trim(),
    description: String(item.description ?? "").trim(),
    category: item.category || "Material",
    quantity: Math.max(0, Number(item.quantity) || 0),
    unit: String(item.unit ?? "unit").trim(),
    unitPrice: Math.max(0, Number(item.unitPrice) || 0),
    costingSheet: item.costingSheet || null,
  })).filter((item) => item.description);
}

async function listQuotations(req, res) {
  const { q = "", status = "All" } = req.query;
  const search = String(q).trim();
  const filter = {};

  if (req.user.role === "sales") {
    filter.createdBy = req.user._id;
  }

  if (status !== "All") {
    filter.status = status;
  }

  if (search) {
    filter.$or = [
      { quotationNumber: { $regex: search, $options: "i" } },
      { projectName: { $regex: search, $options: "i" } },
      { clientName: { $regex: search, $options: "i" } },
    ];
  }

  const pageParam = Number(req.query?.page);
  const pageSizeParam = Number(req.query?.pageSize);
  const usePagination = Number.isFinite(pageParam) && pageParam > 0;
  if (!usePagination) {
    const data = await BoqQuotation.find(filter).sort({ updatedAt: -1 });
    return res.json(data);
  }

  const page = Math.max(1, Math.floor(pageParam));
  const pageSize = Math.min(100, Math.max(1, Math.floor(pageSizeParam || 20)));
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    BoqQuotation.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(pageSize),
    BoqQuotation.countDocuments(filter),
  ]);
  return res.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

async function listPendingApprovals(req, res) {
  const data = await BoqQuotation.find({ status: "Pending Approval" }).sort({ updatedAt: -1 });
  return res.json(data);
}

async function ensureSiteInformation(doc) {
  if (!doc.inquiryId) return doc;
  const inquiry = await Inquiry.findById(doc.inquiryId).lean();
  if (!inquiry?.siteReport) return doc;
  const snapshot = siteInformationFromInquiry(inquiry);
  if (!snapshot) return doc;
  // Always keep quotation.siteInformation in sync with the submitted site report
  // so Measurements / Material / Condition / Risk / Notes / Attachments are present — not only Work Items.
  doc.siteInformation = snapshot;
  doc.markModified("siteInformation");
  await doc.save();
  return doc;
}

async function getQuotation(req, res) {
  const doc = await BoqQuotation.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Quotation not found" });

  if (req.user.role === "sales" && String(doc.createdBy) !== String(req.user._id)) {
    return res.status(403).json({ message: "You can only view your own quotations" });
  }

  await ensureSiteInformation(doc);
  return res.json(doc);
}

async function getQuotationByInquiry(req, res) {
  const { inquiryId } = req.params;
  const doc = await BoqQuotation.findOne({ inquiryId });
  if (!doc) return res.status(404).json({ message: "No BOQ linked to this inquiry yet" });

  if (req.user.role === "sales" && String(doc.createdBy) !== String(req.user._id)) {
    return res.status(403).json({ message: "You can only view your own quotations" });
  }

  return res.json(doc);
}

async function createQuotation(req, res) {
  const inquiryId = req.body.inquiryId || null;

  let linkedInquiry = null;
  if (inquiryId) {
    const existing = await BoqQuotation.findOne({ inquiryId });
    if (existing) {
      if (req.user.role === "sales" && String(existing.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ message: "You can only access your own quotations" });
      }
      return res.json(existing);
    }

    linkedInquiry = await Inquiry.findById(inquiryId);
    if (!linkedInquiry) return res.status(404).json({ message: "Inquiry not found" });
    if (linkedInquiry.status !== "Site Report Attached") {
      return res.status(400).json({
        message: "BOQ can only be started after the site visit report is submitted (Site Report Attached)",
      });
    }
  }

  const payload = {
    projectName: String(req.body.projectName ?? "").trim() || "New Project",
    clientName: String(req.body.clientName ?? "").trim() || "TBD",
    clientEmail: String(req.body.clientEmail ?? "").trim(),
    clientPhone: String(req.body.clientPhone ?? "").trim(),
    inquiryId,
    items: Array.isArray(req.body.items) ? req.body.items : [],
    taxPercent: req.body.taxPercent ?? 8,
    discountPercent: req.body.discountPercent ?? 0,
    paymentTerms: String(req.body.paymentTerms ?? "").trim() || "Net 30 days",
    notes: String(req.body.notes ?? "").trim(),
  };

  if (linkedInquiry) {
    payload.projectName =
      payload.projectName === "New Project"
        ? projectNameFromInquiry(linkedInquiry)
        : payload.projectName;
    payload.clientName =
      payload.clientName === "TBD" ? String(linkedInquiry.clientName).trim() : payload.clientName;
    payload.clientEmail = payload.clientEmail || String(linkedInquiry.email ?? "").trim();
    payload.clientPhone = payload.clientPhone || String(linkedInquiry.phone ?? "").trim();

    const siteInformation = siteInformationFromInquiry(linkedInquiry);
    if (siteInformation) {
      payload.siteInformation = siteInformation;
    }

    // Keep free-text notes for sales edits only — structured site blocks live in siteInformation.
    if (!payload.items.length) {
      payload.items = itemsFromSiteReport(linkedInquiry);
    }
  }

  const validationError = validateBoqPayload(payload, { requireItems: false });
  if (validationError) return res.status(400).json({ message: validationError });

  const quotationNumber = await generateQuotationNumber();
  const doc = new BoqQuotation({
    quotationNumber,
    projectName: payload.projectName,
    clientName: payload.clientName,
    clientEmail: payload.clientEmail,
    clientPhone: payload.clientPhone,
    inquiryId: payload.inquiryId || null,
    status: "BOQ In Progress",
    items: normalizeItems(payload.items),
    taxPercent: Number(payload.taxPercent),
    discountPercent: Number(payload.discountPercent),
    paymentTerms: payload.paymentTerms,
    notes: payload.notes,
    siteInformation: payload.siteInformation || null,
    createdBy: req.user._id,
    createdByName: actorName(req),
    activityTimeline: [
      activity(
        "BOQ Preparation",
        linkedInquiry && payload.items.length
          ? `BOQ started — ${formatCount(payload.items.length, "line", "lines")} loaded from site report`
          : inquiryId
            ? "BOQ started from inquiry"
            : "BOQ preparation started",
        actorName(req),
      ),
    ],
  });

  recalculateTotals(doc);
  await doc.save();
  return res.status(201).json(doc);
}

async function updateQuotation(req, res) {
  const doc = await BoqQuotation.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Quotation not found" });

  if (req.user.role === "sales" && String(doc.createdBy) !== String(req.user._id)) {
    return res.status(403).json({ message: "You can only edit your own quotations" });
  }

  if (!SALES_EDIT_STATUSES.includes(doc.status)) {
    return res.status(400).json({ message: `Cannot edit quotation while status is ${doc.status}` });
  }

  const validationError = validateBoqPayload({ ...doc.toObject(), ...req.body });
  if (validationError) return res.status(400).json({ message: validationError });

  if (req.body.projectName !== undefined) doc.projectName = String(req.body.projectName).trim();
  if (req.body.clientName !== undefined) doc.clientName = String(req.body.clientName).trim();
  if (req.body.clientEmail !== undefined) doc.clientEmail = String(req.body.clientEmail).trim();
  if (req.body.clientPhone !== undefined) doc.clientPhone = String(req.body.clientPhone).trim();
  if (req.body.paymentTerms !== undefined) doc.paymentTerms = String(req.body.paymentTerms).trim();
  if (req.body.notes !== undefined) doc.notes = String(req.body.notes).trim();
  if (req.body.taxPercent !== undefined) doc.taxPercent = Number(req.body.taxPercent);
  if (req.body.discountPercent !== undefined) doc.discountPercent = Number(req.body.discountPercent);
  if (req.body.items !== undefined) doc.items = normalizeItems(req.body.items);

  recalculateTotals(doc);
  const isPostApproval = ["Approved", "Quotation Sent", "Negotiation"].includes(doc.status);
  doc.activityTimeline.unshift(
    activity(
      isPostApproval ? "Price Updated" : "BOQ Updated",
      isPostApproval ? "Pricing or BOQ items updated (post-approval)" : "Items or pricing updated",
      actorName(req),
    ),
  );
  await doc.save();
  return res.json(doc);
}

async function importSiteReportItems(req, res) {
  const doc = await BoqQuotation.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Quotation not found" });

  if (req.user.role === "sales" && String(doc.createdBy) !== String(req.user._id)) {
    return res.status(403).json({ message: "You can only edit your own quotations" });
  }

  if (!SALES_EDIT_STATUSES.includes(doc.status)) {
    return res.status(400).json({ message: `Cannot edit quotation while status is ${doc.status}` });
  }

  if (!doc.inquiryId) {
    return res.status(400).json({ message: "This quotation is not linked to an inquiry" });
  }

  const inquiry = await Inquiry.findById(doc.inquiryId);
  if (!inquiry) return res.status(404).json({ message: "Linked inquiry not found" });
  if (inquiry.status !== "Site Report Attached") {
    return res.status(400).json({
      message: "Site report must be submitted before importing BOQ lines",
    });
  }

  const blocks = resolveSiteBlocks(inquiry.siteReport);
  const allWorkItems = blocks.flatMap((b) => b.workItems || []);
  const sourceWorkItems =
    allWorkItems.length > 0
      ? allWorkItems
      : Array.isArray(inquiry.siteReport?.workItems)
        ? inquiry.siteReport.workItems
        : [];
  if (!sourceWorkItems.length) {
    return res.status(400).json({
      message: "No work items on the site report to import. Add work items in Site Information first.",
    });
  }

  const existingPlain = (doc.items || []).map((i) => ({
    itemCode: i.itemCode,
    description: i.description,
    category: i.category,
    quantity: i.quantity,
    unit: i.unit,
    unitPrice: i.unitPrice,
  }));

  if (existingPlain.length > 0) {
    return res.status(400).json({
      message:
        "Lines were already loaded from the site report. Add prices manually, or clear all lines first to import again.",
      addedCount: 0,
    });
  }

  const incoming = itemsFromWorkItems(sourceWorkItems, 1);
  const { items: merged, addedCount } = mergeBoqItems(existingPlain, incoming, { replace: false });
  if (addedCount === 0) {
    return res.json({ quotation: doc, addedCount: 0 });
  }

  doc.items = normalizeItems(merged);

  const siteInformation = siteInformationFromInquiry(inquiry);
  if (siteInformation) {
    doc.siteInformation = siteInformation;
    doc.markModified("siteInformation");
  }

  recalculateTotals(doc);
  doc.activityTimeline.unshift(
    activity(
      "BOQ Preparation",
      `Loaded ${formatCount(addedCount, "line", "lines")} from site report (full site information synced)`,
      actorName(req),
    ),
  );
  await doc.save();
  return res.json({ quotation: doc, addedCount });
}

async function markQuotationDraft(req, res) {
  const doc = await BoqQuotation.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Quotation not found" });

  if (req.user.role === "sales" && String(doc.createdBy) !== String(req.user._id)) {
    return res.status(403).json({ message: "You can only edit your own quotations" });
  }

  if (!["BOQ In Progress", "Revision Requested"].includes(doc.status)) {
    return res.status(400).json({ message: "Only BOQ In Progress or Revision Requested can move to draft" });
  }

  if (!doc.items?.length) {
    return res.status(400).json({ message: "Add at least one BOQ item before creating a draft quotation" });
  }

  doc.status = "Quotation Draft";
  doc.activityTimeline.unshift(
    activity("Quotation Generation", "Quotation generated from BOQ", actorName(req)),
  );
  await doc.save();
  return res.json(doc);
}

async function submitForApproval(req, res) {
  const doc = await BoqQuotation.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Quotation not found" });

  if (req.user.role === "sales" && String(doc.createdBy) !== String(req.user._id)) {
    return res.status(403).json({ message: "You can only submit your own quotations" });
  }

  if (!SUBMIT_STATUSES.includes(doc.status)) {
    return res.status(400).json({ message: "Cannot submit while status is " + doc.status });
  }

  const validationError = validateBoqPayload(doc);
  if (validationError) return res.status(400).json({ message: validationError });

  recalculateTotals(doc);

  if (req.user.role === "admin") {
    const remarks = String(req.body?.remarks ?? "").trim();
    doc.status = "Approved";
    doc.approval = {
      reviewedBy: req.user._id,
      reviewedByName: actorName(req),
      remarks: remarks || "Approved by admin",
      reviewedAt: new Date(),
      action: "approved",
    };
    doc.activityTimeline.unshift(
      activity("Approved", remarks || "Quotation saved and approved by admin", actorName(req)),
    );
  } else {
    doc.status = "Pending Approval";
    doc.approval = { reviewedBy: null, reviewedByName: "", remarks: "", reviewedAt: null, action: null };
    doc.activityTimeline.unshift(
      activity("Manager Approval", "Submitted to manager for approval", actorName(req)),
    );
  }

  await doc.save();
  return res.json(doc);
}

async function approveQuotation(req, res) {
  const doc = await BoqQuotation.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Quotation not found" });

  if (doc.status !== "Pending Approval") {
    return res.status(400).json({ message: "Only pending quotations can be approved" });
  }

  const remarks = String(req.body?.remarks ?? "").trim();
  doc.status = "Approved";
  doc.approval = {
    reviewedBy: req.user._id,
    reviewedByName: actorName(req),
    remarks,
    reviewedAt: new Date(),
    action: "approved",
  };
  doc.activityTimeline.unshift(
    activity("Approved", remarks || "Quotation approved by manager", actorName(req)),
  );
  await doc.save();
  return res.json(doc);
}

async function rejectQuotation(req, res) {
  const doc = await BoqQuotation.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Quotation not found" });

  if (doc.status !== "Pending Approval") {
    return res.status(400).json({ message: "Only pending quotations can be rejected" });
  }

  const remarks = String(req.body?.remarks ?? "").trim();
  if (!remarks) return res.status(400).json({ message: "Remarks are required when rejecting" });

  doc.status = "Rejected";
  doc.approval = {
    reviewedBy: req.user._id,
    reviewedByName: actorName(req),
    remarks,
    reviewedAt: new Date(),
    action: "rejected",
  };
  doc.activityTimeline.unshift(activity("Rejected", remarks, actorName(req)));
  await doc.save();
  return res.json(doc);
}

async function requestRevision(req, res) {
  const doc = await BoqQuotation.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Quotation not found" });

  if (doc.status !== "Pending Approval") {
    return res.status(400).json({ message: "Only pending quotations can be sent back for revision" });
  }

  const remarks = String(req.body?.remarks ?? "").trim();
  if (!remarks) return res.status(400).json({ message: "Remarks are required for revision request" });

  doc.status = "Revision Requested";
  doc.approval = {
    reviewedBy: req.user._id,
    reviewedByName: actorName(req),
    remarks,
    reviewedAt: new Date(),
    action: "revision",
  };
  doc.activityTimeline.unshift(activity("Revision Requested", remarks, actorName(req)));
  await doc.save();
  return res.json(doc);
}

async function deleteQuotation(req, res) {
  const doc = await BoqQuotation.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Quotation not found" });

  if (req.user.role === "sales" && String(doc.createdBy) !== String(req.user._id)) {
    return res.status(403).json({ message: "You can only delete your own quotations" });
  }

  if (!QUOTATION_DELETABLE_STATUSES.includes(doc.status)) {
    if (doc.status === "Won") {
      return res.status(400).json({
        message: "Cannot delete a Won quotation. Delete the linked work order first, or contact admin.",
      });
    }
    return res.status(400).json({
      message: `Cannot delete quotation while status is "${doc.status}"`,
    });
  }

  const linkedWo = await WorkOrder.findOne({ quotationId: doc._id }).select("_id workOrderNumber").lean();
  if (linkedWo) {
    return res.status(400).json({
      message: `Cannot delete: work order ${linkedWo.workOrderNumber} exists. Delete the work order first.`,
    });
  }

  const inquiryId = doc.inquiryId;
  await BoqQuotation.findByIdAndDelete(doc._id);

  if (inquiryId) {
    const inquiry = await Inquiry.findById(inquiryId);
    if (inquiry && (inquiry.status === "Won" || inquiry.status === "Lost")) {
      inquiry.status = "Site Report Attached";
      inquiry.activityTimeline.unshift(
        activity("BOQ Removed", `Quotation ${doc.quotationNumber} deleted`, actorName(req)),
      );
      await inquiry.save();
    }
  }

  return res.status(204).send();
}

module.exports = {
  listQuotations,
  listPendingApprovals,
  getQuotation,
  getQuotationByInquiry,
  createQuotation,
  updateQuotation,
  markQuotationDraft,
  submitForApproval,
  approveQuotation,
  rejectQuotation,
  requestRevision,
  importSiteReportItems,
  deleteQuotation,
};
