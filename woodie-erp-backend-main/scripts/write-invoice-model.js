const fs = require("fs");
const path = require("path");

const content = `const mongoose = require("mongoose");

const INVOICE_TYPES = ["Advance", "Progress", "Final"];
const INVOICE_STATUSES = [
  "Draft",
  "Awaiting Payment",
  "Partially Paid",
  "Paid",
  "Escalated",
  "Cancelled",
];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Cheque", "Online"];

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    receiptUrl: { type: String, required: true, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember" },
    recordedByName: { type: String, trim: true, default: "" },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const activityEntrySchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    note: { type: String, trim: true, default: "" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember" },
    byName: { type: String, trim: true, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: true },
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder", required: true },
    workOrderNumber: { type: String, required: true, trim: true },
    projectName: { type: String, trim: true, default: "" },
    clientName: { type: String, required: true, trim: true },
    clientPhone: { type: String, trim: true, default: "" },
    clientEmail: { type: String, trim: true, default: "" },
    type: { type: String, enum: INVOICE_TYPES, required: true },
    status: { type: String, enum: INVOICE_STATUSES, default: "Draft" },
    amount: { type: Number, required: true, min: 0.01 },
    taxPercent: { type: Number, default: 5, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    outstandingBalance: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    followUpCount: { type: Number, default: 0, min: 0, max: 3 },
    escalatedAt: { type: Date, default: null },
    payments: { type: [paymentSchema], default: [] },
    activityTimeline: { type: [activityEntrySchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember" },
    createdByName: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

invoiceSchema.index({ workOrderId: 1, type: 1 });

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = { Invoice, INVOICE_TYPES, INVOICE_STATUSES, PAYMENT_METHODS };
`;

fs.writeFileSync(path.join(__dirname, "../src/models/Invoice.js"), content, "utf8");
console.log("Invoice.js written");
