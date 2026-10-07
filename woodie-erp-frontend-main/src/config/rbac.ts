export const ROLES = {
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
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
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

export const FIELD_ROLES: UserRole[] = [
  ROLES.SITE_ENGINEER,
  ROLES.TECHNICIAN,
  ROLES.ELECTRICIAN,
  ROLES.CARPENTER,
  ROLES.AC_TECHNICIAN,
  ROLES.PLUMBER,
  ROLES.SUPERVISOR,
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

export function isFieldRole(role: UserRole): boolean {
  return FIELD_ROLES.includes(role);
}

export function isAdmin(role: UserRole): boolean {
  return role === ROLES.ADMIN;
}

export function isSales(role: UserRole): boolean {
  return role === ROLES.SALES;
}

export function isManager(role: UserRole): boolean {
  return role === ROLES.MANAGER;
}

export function isProcurement(role: UserRole): boolean {
  return role === ROLES.PROCUREMENT;
}

export function isAccounts(role: UserRole): boolean {
  return role === ROLES.ACCOUNTS;
}

export function canManageTeam(role: UserRole): boolean {
  return isAdmin(role);
}

export function canCreateInquiry(role: UserRole): boolean {
  return isAdmin(role) || isSales(role);
}

export function canManageBoq(role: UserRole): boolean {
  return isAdmin(role) || isSales(role) || isManager(role) || isProcurement(role);
}

export function canApproveBoq(role: UserRole): boolean {
  return isAdmin(role) || isManager(role) || isProcurement(role);
}

export function canViewWorkOrders(role: UserRole): boolean {
  return isAdmin(role) || isManager(role) || isSales(role) || isProcurement(role) || isFieldRole(role);
}

export function canManageWorkOrders(role: UserRole): boolean {
  return isAdmin(role) || isManager(role) || isProcurement(role);
}

export function canManageMaterials(role: UserRole): boolean {
  return isAdmin(role) || isProcurement(role);
}

export function canViewMaterialInventory(role: UserRole): boolean {
  return isAdmin(role) || isManager(role) || isProcurement(role);
}

/** Site / field staff on assigned jobs — not admin (inventory & approvals only). */
export function canCreateMaterialRequest(role: UserRole): boolean {
  return isFieldRole(role);
}

export function canManageMaterialRequests(role: UserRole): boolean {
  return isAdmin(role) || isManager(role) || isProcurement(role);
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
  return isFieldRole(role) ? "/inquiry/my-visits" : "/inquiry/inquiries";
}

export function defaultHomePath(role: UserRole): string {
  if (isFieldRole(role)) return "/inquiry/my-visits";
  return "/";
}

export function dashboardFetchPath(role: UserRole): string {
  if (isAdmin(role)) return "/dashboard/admin";
  if (isSales(role)) return "/dashboard/sales";
  if (isManager(role)) return "/dashboard/manager";
  if (isProcurement(role)) return "/dashboard/manager";
  if (isAccounts(role)) return "/dashboard/sales";
  if (isFieldRole(role)) return "/dashboard/field";
  return "/dashboard/admin";
}

export function canAccessFinance(role: UserRole): boolean {
  return isAdmin(role) || isManager(role) || isSales(role) || isAccounts(role);
}

export function canManageFinanceEscalations(role: UserRole): boolean {
  return isAdmin(role) || isManager(role) || isAccounts(role);
}

