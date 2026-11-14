export const ROLES = {
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
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const COMPANIES = [
  { id: "woodie-1", name: "Woodie 1", shortName: "W1", legalName: "Woodie Technical Services & Contracting LLC" },
  { id: "woodie-2", name: "Woodie 2", shortName: "W2", legalName: "Woodie 2 Contracting LLC" },
  { id: "woodie-3", name: "Woodie 3", shortName: "W3", legalName: "Woodie 3 Contracting LLC" },
] as const;

export type CompanyId = (typeof COMPANIES)[number]["id"];

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
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

export const FIELD_ROLES: UserRole[] = [
  ROLES.ENGINEER,
  ROLES.SUPERVISOR,
  ROLES.SITE_ENGINEER,
  ROLES.TECHNICIAN,
  ROLES.ELECTRICIAN,
  ROLES.CARPENTER,
  ROLES.AC_TECHNICIAN,
  ROLES.PLUMBER,
];

export const INQUIRY_CATEGORIES = [
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
] as const;

export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number];

export function roleLabel(role: UserRole): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

export function isMasterAdmin(role: UserRole): boolean {
  return role === ROLES.MASTER_ADMIN;
}

export function isFieldRole(role: UserRole): boolean {
  return FIELD_ROLES.includes(role);
}

export function isAdmin(role: UserRole): boolean {
  return role === ROLES.ADMIN || role === ROLES.MASTER_ADMIN;
}

export function isSales(role: UserRole): boolean {
  return role === ROLES.SALES;
}

export function isManager(role: UserRole): boolean {
  return role === ROLES.MANAGER || role === ROLES.OPERATION_MANAGER;
}

export function isProcurement(role: UserRole): boolean {
  return role === ROLES.PROCUREMENT;
}

export function isAccounts(role: UserRole): boolean {
  return role === ROLES.ACCOUNTS;
}

export function canManageTeam(role: UserRole): boolean {
  return isMasterAdmin(role) || role === ROLES.ADMIN || role === ROLES.MANAGER;
}

export function canCreateInquiry(role: UserRole): boolean {
  return (
    isMasterAdmin(role) ||
    role === ROLES.ADMIN ||
    role === ROLES.SALES ||
    role === ROLES.ENGINEER ||
    isManager(role)
  );
}

export function canManageBoq(role: UserRole): boolean {
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
export function canApproveBoq(role: UserRole): boolean {
  return isMasterAdmin(role) || isManager(role) || isProcurement(role);
}

/** Managers, Operation Managers, Admins, and Master Admin can approve Site Visits */
export function canApproveVisit(role: UserRole): boolean {
  return isMasterAdmin(role) || isManager(role) || role === ROLES.ADMIN;
}

export function canViewWorkOrders(role: UserRole): boolean {
  return isMasterAdmin(role) || isAdmin(role) || isManager(role) || isSales(role) || isProcurement(role) || isFieldRole(role);
}

export function canManageWorkOrders(role: UserRole): boolean {
  return isMasterAdmin(role) || isAdmin(role) || isManager(role) || isProcurement(role);
}

export function canManageMaterials(role: UserRole): boolean {
  return isMasterAdmin(role) || isAdmin(role) || isProcurement(role);
}

export function canViewMaterialInventory(role: UserRole): boolean {
  return isMasterAdmin(role) || isAdmin(role) || isManager(role) || isProcurement(role);
}

/** Site / field staff on assigned jobs — not admin (inventory & approvals only). */
export function canCreateMaterialRequest(role: UserRole): boolean {
  return isFieldRole(role);
}

export function canManageMaterialRequests(role: UserRole): boolean {
  return isMasterAdmin(role) || isAdmin(role) || isManager(role) || isProcurement(role);
}

export function showMaterialsNav(role: UserRole): boolean {
  return (
    canViewMaterialInventory(role) ||
    canCreateMaterialRequest(role) ||
    canManageMaterialRequests(role)
  );
}

export function showMyVisitsNav(role: UserRole): boolean {
  return isFieldRole(role);
}

export function inquiryListPath(role: UserRole): string {
  return isFieldRole(role) && !isAdmin(role) && !isManager(role) ? "/inquiry/my-visits" : "/inquiry/inquiries";
}

export function defaultHomePath(role: UserRole): string {
  if (isMasterAdmin(role)) return "/";
  if (isFieldRole(role) && !isAdmin(role) && !isManager(role)) return "/inquiry/my-visits";
  return "/";
}

export function dashboardFetchPath(role: UserRole): string {
  if (isMasterAdmin(role)) return "/dashboard/master";
  if (role === ROLES.ADMIN) return "/dashboard/admin";
  if (isSales(role)) return "/dashboard/sales";
  if (isManager(role)) return "/dashboard/manager";
  if (isProcurement(role)) return "/dashboard/manager";
  if (isAccounts(role)) return "/dashboard/sales";
  if (isFieldRole(role)) return "/dashboard/field";
  return "/dashboard/admin";
}

export function canAccessFinance(role: UserRole): boolean {
  return isMasterAdmin(role) || isAdmin(role) || isManager(role) || isSales(role) || isAccounts(role);
}

export function canManageFinanceEscalations(role: UserRole): boolean {
  return isMasterAdmin(role) || isAdmin(role) || isManager(role) || isAccounts(role);
}
