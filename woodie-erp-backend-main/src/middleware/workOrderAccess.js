const { isFieldRole, isMasterAdmin, isManager } = require("../config/rbac");

const OFFICE_ROLES = ["master_admin", "admin", "manager", "operation_manager", "sales", "procurement"];

function isOfficeRole(role) {
  return OFFICE_ROLES.includes(role);
}

function matchesWorkOrderCompany(doc, user) {
  if (!doc || !user) return false;
  if (isMasterAdmin(user.role)) return true;
  const userCo = (user.companyId || "woodie-1").toLowerCase();
  const docCo = (doc.companyId || "woodie-1").toLowerCase();
  return userCo === docCo;
}

function isAssignedToWorkOrder(doc, userId) {
  return doc.assignedTeam?.some((m) => String(m.memberId) === String(userId));
}

function assertWorkOrderReadAccess(doc, user) {
  if (!doc) return "Work order not found";
  if (!matchesWorkOrderCompany(doc, user)) {
    return "You do not have access to work orders from another company";
  }
  if (isOfficeRole(user.role)) return null;
  if (isFieldRole(user.role) && isAssignedToWorkOrder(doc, user._id)) return null;
  if (isFieldRole(user.role)) {
    return "You are not assigned to this work order";
  }
  return "You do not have permission for this work order";
}

function assertWorkOrderManageAccess(user) {
  if (isMasterAdmin(user.role) || user.role === "admin" || isManager(user.role) || user.role === "procurement") {
    return null;
  }
  return "Only admin, manager, or procurement can perform this action";
}

function assertWorkOrderFieldWriteAccess(doc, user) {
  const readErr = assertWorkOrderReadAccess(doc, user);
  if (readErr) return readErr;
  if (isOfficeRole(user.role)) return null;
  if (isFieldRole(user.role) && isAssignedToWorkOrder(doc, user._id)) return null;
  return "You do not have permission to update this work order";
}

function openSnagCount(doc) {
  return (doc.snags || []).filter((s) => s.status === "open").length;
}

module.exports = {
  OFFICE_ROLES,
  isOfficeRole,
  matchesWorkOrderCompany,
  isAssignedToWorkOrder,
  assertWorkOrderReadAccess,
  assertWorkOrderManageAccess,
  assertWorkOrderFieldWriteAccess,
  openSnagCount,
};
