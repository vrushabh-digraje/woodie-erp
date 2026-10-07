const { isFieldRole } = require("../config/rbac");

const OFFICE_ROLES = ["admin", "manager", "sales", "procurement"];

function isOfficeRole(role) {
  return OFFICE_ROLES.includes(role);
}

function isAssignedToWorkOrder(doc, userId) {
  return doc.assignedTeam?.some((m) => String(m.memberId) === String(userId));
}

function assertWorkOrderReadAccess(doc, user) {
  if (!doc) return "Work order not found";
  if (isOfficeRole(user.role)) return null;
  if (isFieldRole(user.role) && isAssignedToWorkOrder(doc, user._id)) return null;
  if (isFieldRole(user.role)) {
    return "You are not assigned to this work order";
  }
  return "You do not have permission for this work order";
}

function assertWorkOrderManageAccess(user) {
  if (user.role === "admin" || user.role === "manager" || user.role === "procurement") return null;
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
  isAssignedToWorkOrder,
  assertWorkOrderReadAccess,
  assertWorkOrderManageAccess,
  assertWorkOrderFieldWriteAccess,
  openSnagCount,
};
