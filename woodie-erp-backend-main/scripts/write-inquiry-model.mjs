import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, "..", "src", "models", "Inquiry.js");

const content = `const mongoose = require("mongoose");
const { INQUIRY_CATEGORIES } = require("../config/rbac");

const inquiryStatuses = [
  "Visit Pending Approval",
  "Visit Approved",
  "Visit Rejected",
  "Site Report Attached",
];

const activitySchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    note: { type: String, trim: true, default: "" },
    createdBy: { type: String, trim: true, default: "System" },
  },
  { _id: false, timestamps: true },
);

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    filename: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const workItemSchema = new mongoose.Schema(
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

const surveyMeasurementSchema = new mongoose.Schema(
  {
    areaRoom: { type: String, trim: true, default: "" },
    measurementItem: { type: String, trim: true, default: "" },
    value: { type: Number, default: null },
    unit: { type: String, trim: true, default: "" },
    label: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const materialFinishSchema = new mongoose.Schema(
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

const riskAssessmentSchema = new mongoose.Schema(
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

const inquirySchema = new mongoose.Schema(
  {
    inquiryNumber: { type: String, required: true, unique: true, trim: true },
    clientName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: INQUIRY_CATEGORIES },
    scopeOfWork: { type: String, required: true, trim: true },
    siteDetails: { type: String, trim: true, default: "" },
    fullAddress: { type: String, required: true, trim: true },
    scheduleVisitDate: { type: Date, required: true },
    scheduleVisitTime: { type: String, required: true, trim: true },
    assignedPersonId: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember", required: true },
    assignedPersonName: { type: String, required: true, trim: true },
    notes: { type: String, trim: true, default: "" },
    attachments: { type: [attachmentSchema], default: [] },
    status: { type: String, enum: inquiryStatuses, default: "Visit Pending Approval" },
    visitApproval: {
      decision: { type: String, enum: ["Approved", "Rejected", null], default: null },
      rejectionReason: { type: String, trim: true, default: "" },
      updatedAt: { type: Date },
    },
    siteReport: {
      observations: { type: String, trim: true, default: "" },
      workItems: { type: [workItemSchema], default: [] },
      measurements: { type: [surveyMeasurementSchema], default: [] },
      materialFinishDetails: { type: [materialFinishSchema], default: [] },
      siteCondition: { type: siteConditionSchema, default: () => ({}) },
      riskAssessment: { type: riskAssessmentSchema, default: () => ({}) },
      siteVisitNotes: { type: siteVisitNotesSchema, default: () => ({}) },
      photos: { type: [attachmentSchema], default: [] },
      videos: { type: [attachmentSchema], default: [] },
      referenceImages: { type: [attachmentSchema], default: [] },
      reportSubmittedAt: { type: Date, default: null },
      updatedAt: { type: Date },
    },
    activityTimeline: { type: [activitySchema], default: [] },
  },
  { timestamps: true },
);

module.exports = {
  Inquiry: mongoose.model("Inquiry", inquirySchema),
  inquiryStatuses,
  INQUIRY_CATEGORIES,
};
`;

fs.writeFileSync(target, content);
console.log("Wrote", target);
