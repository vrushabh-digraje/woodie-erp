import type { InquiryCategory } from "../../../config/rbac";

export type InquiryStatus =
  | "Visit Pending Approval"
  | "Visit Approved"
  | "Visit Rejected"
  | "Site Report Attached"
  | "Won"
  | "Lost";

export type VisitApprovalDecision = "Approved" | "Rejected";

export type InquiryAttachment = {
  url: string;
  filename: string;
  uploadedAt?: string;
};

export type ActivityItem = {
  action: string;
  note: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
};

export type VisitApproval = {
  decision: VisitApprovalDecision | null;
  rejectionReason: string;
  updatedAt?: string;
};

export type SiteReportAttachment = {
  url: string;
  filename: string;
  uploadedAt?: string;
};

export type SiteWorkItem = {
  workType: string;
  description: string;
  quantity: number | null;
  unit: string;
  finishMaterial: string;
  notes: string;
};

export type SiteSurveyMeasurement = {
  areaRoom: string;
  measurementItem: string;
  value: number | null;
  unit: string;
  /** Legacy API shape */
  label?: string;
};

export type MaterialFinishRow = {
  category: string;
  specification: string;
  notes: string;
};

export type SiteCondition = {
  existingCondition: string;
  demolitionRequired: string;
  accessLimitations: string;
  ceilingWallFloorCondition: string;
};

export type RiskAssessment = {
  electricalRisk: string;
  heightWork: string;
  waterLeakage: string;
  restrictedAccess: string;
  otherRisks: string;
};

export type SiteVisitNotesBlock = {
  clientRequirements: string;
  installationDetails: string;
  materialSuggestions: string;
  recommendedSolution: string;
  executionComplexity: string;
  specialInstructions: string;
};

/** One complete site-information block (all sections together). */
export type SiteReportScope = {
  title?: string;
  workItems?: SiteWorkItem[];
  measurements?: SiteSurveyMeasurement[];
  materialFinishDetails?: MaterialFinishRow[];
  siteCondition?: Partial<SiteCondition>;
  riskAssessment?: Partial<RiskAssessment>;
  siteVisitNotes?: Partial<SiteVisitNotesBlock>;
  photos?: SiteReportAttachment[];
  videos?: SiteReportAttachment[];
  referenceImages?: SiteReportAttachment[];
};

export type SiteReport = {
  observations?: string;
  /** Preferred multi-block shape */
  scopes?: SiteReportScope[];
  /** Alias used by some clients */
  blocks?: SiteReportScope[];
  /** Legacy flat fields (mirrored from scopes[0]) */
  workItems?: SiteWorkItem[];
  measurements?: SiteSurveyMeasurement[];
  materialFinishDetails?: MaterialFinishRow[];
  siteCondition?: Partial<SiteCondition>;
  riskAssessment?: Partial<RiskAssessment>;
  siteVisitNotes?: Partial<SiteVisitNotesBlock>;
  photos?: SiteReportAttachment[];
  videos?: SiteReportAttachment[];
  referenceImages?: SiteReportAttachment[];
  reportSubmittedAt?: string | null;
  updatedAt?: string;
};

export type Inquiry = {
  _id: string;
  inquiryNumber: string;
  clientName: string;
  contactPersonName?: string;
  phone: string;
  category: InquiryCategory;
  scopeOfWork: string;
  siteDetails: string;
  fullAddress: string;
  googleMapsUrl?: string;
  scheduleVisitDate: string;
  scheduleVisitTime: string;
  assignedPersonId: string;
  assignedPersonName: string;
  notes: string;
  attachments: InquiryAttachment[];
  status: InquiryStatus;
  /** True when a BOQ/quotation exists for this inquiry — locks site survey edits. */
  boqPrepared?: boolean;
  visitApproval: VisitApproval;
  siteReport?: SiteReport;
  activityTimeline: ActivityItem[];
  createdAt: string;
  updatedAt: string;
};

export type CreateInquiryPayload = {
  clientName: string;
  contactPersonName?: string;
  phone: string;
  category: InquiryCategory;
  scopeOfWork: string;
  siteDetails?: string;
  fullAddress: string;
  googleMapsUrl?: string;
  scheduleVisitDate: string;
  scheduleVisitTime: string;
  assignedPersonId: string;
  notes?: string;
  attachmentFiles?: File[];
};

export type VisitApprovalPayload = {
  decision: VisitApprovalDecision;
  rejectionReason?: string;
};
