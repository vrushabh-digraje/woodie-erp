const mongoose = require("mongoose");

const WORK_ORDER_STATUSES = [
  "Scheduled",
  "In Progress",
  "On Hold",
  "Snagging",
  "Completed",
  "Handed Over",
  "Cancelled",
];

const WORK_ORDER_PAYMENT_STATUSES = ["Unpaid", "Partially Paid", "Paid"];

const assignedTeamMemberSchema = new mongoose.Schema(
  {
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember", required: true },
    name: { type: String, trim: true, required: true },
    role: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    dueDate: { type: Date, default: null },
    status: { type: String, enum: ["pending", "done"], default: "pending" },
    completedAt: { type: Date, default: null },
  },
  { _id: true },
);

const progressLogSchema = new mongoose.Schema(
  {
    logDate: { type: Date, default: Date.now },
    note: { type: String, trim: true, required: true },
    createdBy: { type: String, trim: true, default: "System" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const sitePhotoSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, required: true },
    caption: { type: String, trim: true, default: "" },
    uploadedBy: { type: String, trim: true, default: "" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const snagSchema = new mongoose.Schema(
  {
    description: { type: String, trim: true, required: true },
    status: { type: String, enum: ["open", "resolved"], default: "open" },
    reportedBy: { type: String, trim: true, default: "" },
    reportedAt: { type: Date, default: Date.now },
    resolvedBy: { type: String, trim: true, default: "" },
    resolvedAt: { type: Date, default: null },
    resolutionNote: { type: String, trim: true, default: "" },
  },
  { _id: true },
);

const activitySchema = new mongoose.Schema(
  {
    action: { type: String, trim: true, required: true },
    note: { type: String, trim: true, default: "" },
    createdBy: { type: String, trim: true, default: "System" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const workOrderSchema = new mongoose.Schema(
  {
    workOrderNumber: { type: String, required: true, unique: true, trim: true },
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inquiry", required: true },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "BoqQuotation", required: true, unique: true },
    projectName: { type: String, required: true, trim: true },
    clientName: { type: String, required: true, trim: true },
    clientPhone: { type: String, trim: true, default: "" },
    clientEmail: { type: String, trim: true, default: "" },
    siteAddress: { type: String, trim: true, default: "" },
    scopeOfWork: { type: String, trim: true, default: "" },
    approvedAmount: { type: Number, min: 0, default: 0 },
    paymentStatus: {
      type: String,
      enum: WORK_ORDER_PAYMENT_STATUSES,
      default: "Unpaid",
    },
    status: { type: String, enum: WORK_ORDER_STATUSES, default: "Scheduled" },
    scheduledStart: { type: Date, default: null },
    targetCompletion: { type: Date, default: null },
    executionStartedAt: { type: Date, default: null },
    handedOverAt: { type: Date, default: null },
    milestones: { type: [milestoneSchema], default: [] },
    progressLogs: { type: [progressLogSchema], default: [] },
    sitePhotos: { type: [sitePhotoSchema], default: [] },
    snags: { type: [snagSchema], default: [] },
    assignedTeam: { type: [assignedTeamMemberSchema], default: [] },
    notes: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember" },
    createdByName: { type: String, trim: true, default: "" },
    activityTimeline: { type: [activitySchema], default: [] },
  },
  { timestamps: true },
);

const WorkOrder = mongoose.model("WorkOrder", workOrderSchema);

module.exports = { WorkOrder, WORK_ORDER_STATUSES, WORK_ORDER_PAYMENT_STATUSES };

