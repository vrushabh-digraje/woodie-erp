const mongoose = require("mongoose");

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
