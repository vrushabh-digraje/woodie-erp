import { CalendarDays, CircleUserRound, ClipboardList, LayoutDashboard, Users } from "lucide-react";
import { Link } from "react-router-dom";
import woodieLogo from "../assets/logo/Woodie.png";
import { useAuth } from "../features/auth/AuthContext";
import {
  canCreateInquiry,
  canManageBoq,
  canManageTeam,
  inquiryListPath,
  showMyVisitsNav,
} from "../features/auth/permissions";
import type { UserRole } from "../features/auth/authTypes";
import { themeClasses } from "../theme/classes";

type MenuItem = {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  show: (role: UserRole) => boolean;
};

const menuItems: MenuItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/", show: () => true },
  { label: "Inquiries", icon: CircleUserRound, path: "/inquiry/inquiries", show: (r) => canCreateInquiry(r) },
  { label: "My Site Visits", icon: CalendarDays, path: "/inquiry/my-visits", show: (r) => showMyVisitsNav(r) },
  { label: "Team", icon: Users, path: "/team", show: (r) => canManageTeam(r) },
  { label: "BOQ", icon: ClipboardList, path: "/boq", show: (r) => canManageBoq(r) },
];

type SidebarProps = {
  activeItem?: string;
};

function Sidebar({ activeItem = "Dashboard" }: SidebarProps) {
  const { user } = useAuth();
  const role = user?.role ?? "admin";
  const visibleItems = menuItems.filter((item) => item.show(role));

  return (
    <aside className={themeClasses.sidebar}>
      <div className={themeClasses.sidebarLogoWrap}>
        <img src={woodieLogo} alt="Woodie ERP" className={themeClasses.sidebarLogo} />
      </div>

      {/* {isFieldRole(role) ? (
        <div className="mx-4 mt-3 rounded-xl border border-brand-gold/30 bg-gradient-to-br from-brand-gold/15 to-brand-navy/5 px-3 py-2.5 text-xs leading-relaxed text-brand-navy">
          <span className="font-semibold text-brand-navy">Field access</span>
          <span className="text-text-secondary"> — assigned site visits only.</span>
        </div>
      ) : null} */}

      <nav className="flex-1 overflow-y-auto pb-6 pt-1">
        <ul className="space-y-0.5 px-3">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const path = item.label === "Inquiries" ? inquiryListPath(role) : item.path;
            const isActive = item.label === activeItem;
            return (
              <li key={item.label}>
                <Link
                  to={path}
                  className={`${themeClasses.navItem} ${isActive ? themeClasses.navItemActive : themeClasses.navItemHover}`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-text-on-navy" : "text-text-muted"}`} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;


