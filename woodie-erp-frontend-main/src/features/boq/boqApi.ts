import { api } from "../../lib/apiClient";
import type { PaginatedResponse } from "../../lib/pagination";
import type { BoqQuotation, CreateQuotationPayload, QuotationStatus, UpdateQuotationPayload } from "./boqTypes";
import type { RamsPayload } from "./ramsPresets";

export async function getQuotations(search = "", status: QuotationStatus | "All" = "All") {
  const response = await api.get<BoqQuotation[]>("/boq/quotations", {
    params: { q: search, status },
  });
  return response.data;
}

export async function getQuotationsPage(
  search = "",
  status: QuotationStatus | "All" = "All",
  page = 1,
  pageSize = 20,
) {
  const response = await api.get<PaginatedResponse<BoqQuotation>>("/boq/quotations", {
    params: { q: search, status, page, pageSize },
  });
  return response.data;
}

export async function getPendingQuotations() {
  const response = await api.get<BoqQuotation[]>("/boq/quotations/pending");
  return response.data;
}

export async function getQuotationById(id: string) {
  const response = await api.get<BoqQuotation>(`/boq/quotations/${id}`);
  return response.data;
}

export async function getQuotationByInquiryId(inquiryId: string): Promise<BoqQuotation | null> {
  try {
    const response = await api.get<BoqQuotation>(`/boq/quotations/by-inquiry/${inquiryId}`);
    return response.data;
  } catch (error: unknown) {
    const status =
      error && typeof error === "object" && "response" in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;
    if (status === 404) return null;
    throw error;
  }
}

export async function createQuotation(payload: CreateQuotationPayload) {
  const response = await api.post<BoqQuotation>("/boq/quotations", payload);
  return response.data;
}

/** One BOQ per inquiry — returns existing BOQ if already created. */
export async function createQuotationForInquiry(inquiryId: string) {
  const response = await api.post<BoqQuotation>("/boq/quotations", { inquiryId });
  return response.data;
}

export async function updateQuotation(id: string, payload: UpdateQuotationPayload) {
  const response = await api.patch<BoqQuotation>(`/boq/quotations/${id}`, payload);
  return response.data;
}

/** Load site work items when BOQ has no lines yet (skipped if lines already exist). */
export async function importSiteReportToQuotation(id: string) {
  const response = await api.post<{ quotation: BoqQuotation; addedCount: number }>(
    `/boq/quotations/${id}/import-site-report`,
    {},
  );
  return response.data;
}

export async function saveQuotationDraft(id: string) {
  const response = await api.post<BoqQuotation>(`/boq/quotations/${id}/save-draft`);
  return response.data;
}

export async function submitQuotationForApproval(id: string) {
  const response = await api.post<BoqQuotation>(`/boq/quotations/${id}/submit`);
  return response.data;
}

export async function approveQuotation(id: string, remarks = "") {
  const response = await api.post<BoqQuotation>(`/boq/quotations/${id}/approve`, { remarks });
  return response.data;
}

export async function rejectQuotation(id: string, remarks: string) {
  const response = await api.post<BoqQuotation>(`/boq/quotations/${id}/reject`, { remarks });
  return response.data;
}

export async function requestQuotationRevision(id: string, remarks: string) {
  const response = await api.post<BoqQuotation>(`/boq/quotations/${id}/request-revision`, { remarks });
  return response.data;
}

export async function downloadQuotationPdf(id: string) {
  const response = await api.get<Blob>(`/boq/quotations/${id}/pdf`, { responseType: "blob" });
  return response.data;
}

export async function downloadRamsPdf(
  id: string,
  payload?: RamsPayload,
  docType: "risk_assessment" | "mos" | "combined" = "combined",
) {
  const fullPayload: RamsPayload = { ...(payload || {}), docType };
  const response = await api.post<Blob>(`/boq/quotations/${id}/rams-pdf`, fullPayload, {
    responseType: "blob",
  });
  return response.data;
}

type NegotiationResponse = { success: boolean; data: BoqQuotation; message: string };

export async function sendQuotationToClient(id: string) {
  const response = await api.patch<NegotiationResponse>(`/boq/quotations/${id}/send`);
  return response.data.data;
}

export async function markNegotiation(id: string, clientFeedback?: string) {
  const response = await api.patch<NegotiationResponse>(`/boq/quotations/${id}/negotiation`, {
    clientFeedback: clientFeedback?.trim() || undefined,
  });
  return response.data.data;
}

export async function markWon(id: string) {
  const response = await api.patch<NegotiationResponse>(`/boq/quotations/${id}/won`);
  return response.data.data;
}

export async function markLost(id: string, lossReason: string) {
  const response = await api.patch<NegotiationResponse>(`/boq/quotations/${id}/lost`, {
    lossReason: lossReason.trim(),
  });
  return response.data.data;
}

export async function deleteQuotation(id: string): Promise<void> {
  await api.delete(`/boq/quotations/${id}`);
}
