const mongoose = require("mongoose");

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
