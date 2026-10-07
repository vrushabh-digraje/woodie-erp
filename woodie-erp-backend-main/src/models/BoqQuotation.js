const mongoose = require("mongoose");

const QUOTATION_STATUSES = [
  "BOQ In Progress",
  "Quotation Draft",
  "Pending Approval",
  "Approved",
  "Rejected",
  "Revision Requested",
  "Quotation Sent",
  "Negotiation",
  "Won",
  "Lost",
];

const BOQ_CATEGORIES = ["Material", "Labor", "Equipment", "Service"];

const boqItemSchema = new mongoose.Schema(
  {
    itemCode: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, required: true },
    category: { type: String, enum: BOQ_CATEGORIES, default: "Material" },
    quantity: { type: Number, min: 0, default: 1 },
    unit: { type: String, trim: true, default: "unit" },
    unitPrice: { type: Number, min: 0, default: 0 },
    costingSheet: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: true },
);

const siteAttachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    filename: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const siteWorkItemSchema = new mongoose.Schema(
  {
    workType: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    quantity: { type: Number, default: null },
    unit: { type: String, trim: true, default: "" },
    finishMaterial: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const siteMeasurementSchema = new mongoose.Schema(
  {
    areaRoom: { type: String, trim: true, default: "" },
    measurementItem: { type: String, trim: true, default: "" },
    value: { type: Number, default: null },
    unit: { type: String, trim: true, default: "" },
    label: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const siteMaterialFinishSchema = new mongoose.Schema(
  {
    category: { type: String, trim: true, default: "" },
    specification: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const siteConditionSchema = new mongoose.Schema(
  {
    existingCondition: { type: String, trim: true, default: "" },
    demolitionRequired: { type: String, trim: true, default: "" },
    accessLimitations: { type: String, trim: true, default: "" },
    ceilingWallFloorCondition: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const siteRiskAssessmentSchema = new mongoose.Schema(
  {
    electricalRisk: { type: String, trim: true, default: "" },
    heightWork: { type: String, trim: true, default: "" },
    waterLeakage: { type: String, trim: true, default: "" },
    restrictedAccess: { type: String, trim: true, default: "" },
    otherRisks: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const siteVisitNotesSchema = new mongoose.Schema(
  {
    clientRequirements: { type: String, trim: true, default: "" },
    installationDetails: { type: String, trim: true, default: "" },
    materialSuggestions: { type: String, trim: true, default: "" },
    recommendedSolution: { type: String, trim: true, default: "" },
    executionComplexity: { type: String, trim: true, default: "" },
    specialInstructions: { type: String, trim: true, default: "" },
  },
  { _id: false },
);


const siteBlockSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    workItems: { type: [siteWorkItemSchema], default: [] },
    measurements: { type: [siteMeasurementSchema], default: [] },
    materialFinishDetails: { type: [siteMaterialFinishSchema], default: [] },
  },
  { _id: false },
);

const siteInformationSchema = new mongoose.Schema(
  {
    blocks: { type: [siteBlockSchema], default: [] },
    siteCondition: { type: siteConditionSchema, default: () => ({}) },
    riskAssessment: { type: siteRiskAssessmentSchema, default: () => ({}) },
    siteVisitNotes: { type: siteVisitNotesSchema, default: () => ({}) },
    photos: { type: [siteAttachmentSchema], default: [] },
    videos: { type: [siteAttachmentSchema], default: [] },
    referenceImages: { type: [siteAttachmentSchema], default: [] },
    reportSubmittedAt: { type: Date, default: null },
    updatedAt: { type: Date, default: null },
  },
  { _id: false },
);


const activitySchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    note: { type: String, trim: true, default: "" },
    createdBy: { type: String, trim: true, default: "System" },
  },
  { _id: false, timestamps: true },
);

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: { type: String, required: true, unique: true, trim: true },
    projectName: { type: String, trim: true, default: "" },
    clientName: { type: String, trim: true, default: "" },
    clientEmail: { type: String, trim: true, default: "" },
    clientPhone: { type: String, trim: true, default: "" },
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inquiry", default: null },
    status: { type: String, enum: QUOTATION_STATUSES, default: "BOQ In Progress" },
    items: { type: [boqItemSchema], default: [] },
    taxPercent: { type: Number, min: 0, max: 100, default: 8 },
    discountPercent: { type: Number, min: 0, max: 100, default: 0 },
    paymentTerms: { type: String, trim: true, default: "Net 30 days" },
    notes: { type: String, trim: true, default: "" },
    siteInformation: { type: siteInformationSchema, default: null },
    subtotal: { type: Number, min: 0, default: 0 },
    taxAmount: { type: Number, min: 0, default: 0 },
    discountAmount: { type: Number, min: 0, default: 0 },
    grandTotal: { type: Number, min: 0, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String, trim: true, default: "" },
    approval: {
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reviewedByName: { type: String, trim: true, default: "" },
      remarks: { type: String, trim: true, default: "" },
      reviewedAt: { type: Date },
      action: { type: String, enum: ["approved", "rejected", "revision", null], default: null },
    },
    lossReason: { type: String, trim: true, default: "" },
    clientFeedback: { type: String, trim: true, default: "" },
    sentAt: { type: Date, default: null },
    wonAt: { type: Date, default: null },
    lostAt: { type: Date, default: null },
    activityTimeline: { type: [activitySchema], default: [] },
  },
  { timestamps: true },
);

function recalculateTotals(doc) {
  const subtotal = (doc.items || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0,
  );
  const taxPercent = Number(doc.taxPercent || 0);
  const discountPercent = Number(doc.discountPercent || 0);
  doc.subtotal = subtotal;
  doc.taxAmount = (subtotal * taxPercent) / 100;
  doc.discountAmount = (subtotal * discountPercent) / 100;
  doc.grandTotal = subtotal + doc.taxAmount - doc.discountAmount;
}

quotationSchema.methods.recalculateTotals = function recalc() {
  recalculateTotals(this);
};

const BoqQuotation = mongoose.model("BoqQuotation", quotationSchema);

module.exports = {
  BoqQuotation,
  QUOTATION_STATUSES,
  BOQ_CATEGORIES,
  recalculateTotals,
};
