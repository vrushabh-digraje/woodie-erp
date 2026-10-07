const mongoose = require("mongoose");

const MATERIAL_UNITS = ["nos", "sqm", "rm", "kg", "ltr", "box"];

const stockTransactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["in", "out"], required: true },
    qty: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, default: "" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember" },
    byName: { type: String, trim: true, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: true },
);

const materialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    SKU: { type: String, required: true, unique: true, trim: true, uppercase: true },
    unit: { type: String, enum: MATERIAL_UNITS, required: true },
    currentStock: { type: Number, default: 0, min: 0 },
    minStockLevel: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    stockTransactions: { type: [stockTransactionSchema], default: [] },
  },
  { timestamps: true },
);

const Material = mongoose.model("Material", materialSchema);

module.exports = { Material, MATERIAL_UNITS };
