import {
  canCreateInquiry,
  canManageBoq,
  canApproveBoq,
  canViewWorkOrders,
  canManageWorkOrders,
  canManageMaterials,
  canViewMaterialInventory,
  canCreateMaterialRequest,
  canManageMaterialRequests,
  showMaterialsNav,
  canManageTeam,
  showMyVisitsNav,
  inquiryListPath,
  roleLabel,
  isFieldRole,
  isAdmin,
  isSales,
  isManager,
  isProcurement,
  isAccounts,
  FIELD_ROLES,
  ROLES,
  defaultHomePath,
  canAccessFinance,
  canManageFinanceEscalations,
} from "../../config/rbac";
import type { AuthUser } from "./authTypes";
import type { Inquiry } from "../inquiry/services/inquiryTypes";

export {
  canCreateInquiry,
  canManageBoq,
  canApproveBoq,
  canViewWorkOrders,
  canManageWorkOrders,
  canManageMaterials,
  canViewMaterialInventory,
  canCreateMaterialRequest,
  canManageMaterialRequests,
  showMaterialsNav,
  canManageTeam,
  showMyVisitsNav,
  inquiryListPath,
  roleLabel,
  isFieldRole,
  isAdmin,
  isSales,
  isManager,
  isProcurement,
  isAccounts,
  FIELD_ROLES,
  ROLES,
  defaultHomePath,
  canAccessFinance,
  canManageFinanceEscalations,
};

export function isAssignedToInquiry(inquiry: Inquiry, user: AuthUser | null): boolean {
  if (!user || !isFieldRole(user.role)) return false;
  return String(inquiry.assignedPersonId) === String(user.id);
}

export function canApproveVisit(inquiry: Inquiry, user: AuthUser | null): boolean {
  return isAssignedToInquiry(inquiry, user) && inquiry.status === "Visit Pending Approval";
}

export function canUploadSiteReport(inquiry: Inquiry, user: AuthUser | null): boolean {
  return isAssignedToInquiry(inquiry, user) && inquiry.status === "Visit Approved";
}

/** Assigned site person only: editable while Visit Approved, or after submit until BOQ is prepared. Admin/manager are view-only. */
export function canEditSiteSurvey(inquiry: Inquiry, user: AuthUser | null): boolean {
  if (!user) return false;
  if (!isAssignedToInquiry(inquiry, user)) return false;
  if (inquiry.status === "Visit Approved") return true;
  if (inquiry.status === "Site Report Attached" && !inquiry.boqPrepared) return true;
  return false;
}

/** Final submit — assigned field staff only, before status is Site Report Attached. */
export function canSubmitSiteSurvey(inquiry: Inquiry, user: AuthUser | null): boolean {
  return isAssignedToInquiry(inquiry, user) && inquiry.status === "Visit Approved";
}

export function canEditInquiry(role: AuthUser["role"]): boolean {
  return canCreateInquiry(role);
}

export function canDeleteInquiry(role: AuthUser["role"]): boolean {
  return isAdmin(role);
}

export function isAssignedToWorkOrder(
  order: { assignedTeam: { memberId: string }[] },
  user: AuthUser | null,
): boolean {
  if (!user) return false;
  return order.assignedTeam.some((m) => String(m.memberId) === String(user.id));
}

/** Assigned field staff only — Scheduled / In Progress jobs. */
export function canRequestMaterialsForWorkOrder(
  order: { status: string; assignedTeam: { memberId: string }[] },
  user: AuthUser | null,
): boolean {
  if (!user || !isFieldRole(user.role)) return false;
  const eligibleStatus = order.status === "Scheduled" || order.status === "In Progress";
  if (!eligibleStatus) return false;
  return isAssignedToWorkOrder(order, user);
}
