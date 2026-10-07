import { api } from "../../lib/apiClient";
import type { PaginatedResponse } from "../../lib/pagination";
import type {
  CreateWorkOrderPayload,
  UpdateWorkOrderPayload,
  WorkOrder,
  WorkOrderStatus,
  WorkOrderUpdateResult,
} from "./workOrderTypes";

export async function getWorkOrders(
  search = "",
  status: WorkOrderStatus | "All" = "All",
  quotationId?: string,
) {
  const response = await api.get<WorkOrder[]>("/workorders", {
    params: { q: search, status, quotationId },
  });
  return response.data;
}

export async function getWorkOrdersPage(
  search = "",
  status: WorkOrderStatus | "All" = "All",
  page = 1,
  pageSize = 20,
  quotationId?: string,
) {
  const response = await api.get<PaginatedResponse<WorkOrder>>("/workorders", {
    params: { q: search, status, page, pageSize, quotationId },
  });
  return response.data;
}

export async function getWorkOrderById(id: string) {
  const response = await api.get<WorkOrder>(`/workorders/${id}`);
  return response.data;
}

export async function createWorkOrder(payload: CreateWorkOrderPayload) {
  const response = await api.post<WorkOrder>("/workorders", payload);
  return response.data;
}

export async function updateWorkOrder(id: string, payload: UpdateWorkOrderPayload) {
  const response = await api.patch<WorkOrderUpdateResult>(`/workorders/${id}`, payload);
  return response.data;
}

export async function updateWorkOrderStatus(id: string, status: WorkOrderStatus) {
  const response = await api.patch<WorkOrder>(`/workorders/${id}/status`, { status });
  return response.data;
}

export async function assignWorkOrderTeam(id: string, memberIds: string[]) {
  const response = await api.patch<WorkOrder>(`/workorders/${id}/team`, { memberIds });
  return response.data;
}

export async function startWorkOrderExecution(id: string) {
  const response = await api.post<WorkOrder>(`/workorders/${id}/start-execution`);
  return response.data;
}

export async function completeWorkOrder(id: string) {
  const response = await api.post<WorkOrder>(`/workorders/${id}/complete`);
  return response.data;
}

export async function handoverWorkOrder(id: string) {
  const response = await api.post<WorkOrder>(`/workorders/${id}/handover`);
  return response.data;
}

export async function addWorkOrderProgressLog(id: string, note: string, logDate?: string) {
  const response = await api.post<WorkOrder>(`/workorders/${id}/progress-logs`, { note, logDate });
  return response.data;
}

export async function uploadWorkOrderPhotos(id: string, files: File[], caption = "") {
  const form = new FormData();
  files.forEach((f) => form.append("photos", f));
  if (caption.trim()) form.append("caption", caption.trim());
  const response = await api.post<WorkOrder>(`/workorders/${id}/photos`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function addWorkOrderSnag(id: string, description: string) {
  const response = await api.post<WorkOrder>(`/workorders/${id}/snags`, { description });
  return response.data;
}

export async function resolveWorkOrderSnag(id: string, snagId: string, resolutionNote = "") {
  const response = await api.patch<WorkOrder>(`/workorders/${id}/snags/${snagId}/resolve`, {
    resolutionNote,
  });
  return response.data;
}

export async function deleteWorkOrder(id: string): Promise<void> {
  await api.delete(`/workorders/${id}`);
}
