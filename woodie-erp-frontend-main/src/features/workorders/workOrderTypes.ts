export type WorkOrderStatus =
  | "Scheduled"
  | "In Progress"
  | "On Hold"
  | "Snagging"
  | "Completed"
  | "Handed Over"
  | "Cancelled";

export type AssignedTeamMember = {
  memberId: string;
  name: string;
  role: string;
  phone: string;
};

export type WorkOrderUpdateResult = WorkOrder;

export type WorkOrderProgressLog = {
  _id?: string;
  logDate: string;
  note: string;
  createdBy: string;
  createdAt: string;
};

export type WorkOrderSitePhoto = {
  _id?: string;
  url: string;
  caption: string;
  uploadedBy: string;
  uploadedAt: string;
};

export type WorkOrderSnag = {
  _id: string;
  description: string;
  status: "open" | "resolved";
  reportedBy: string;
  reportedAt: string;
  resolvedBy?: string;
  resolvedAt?: string | null;
  resolutionNote?: string;
};

export type WorkOrderActivity = {
  action: string;
  note: string;
  createdBy: string;
  createdAt: string;
};

export type WorkOrder = {
  _id: string;
  workOrderNumber: string;
  inquiryId: string;
  quotationId: string;
  projectName: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  siteAddress: string;
  scopeOfWork: string;
  approvedAmount: number;
  paymentStatus?: "Unpaid" | "Partially Paid" | "Paid";
  status: WorkOrderStatus;
  scheduledStart?: string | null;
  targetCompletion?: string | null;
  executionStartedAt?: string | null;
  handedOverAt?: string | null;
  progressLogs: WorkOrderProgressLog[];
  sitePhotos: WorkOrderSitePhoto[];
  snags: WorkOrderSnag[];
  assignedTeam: AssignedTeamMember[];
  notes: string;
  createdByName: string;
  activityTimeline: WorkOrderActivity[];
  createdAt: string;
  updatedAt: string;
};

export type CreateWorkOrderPayload = {
  quotationId: string;
  scheduledStart?: string;
  targetCompletion?: string;
  notes?: string;
};

export type UpdateWorkOrderPayload = {
  scheduledStart?: string | null;
  targetCompletion?: string | null;
  notes?: string;
  projectName?: string;
};
