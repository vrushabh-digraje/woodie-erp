const { WorkOrder } = require("../models/WorkOrder");
const { BoqQuotation } = require("../models/BoqQuotation");
const { Inquiry } = require("../models/Inquiry");

function activity(action, note, createdBy = "System") {
  return { action, note, createdBy };
}

async function generateWorkOrderNumber() {
  const rows = await WorkOrder.find({ workOrderNumber: /^WO-\d+$/ }).select("workOrderNumber").lean();
  let maxSeq = 0;
  for (const row of rows) {
    const match = /^WO-(\d+)$/.exec(String(row.workOrderNumber ?? ""));
    if (match) maxSeq = Math.max(maxSeq, Number(match[1]));
  }
  return `WO-${String(maxSeq + 1).padStart(4, "0")}`;
}

function parseOptionalDate(value) {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/**
 * Create a work order from a Won quotation. Returns existing doc if already created.
 */
async function createWorkOrderFromQuotation(quotationId, options = {}) {
  const boq = await BoqQuotation.findById(quotationId);
  if (!boq) {
    const error = new Error("Quotation not found");
    error.statusCode = 404;
    throw error;
  }
  if (boq.status !== "Won") {
    const error = new Error("Work order can only be created from a Won quotation");
    error.statusCode = 400;
    throw error;
  }

  const existing = await WorkOrder.findOne({ quotationId: boq._id });
  if (existing) return { doc: existing, created: false };

  if (!boq.inquiryId) {
    const error = new Error("Quotation is not linked to an inquiry");
    error.statusCode = 400;
    throw error;
  }

  const inquiry = await Inquiry.findById(boq.inquiryId);
  if (!inquiry) {
    const error = new Error("Linked inquiry not found");
    error.statusCode = 404;
    throw error;
  }

  const actor = options.createdByName || "System";
  const workOrderNumber = await generateWorkOrderNumber();
  const autoNote = options.autoCreated ? " (auto)" : "";

  // Store EXCLUDING VAT so Advance/Progress remaining math matches invoice.amount
  const subtotal = Number(boq.subtotal) || 0;
  const discountAmount = Number(boq.discountAmount) || 0;
  const taxAmount = Number(boq.taxAmount) || 0;
  const grand = Number(boq.grandTotal) || 0;
  let approvedExTax = subtotal > 0 ? Math.max(0, subtotal - discountAmount) : 0;
  if (!approvedExTax && grand > 0) {
    approvedExTax = taxAmount > 0 ? Math.max(0, grand - taxAmount) : grand;
  }

  const doc = await WorkOrder.create({
    workOrderNumber,
    inquiryId: boq.inquiryId,
    quotationId: boq._id,
    projectName: boq.projectName || inquiry.scopeOfWork || "Project",
    clientName: boq.clientName || inquiry.clientName,
    clientPhone: boq.clientPhone || inquiry.phone || "",
    clientEmail: boq.clientEmail || "",
    siteAddress: inquiry.fullAddress || "",
    scopeOfWork: inquiry.scopeOfWork || "",
    approvedAmount: Math.round(approvedExTax * 100) / 100,
    scheduledStart: parseOptionalDate(options.scheduledStart),
    targetCompletion: parseOptionalDate(options.targetCompletion),
    notes: String(options.notes ?? "").trim(),
    assignedTeam: [],
    createdBy: options.createdBy || null,
    createdByName: actor,
    activityTimeline: [
      activity(
        "Work Order Created",
        `Created from quotation ${boq.quotationNumber}${autoNote}`,
        actor,
      ),
    ],
  });

  return { doc, created: true };
}

module.exports = {
  createWorkOrderFromQuotation,
  generateWorkOrderNumber,
  parseOptionalDate,
  activity,
};
