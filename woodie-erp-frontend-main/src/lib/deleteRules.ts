import { canManageBoq, canManageWorkOrders, type UserRole } from "../config/rbac";
import type { QuotationStatus } from "../features/boq/boqTypes";
import type { WorkOrder } from "../features/workorders/workOrderTypes";

/** Statuses safe to remove when no work order is linked (server enforces WO check). */
export const QUOTATION_DELETABLE_STATUSES: QuotationStatus[] = [
  "BOQ In Progress",
  "Quotation Draft",
  "Pending Approval",
  "Rejected",
  "Revision Requested",
  "Lost",
];

export function canDeleteQuotation(
  status: QuotationStatus,
  role: UserRole,
  options?: { isOwner?: boolean },
): boolean {
  if (!canManageBoq(role)) return false;
  if (role === "sales" && options?.isOwner === false) return false;
  return QUOTATION_DELETABLE_STATUSES.includes(status);
}

export function quotationDeleteBlockedReason(status: QuotationStatus): string | null {
  if (QUOTATION_DELETABLE_STATUSES.includes(status)) return null;
  if (status === "Won") return "Won quotations cannot be deleted. Remove the work order first if needed.";
  if (["Approved", "Quotation Sent", "Negotiation"].includes(status)) {
    return "Client-stage quotations cannot be deleted. Mark as Lost or contact admin.";
  }
  return `Cannot delete while status is "${status}".`;
}

export function canDeleteWorkOrder(order: WorkOrder, role: UserRole): boolean {
  if (!canManageWorkOrders(role)) return false;
  if (["In Progress", "Snagging", "Completed", "Handed Over"].includes(order.status)) {
    return false;
  }
  const hasActivity =
    order.progressLogs.length > 0 ||
    order.sitePhotos.length > 0 ||
    order.snags.length > 0 ||
    Boolean(order.executionStartedAt);
  if (hasActivity) return false;
  return order.status === "Scheduled" || order.status === "On Hold" || order.status === "Cancelled";
}

export function workOrderDeleteBlockedReason(order: WorkOrder): string | null {
  if (canDeleteWorkOrder(order, "admin")) return null;
  if (["In Progress", "Snagging", "Completed", "Handed Over"].includes(order.status)) {
    return `Cannot delete a work order that is "${order.status}".`;
  }
  if (order.progressLogs.length > 0 || order.sitePhotos.length > 0 || order.snags.length > 0) {
    return "Cannot delete: site team has already submitted logs, photos, or snags.";
  }
  if (order.executionStartedAt) {
    return "Cannot delete: execution has already started.";
  }
  return "This work order cannot be deleted.";
}
