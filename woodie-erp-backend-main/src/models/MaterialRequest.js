const mongoose = require("mongoose");

const MATERIAL_REQUEST_STATUSES = [
  "Pending",
  "Approved",
  "Issued",
  "Procurement Needed",
  "Rejected",
];

const materialRequestItemSchema = new mongoose.Schema(
  {
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: "Material", required: true },
    materialName: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    requestedQty: { type: Number, required: true, min: 0.001 },
    availableQty: { type: Number, required: true, min: 0 },
    issuedQty: { type: Number, default: 0, min: 0 },
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

const materialRequestSchema = new mongoose.Schema(
  {
    requestNumber: { type: String, required: true, unique: true, trim: true },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder", required: true },
    workOrderNumber: { type: String, required: true, trim: true },
    projectName: { type: String, required: true, trim: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember", required: true },
    requestedByName: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: MATERIAL_REQUEST_STATUSES,
      default: "Pending",
    },
    items: { type: [materialRequestItemSchema], default: [] },
    notes: { type: String, trim: true, default: "" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember" },
    approvedByName: { type: String, trim: true, default: "" },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true, default: "" },
    activityTimeline: { type: [activityEntrySchema], default: [] },
  },
  { timestamps: true },
);

const MaterialRequest = mongoose.model("MaterialRequest", materialRequestSchema);

module.exports = { MaterialRequest, MATERIAL_REQUEST_STATUSES };
