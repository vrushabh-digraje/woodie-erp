import { api } from "../../lib/apiClient";
import type { PaginatedResponse } from "../../lib/pagination";
import type {
  CreateMaterialPayload,
  CreateMaterialRequestPayload,
  Material,
  MaterialRequest,
  MaterialRequestStatus,
  StockAdjustPayload,
  UpdateMaterialPayload,
} from "./materialTypes";

export async function getMaterials(search = "", activeOnly = false) {
  const response = await api.get<Material[]>("/materials", {
    params: { q: search, activeOnly: activeOnly ? "true" : undefined },
  });
  return response.data;
}

export async function getMaterialById(id: string) {
  const response = await api.get<Material>(`/materials/${id}`);
  return response.data;
}

export async function createMaterial(payload: CreateMaterialPayload) {
  const response = await api.post<Material>("/materials", payload);
  return response.data;
}

export async function updateMaterial(id: string, payload: UpdateMaterialPayload) {
  const response = await api.patch<Material>(`/materials/${id}`, payload);
  return response.data;
}

export async function adjustMaterialStock(id: string, payload: StockAdjustPayload) {
  const response = await api.patch<Material>(`/materials/${id}/stock`, payload);
  return response.data;
}

export async function getMaterialRequests(
  workOrderId?: string,
  status: MaterialRequestStatus | "All" = "All",
) {
  const response = await api.get<MaterialRequest[]>("/material-requests", {
    params: { workOrderId, status: status === "All" ? undefined : status },
  });
  return response.data;
}

export async function getMaterialRequestsPage(
  workOrderId?: string,
  status: MaterialRequestStatus | "All" = "All",
  search = "",
  page = 1,
  pageSize = 20,
) {
  const response = await api.get<PaginatedResponse<MaterialRequest>>("/material-requests", {
    params: {
      workOrderId,
      status: status === "All" ? undefined : status,
      q: search || undefined,
      page,
      pageSize,
    },
  });
  return response.data;
}

export async function getMaterialRequestById(id: string) {
  const response = await api.get<MaterialRequest>(`/material-requests/${id}`);
  return response.data;
}

export async function createMaterialRequest(payload: CreateMaterialRequestPayload) {
  const response = await api.post<MaterialRequest>("/material-requests", payload);
  return response.data;
}

export async function updateMaterialRequestStatus(
  id: string,
  status: "Approved" | "Rejected" | "Issued",
  rejectionReason?: string,
) {
  const response = await api.patch<MaterialRequest>(`/material-requests/${id}/status`, {
    status,
    rejectionReason,
  });
  return response.data;
}

/** After procurement / GRN — re-check stock and issue to work order. */
export async function issueMaterialRequestToWorkOrder(id: string) {
  return updateMaterialRequestStatus(id, "Issued");
}
