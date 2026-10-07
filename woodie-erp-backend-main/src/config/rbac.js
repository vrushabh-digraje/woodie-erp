/** Role slugs stored on TeamMember. Labels are for UI only. */
const ROLES = {
  ADMIN: "admin",
  SALES: "sales",
  MANAGER: "manager",
  PROCUREMENT: "procurement",
  ACCOUNTS: "accounts",
  SITE_ENGINEER: "site_engineer",
  TECHNICIAN: "technician",
  ELECTRICIAN: "electrician",
  CARPENTER: "carpenter",
  AC_TECHNICIAN: "ac_technician",
  PLUMBER: "plumber",
  SUPERVISOR: "supervisor",
};

const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: "Admin" },
  { value: ROLES.SALES, label: "Sales" },
  { value: ROLES.MANAGER, label: "Manager" },
  { value: ROLES.PROCUREMENT, label: "Procurement" },
  { value: ROLES.ACCOUNTS, label: "Accounts" },
  { value: ROLES.SITE_ENGINEER, label: "Site Engineer" },
  { value: ROLES.TECHNICIAN, label: "Technician" },
  { value: ROLES.ELECTRICIAN, label: "Electrician" },
  { value: ROLES.CARPENTER, label: "Carpenter" },
  { value: ROLES.AC_TECHNICIAN, label: "AC Technician" },
  { value: ROLES.PLUMBER, label: "Plumber" },
  { value: ROLES.SUPERVISOR, label: "Supervisor" },
];

const FIELD_ROLES = [
  ROLES.SITE_ENGINEER,
  ROLES.TECHNICIAN,
  ROLES.ELECTRICIAN,
  ROLES.CARPENTER,
  ROLES.AC_TECHNICIAN,
  ROLES.PLUMBER,
  ROLES.SUPERVISOR,
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

function isAdmin(role) {
  return role === ROLES.ADMIN;
}

function isSales(role) {
  return role === ROLES.SALES;
}

function isManager(role) {
  return role === ROLES.MANAGER;
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
  return isAdmin(role);
}

function canCreateInquiry(role) {
  return isAdmin(role) || isSales(role);
}

function canManageBoq(role) {
  return isAdmin(role) || isSales(role) || isManager(role) || isProcurement(role);
}

function canApproveBoq(role) {
  return isAdmin(role) || isManager(role) || isProcurement(role);
}

function dashboardTypeForRole(role) {
  if (isAdmin(role)) return "admin";
  if (isSales(role)) return "sales";
  if (isManager(role)) return "manager";
  if (isProcurement(role)) return "manager";
  if (isAccounts(role)) return "sales";
  if (isFieldRole(role)) return "field";
  return null;
}

module.exports = {
  ROLES,
  ROLE_OPTIONS,
  FIELD_ROLES,
  INQUIRY_CATEGORIES,
  isActiveMember,
  isAdmin,
  isSales,
  isManager,
  isProcurement,
  isAccounts,
  isFieldRole,
  canManageTeam,
  canCreateInquiry,
  canManageBoq,
  canApproveBoq,
  dashboardTypeForRole,
};
