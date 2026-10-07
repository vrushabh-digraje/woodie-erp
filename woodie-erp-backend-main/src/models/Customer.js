const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "", lowercase: true },
    notes: { type: String, trim: true, default: "" },
    inquiryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Inquiry" }],
    createdByName: { type: String, trim: true, default: "System" },
  },
  { timestamps: true },
);

customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });

const Customer = mongoose.model("Customer", customerSchema);

module.exports = { Customer };
