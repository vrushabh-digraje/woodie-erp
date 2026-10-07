import { api } from "../../lib/apiClient";
import type { PaginatedResponse } from "../../lib/pagination";
import type {
  CreateInvoicePayload,
  FinanceStats,
  Invoice,
  InvoiceStatus,
  InvoiceType,
  WorkOrderInvoiceSummary,
} from "./invoiceTypes";

export async function getInvoices(
  status: InvoiceStatus | "All" = "All",
  workOrderId?: string,
  type?: InvoiceType | "All",
) {
  const response = await api.get<Invoice[]>("/invoices", {
    params: {
      status: status === "All" ? undefined : status,
      workOrderId,
      type: type && type !== "All" ? type : undefined,
    },
  });
  return response.data;
}

export async function getInvoicesPage(
  status: InvoiceStatus | "All" = "All",
  type?: InvoiceType | "All",
  search = "",
  page = 1,
  pageSize = 20,
) {
  const response = await api.get<PaginatedResponse<Invoice>>("/invoices", {
    params: {
      status: status === "All" ? undefined : status,
      type: type && type !== "All" ? type : undefined,
      q: search || undefined,
      page,
      pageSize,
    },
  });
  return response.data;
}

export async function getInvoiceById(id: string) {
  const response = await api.get<Invoice>(`/invoices/${id}`);
  return response.data;
}

export async function downloadInvoicePdf(id: string) {
  const response = await api.get<Blob>(`/invoices/${id}/pdf`, { responseType: "blob" });
  return response.data;
}

export async function getFinanceStats() {
  const response = await api.get<FinanceStats>("/invoices/stats");
  return response.data;
}

export async function getWorkOrderInvoiceSummary(workOrderId: string) {
  const response = await api.get<WorkOrderInvoiceSummary>(`/invoices/work-order/${workOrderId}/summary`);
  return response.data;
}

export async function createInvoice(payload: CreateInvoicePayload) {
  const response = await api.post<Invoice>("/invoices", payload);
  return response.data;
}

export async function sendInvoice(id: string) {
  const response = await api.patch<Invoice>(`/invoices/${id}/send`);
  return response.data;
}

export async function recordInvoiceFollowUp(id: string, note?: string) {
  const response = await api.patch<Invoice>(`/invoices/${id}/follow-up`, { note: note || undefined });
  return response.data;
}

export async function recordInvoicePayment(
  id: string,
  amount: number,
  method: string,
  receiptFile: File,
) {
  const form = new FormData();
  form.append("amount", String(amount));
  form.append("method", method);
  form.append("receiptFile", receiptFile);
  const response = await api.post<Invoice>(`/invoices/${id}/payments`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function escalateInvoice(id: string) {
  const response = await api.patch<Invoice>(`/invoices/${id}/escalate`);
  return response.data;
}

export async function resolveEscalation(id: string, action: "Resume" | "Write Off", note: string) {
  const response = await api.patch<Invoice>(`/invoices/${id}/resolve`, { action, note });
  return response.data;
}
