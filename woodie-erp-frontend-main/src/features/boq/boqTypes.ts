export type BoqCategory = "Material" | "Labor" | "Equipment" | "Service";

export type QuotationStatus =
  | "BOQ In Progress"
  | "Quotation Draft"
  | "Pending Approval"
  | "Approved"
  | "Rejected"
  | "Revision Requested"
  | "Quotation Sent"
  | "Negotiation"
  | "Won"
  | "Lost";

export type CostingScopeItem = {
  id: string;
  name: string;
  specs: string;
  unit: string;
  quantity: number;
  unitCost: number;
  marginPercent: number;
};

export type CostingMaterialItem = {
  id: string;
  name: string;
  specs: string;
  unit: string;
  quantity: number;
  unitCost: number;
  marginPercent: number;
};

export type CostingLaborItem = {
  id: string;
  role: string;
  days: number;
  hours: number;
  ratePerHour: number;
  personCount: number;
  marginPercent: number;
};

export type CostingSheetData = {
  clientName?: string;
  inspectedBy?: string;
  ssrNumber?: string;
  scopeItems: CostingScopeItem[];
  materialItems: CostingMaterialItem[];
  laborItems: CostingLaborItem[];
  customQuoteAmount?: number | null;
  customUnitRate?: number | null;
  notes?: string;
  lastUpdated?: string;
};

export type BoqItem = {
  _id?: string;
  itemCode: string;
  description: string;
  category: BoqCategory;
  quantity: number;
  unit: string;
  unitPrice: number;
  costingSheet?: CostingSheetData | null;
};

export type QuotationActivity = {
  action: string;
  note: string;
  createdBy: string;
  createdAt: string;
};

export type SiteInformationAttachment = {
  url: string;
  filename: string;
  uploadedAt?: string;
};

export type SiteInformationWorkItem = {
  workType: string;
  description: string;
  quantity: number | null;
  unit: string;
  finishMaterial: string;
  notes: string;
};

export type SiteInformationMeasurement = {
  areaRoom: string;
  measurementItem: string;
  value: number | null;
  unit: string;
  label?: string;
};

export type SiteInformationMaterialFinish = {
  category: string;
  specification: string;
  notes: string;
};

export type QuotationSiteBlock = {
  title?: string;
  workItems?: SiteInformationWorkItem[];
  measurements?: SiteInformationMeasurement[];
  materialFinishDetails?: SiteInformationMaterialFinish[];
  siteCondition?: {
    existingCondition?: string;
    demolitionRequired?: string;
    accessLimitations?: string;
    ceilingWallFloorCondition?: string;
  };
  riskAssessment?: {
    electricalRisk?: string;
    heightWork?: string;
    waterLeakage?: string;
    restrictedAccess?: string;
    otherRisks?: string;
  };
  siteVisitNotes?: {
    clientRequirements?: string;
    installationDetails?: string;
    materialSuggestions?: string;
    recommendedSolution?: string;
    executionComplexity?: string;
    specialInstructions?: string;
  };
  photos?: SiteInformationAttachment[];
  videos?: SiteInformationAttachment[];
  referenceImages?: SiteInformationAttachment[];
};

/** Structured site visit snapshot — multi-block + shared summary once. */
export type QuotationSiteInformation = {
  blocks?: QuotationSiteBlock[];
  /** Shared once (not per block) */
  siteCondition?: QuotationSiteBlock["siteCondition"];
  riskAssessment?: QuotationSiteBlock["riskAssessment"];
  siteVisitNotes?: QuotationSiteBlock["siteVisitNotes"];
  photos?: SiteInformationAttachment[];
  videos?: SiteInformationAttachment[];
  referenceImages?: SiteInformationAttachment[];
  /** @deprecated legacy flat snapshot */
  location?: string;
  scopeOfWork?: string;
  workItems?: SiteInformationWorkItem[];
  measurements?: SiteInformationMeasurement[];
  materialFinishDetails?: SiteInformationMaterialFinish[];
  reportSubmittedAt?: string | null;
  updatedAt?: string | null;
};

export type BoqQuotation = {
  _id: string;
  quotationNumber: string;
  projectName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  inquiryId?: string | null;
  status: QuotationStatus;
  items: BoqItem[];
  taxPercent: number;
  discountPercent: number;
  paymentTerms: string;
  notes: string;
  siteInformation?: QuotationSiteInformation | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  createdBy?: string;
  createdByName: string;
  approval?: {
    reviewedByName?: string;
    remarks?: string;
    reviewedAt?: string;
    action?: string | null;
  };
  lossReason?: string;
  clientFeedback?: string;
  sentAt?: string | null;
  wonAt?: string | null;
  lostAt?: string | null;
  activityTimeline: QuotationActivity[];
  createdAt: string;
  updatedAt: string;
};

export type CreateQuotationPayload = {
  projectName?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  inquiryId?: string | null;
  items?: BoqItem[];
  taxPercent?: number;
  discountPercent?: number;
  paymentTerms?: string;
  notes?: string;
};

export type UpdateQuotationPayload = CreateQuotationPayload;
