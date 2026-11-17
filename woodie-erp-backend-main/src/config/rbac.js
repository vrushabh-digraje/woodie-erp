/** Role slugs stored on TeamMember. Labels are for UI only. */
const ROLES = {
  MASTER_ADMIN: "master_admin",
  ADMIN: "admin",
  MANAGER: "manager",
  OPERATION_MANAGER: "operation_manager",
  ENGINEER: "engineer",
  SUPERVISOR: "supervisor",
  SITE_ENGINEER: "site_engineer",
  SALES: "sales",
  PROCUREMENT: "procurement",
  ACCOUNTS: "accounts",
  TECHNICIAN: "technician",
  ELECTRICIAN: "electrician",
  CARPENTER: "carpenter",
  AC_TECHNICIAN: "ac_technician",
  PLUMBER: "plumber",
};

const COMPANIES = [
  { id: "woodie-1", name: "Woodie 1", legalName: "Woodie Technical Services & Contracting LLC", domain: "woodie-1.ae" },
  { id: "woodie-2", name: "Woodie 2", legalName: "Woodie 2 Contracting LLC", domain: "woodie-2.com" },
  { id: "woodie-3", name: "Woodie 3", legalName: "Woodie 3 Contracting LLC", domain: "woodie-3.com" },
];

const ROLE_OPTIONS = [
  { value: ROLES.MASTER_ADMIN, label: "Master Super Admin" },
  { value: ROLES.ADMIN, label: "Admin" },
  { value: ROLES.MANAGER, label: "Manager" },
  { value: ROLES.OPERATION_MANAGER, label: "Operation Manager" },
  { value: ROLES.ENGINEER, label: "Engineer" },
  { value: ROLES.SUPERVISOR, label: "Site Supervisor" },
  { value: ROLES.SITE_ENGINEER, label: "Site Engineer" },
  { value: ROLES.SALES, label: "Sales" },
  { value: ROLES.PROCUREMENT, label: "Procurement" },
  { value: ROLES.ACCOUNTS, label: "Accounts" },
  { value: ROLES.TECHNICIAN, label: "Technician" },
  { value: ROLES.ELECTRICIAN, label: "Electrician" },
  { value: ROLES.CARPENTER, label: "Carpenter" },
  { value: ROLES.AC_TECHNICIAN, label: "AC Technician" },
  { value: ROLES.PLUMBER, label: "Plumber" },
];

const FIELD_ROLES = [
  ROLES.ENGINEER,
  ROLES.SUPERVISOR,
  ROLES.SITE_ENGINEER,
  ROLES.TECHNICIAN,
  ROLES.ELECTRICIAN,
  ROLES.CARPENTER,
  ROLES.AC_TECHNICIAN,
  ROLES.PLUMBER,
];

const INQUIRY_CATEGORIES = [
  "Furniture Wrap",
  "Showroom Wrap",
  "Bathroom Wrap",
  "Yacht Wrap",
  "Wall Panels",
  "Floor Wrap",
  "AC Services",
  "Plumbing",
  "Electric Work",
  "Carpentry",
  "Interior Fit-Out",
  "Maintenance",
  "Custom Work",
];

function isActiveMember(member) {
  return member && member.status === "Active";
}

function isMasterAdmin(role) {
  return role === ROLES.MASTER_ADMIN;
}

function isAdmin(role) {
  return role === ROLES.ADMIN || role === ROLES.MASTER_ADMIN;
}

function isSales(role) {
  return role === ROLES.SALES;
}

function isManager(role) {
  return role === ROLES.MANAGER || role === ROLES.OPERATION_MANAGER;
}

function isOperationManager(role) {
  return role === ROLES.OPERATION_MANAGER;
}

function isEngineer(role) {
  return role === ROLES.ENGINEER || role === ROLES.SITE_ENGINEER;
}

function isProcurement(role) {
  return role === ROLES.PROCUREMENT;
}

function isAccounts(role) {
  return role === ROLES.ACCOUNTS;
}

function isFieldRole(role) {
  return FIELD_ROLES.includes(role);
}

function canManageTeam(role) {
  return isMasterAdmin(role) || role === ROLES.ADMIN || role === ROLES.MANAGER;
}

function canCreateInquiry(role) {
  return (
    isMasterAdmin(role) ||
    role === ROLES.ADMIN ||
    role === ROLES.SALES ||
    role === ROLES.ENGINEER ||
    isManager(role)
  );
}

function canManageBoq(role) {
  return (
    isMasterAdmin(role) ||
    role === ROLES.ADMIN ||
    role === ROLES.SALES ||
    role === ROLES.ENGINEER ||
    isManager(role) ||
    isProcurement(role)
  );
}

/** Only Managers, Operation Managers, and Master Super Admin can approve BOQ / Quotations */
function canApproveBoq(role) {
  return isMasterAdmin(role) || isManager(role) || isProcurement(role);
}

/** Managers, Operation Managers, Admins, and Master Admin can approve Site Visits */
function canApproveVisit(role) {
  return isMasterAdmin(role) || isManager(role) || role === ROLES.ADMIN;
}

function dashboardTypeForRole(role) {
  if (isMasterAdmin(role)) return "master";
  if (role === ROLES.ADMIN) return "admin";
  if (isManager(role)) return "manager";
  if (isSales(role)) return "sales";
  if (isProcurement(role)) return "manager";
  if (isAccounts(role)) return "sales";
  if (isFieldRole(role)) return "field";
  return "admin";
}

module.exports = {
  ROLES,
  COMPANIES,
  ROLE_OPTIONS,
  FIELD_ROLES,
  INQUIRY_CATEGORIES,
  isActiveMember,
  isMasterAdmin,
  isAdmin,
  isSales,
  isManager,
  isOperationManager,
  isEngineer,
  isProcurement,
  isAccounts,
  isFieldRole,
  canManageTeam,
  canCreateInquiry,
  canManageBoq,
  canApproveBoq,
  canApproveVisit,
  dashboardTypeForRole,
};
