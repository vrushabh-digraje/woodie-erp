import {
  LayoutDashboard,
  ClipboardList,
  FolderKanban,
  Settings,
  Wrench,
  Package,
  Banknote,
  type LucideIcon,
} from "lucide-react";
import {
  canCreateInquiry,
  canManageBoq,
  canManageTeam,
  canViewWorkOrders,
  canAccessFinance,
  inquiryListPath,
  showMaterialsNav,
  showMyVisitsNav,
} from "../../features/auth/permissions";
import type { UserRole } from "../../features/auth/authTypes";

export type NavKey =
  | "dashboard"
  | "inquiries"
  | "tools"
  | "workorders"
  | "materials"
  | "finance"
  | "settings";

export type NavSectionKey = "main" | "finance" | "admin";

export type NavItem = {
  key: NavKey;
  icon: LucideIcon;
  label: string;
  path: string | ((role: UserRole) => string);
  show: (role: UserRole) => boolean;
  section: NavSectionKey;
};

export const NAV_SECTION_LABELS: Record<NavSectionKey, string> = {
  main: "Main",
  finance: "Finance",
  admin: "Admin",
};

export const NAV_SECTIONS: NavSectionKey[] = ["main", "finance", "admin"];

export const NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/",
    show: () => true,
    section: "main",
  },
  {
    key: "inquiries",
    icon: ClipboardList,
    label: "Inquiries",
    path: (r) => inquiryListPath(r),
    show: (r) => canCreateInquiry(r) || showMyVisitsNav(r),
    section: "main",
  },
  {
    key: "tools",
    icon: Wrench,
    label: "BOQ tools",
    path: "/boq",
    show: (r) => canManageBoq(r),
    section: "main",
  },
  {
    key: "workorders",
    icon: FolderKanban,
    label: "Work orders",
    path: "/workorders",
    show: (r) => canViewWorkOrders(r),
    section: "main",
  },
  {
    key: "materials",
    icon: Package,
    label: "Materials",
    path: "/materials",
    show: (r) => showMaterialsNav(r),
    section: "main",
  },
  {
    key: "finance",
    icon: Banknote,
    label: "Invoices",
    path: "/finance/invoices",
    show: (r) => canAccessFinance(r),
    section: "finance",
  },
  {
    key: "settings",
    icon: Settings,
    label: "Team",
    path: "/team",
    show: (r) => canManageTeam(r),
    section: "admin",
  },
];

export function resolveNavPath(item: NavItem, role: UserRole) {
  return typeof item.path === "function" ? item.path(role) : item.path;
}

export function isNavItemActive(
  item: NavItem,
  active: NavKey,
  pathname: string,
  role: UserRole,
): boolean {
  if (item.key === active) return true;
  const path = resolveNavPath(item, role);
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function navSectionsForRole(role: UserRole) {
  const visible = NAV_ITEMS.filter((n) => n.show(role));
  return NAV_SECTIONS.map((section) => ({
    section,
    label: NAV_SECTION_LABELS[section],
    items: visible.filter((item) => item.section === section),
  })).filter((group) => group.items.length > 0);
}
