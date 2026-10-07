const fs = require("fs");
const path = require("path");

const modelsDir = path.join(__dirname, "../src/models");

const files = {
  "Invoice.js": `const mongoose = require("mongoose");

const INVOICE_TYPES = ["Advance", "Progress", "Final"];
const INVOICE_STATUSES = [
  "Draft",
  "Sent",
  "Awaiting Payment",
  "Partially Paid",
  "Paid",
  "Escalated",
  "Cancelled",
];

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    paidAt: { type: Date, default: Date.now },
    receiptUrl: { type: String, required: true, trim: true },
    receiptFilename: { type: String, trim: true, default: "" },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember" },
    recordedByName: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
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
    invoiceType: { type: String, enum: INVOICE_TYPES, required: true },
    status: { type: String, enum: INVOICE_STATUSES, default: "Draft" },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder", required: true },
    workOrderNumber: { type: String, required: true, trim: true },
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inquiry" },
    milestoneId: { type: mongoose.Schema.Types.ObjectId, default: null },
    milestoneTitle: { type: String, trim: true, default: "" },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    clientName: { type: String, required: true, trim: true },
    clientPhone: { type: String, trim: true, default: "" },
    clientEmail: { type: String, trim: true, default: "" },
    projectName: { type: String, trim: true, default: "" },
    amount: { type: Number, required: true, min: 0.01 },
    paidAmount: { type: Number, default: 0, min: 0 },
    outstandingBalance: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    sentVia: { type: String, enum: ["email", "whatsapp", "manual", ""], default: "" },
    followUpCount: { type: Number, default: 0, min: 0, max: 3 },
    lastFollowUpAt: { type: Date, default: null },
    escalatedAt: { type: Date, default: null },
    managerActionNote: { type: String, trim: true, default: "" },
    managerActionAt: { type: Date, default: null },
    managerActionByName: { type: String, trim: true, default: "" },
    payments: { type: [paymentSchema], default: [] },
    activityTimeline: { type: [activityEntrySchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember" },
    createdByName: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = { Invoice, INVOICE_TYPES, INVOICE_STATUSES };
`,
  "CommunicationLog.js": `const mongoose = require("mongoose");

const COMM_CHANNELS = ["whatsapp", "email", "manual"];
const COMM_DIRECTIONS = ["inbound", "outbound"];

const communicationLogSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: COMM_CHANNELS, required: true },
    direction: { type: String, enum: COMM_DIRECTIONS, default: "inbound" },
    subject: { type: String, trim: true, default: "" },
    body: { type: String, required: true, trim: true },
    fromPhone: { type: String, trim: true, default: "" },
    fromEmail: { type: String, trim: true, default: "", lowercase: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String, trim: true, default: "" },
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inquiry" },
    inquiryNumber: { type: String, trim: true, default: "" },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder" },
    workOrderNumber: { type: String, trim: true, default: "" },
    projectLink: {
      type: String,
      enum: ["existing", "new", "none"],
      default: "none",
    },
    externalMessageId: { type: String, trim: true, default: "" },
    loggedByName: { type: String, trim: true, default: "System" },
    salesTaskId: { type: mongoose.Schema.Types.ObjectId, ref: "SalesTask" },
  },
  { timestamps: true },
);

communicationLogSchema.index({ externalMessageId: 1 }, { sparse: true });
communicationLogSchema.index({ createdAt: -1 });

const CommunicationLog = mongoose.model("CommunicationLog", communicationLogSchema);

module.exports = { CommunicationLog, COMM_CHANNELS, COMM_DIRECTIONS };
`,
  "SalesTask.js": `const mongoose = require("mongoose");

const SALES_TASK_STATUSES = ["open", "done", "cancelled"];

const salesTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    status: { type: String, enum: SALES_TASK_STATUSES, default: "open" },
    dueAt: { type: Date, required: true },
    assignedRole: { type: String, default: "sales" },
    communicationLogId: { type: mongoose.Schema.Types.ObjectId, ref: "CommunicationLog" },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String, trim: true, default: "" },
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inquiry" },
    completedAt: { type: Date, default: null },
    completedByName: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

salesTaskSchema.index({ status: 1, dueAt: 1 });

const SalesTask = mongoose.model("SalesTask", salesTaskSchema);

module.exports = { SalesTask, SALES_TASK_STATUSES };
`,
};

for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(modelsDir, name), content, "utf8");
  console.log("wrote", name);
}
