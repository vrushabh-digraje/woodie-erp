import { api } from "../../../lib/apiClient";
import type { PaginatedResponse } from "../../../lib/pagination";
import type {
  CreateInquiryPayload,
  Inquiry,
  MaterialFinishRow,
  RiskAssessment,
  SiteCondition,
  SiteSurveyMeasurement,
  SiteVisitNotesBlock,
  SiteWorkItem,
  VisitApprovalPayload,
} from "./inquiryTypes";

export type SiteReportUpdatePayload = {
  observations?: string;
  /** Blocks carry only work/measurement/material data; condition, risk and notes are shared at root. */
  scopes: Array<{
    title?: string;
    workItems: SiteWorkItem[];
    measurements: SiteSurveyMeasurement[];
    materialFinishDetails: MaterialFinishRow[];
  }>;
  workItems?: SiteWorkItem[];
  measurements?: SiteSurveyMeasurement[];
  materialFinishDetails?: MaterialFinishRow[];
  siteCondition?: SiteCondition;
  riskAssessment?: RiskAssessment;
  siteVisitNotes?: SiteVisitNotesBlock;
};

function toFormData(payload: CreateInquiryPayload): FormData {
  const fd = new FormData();
  fd.append("clientName", payload.clientName);
  if (payload.contactPersonName !== undefined) {
    fd.append("contactPersonName", payload.contactPersonName);
  }
  fd.append("phone", payload.phone);
  fd.append("category", payload.category);
  fd.append("scopeOfWork", payload.scopeOfWork);
  fd.append("siteDetails", payload.siteDetails ?? "");
  fd.append("fullAddress", payload.fullAddress);
  if (payload.googleMapsUrl !== undefined) {
    fd.append("googleMapsUrl", payload.googleMapsUrl);
  }
  fd.append("scheduleVisitDate", payload.scheduleVisitDate);
  fd.append("scheduleVisitTime", payload.scheduleVisitTime);
  fd.append("assignedPersonId", payload.assignedPersonId);
  fd.append("notes", payload.notes ?? "");
  for (const file of payload.attachmentFiles ?? []) {
    fd.append("attachments", file);
  }
  return fd;
}

export async function getInquiries(search = "", status = "All"): Promise<Inquiry[]> {
  const response = await api.get<Inquiry[]>("/inquiries", { params: { q: search, status } });
  return response.data;
}

export async function getInquiriesPage(
  search = "",
  status = "All",
  page = 1,
  pageSize = 20,
): Promise<PaginatedResponse<Inquiry>> {
  const response = await api.get<PaginatedResponse<Inquiry>>("/inquiries", {
    params: { q: search, status, page, pageSize },
  });
  return response.data;
}

export async function getInquiryById(id: string): Promise<Inquiry> {
  const response = await api.get<Inquiry>(`/inquiries/${id}`);
  return response.data;
}

export async function createInquiry(payload: CreateInquiryPayload): Promise<Inquiry> {
  const response = await api.post<Inquiry>("/inquiries", toFormData(payload), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function updateInquiry(id: string, payload: CreateInquiryPayload): Promise<Inquiry> {
  const response = await api.patch<Inquiry>(`/inquiries/${id}`, toFormData(payload), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function deleteInquiry(id: string): Promise<void> {
  await api.delete(`/inquiries/${id}`);
}

export async function decideVisitApproval(id: string, payload: VisitApprovalPayload): Promise<Inquiry> {
  const response = await api.patch<Inquiry>(`/inquiries/${id}/visit-approval`, payload);
  return response.data;
}

export async function uploadSiteReportMedia(
  id: string,
  files: { photos?: File[]; videos?: File[]; references?: File[] },
  scopeIndex = 0,
): Promise<Inquiry> {
  const formData = new FormData();
  formData.append("scopeIndex", String(scopeIndex));
  for (const file of files.photos ?? []) formData.append("photos", file);
  for (const file of files.videos ?? []) formData.append("videos", file);
  for (const file of files.references ?? []) formData.append("references", file);
  const response = await api.post<Inquiry>(`/inquiries/${id}/site-report/media`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function updateSiteReport(id: string, payload: SiteReportUpdatePayload): Promise<Inquiry> {
  const response = await api.patch<Inquiry>(`/inquiries/${id}/site-report`, payload);
  return response.data;
}

export async function submitSiteReport(id: string): Promise<Inquiry> {
  const response = await api.post<Inquiry>(`/inquiries/${id}/site-report/submit`);
  return response.data;
}
