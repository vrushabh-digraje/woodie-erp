import type { CSSProperties } from "react";
import { LogOut, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { COLORS } from "../../constants/colors";
import { useAuth } from "../../features/auth/AuthContext";
import { roleLabel } from "../../features/auth/permissions";
import SidebarLogo from "./SidebarLogo";
import {
  isNavItemActive,
  NAV_ITEMS,
  resolveNavPath,
  type NavKey,
} from "./navItems";
import { useSidebar } from "./SidebarContext";

type MobileNavDrawerProps = {
  active: NavKey;
};

function navLinkStyle(active: boolean): CSSProperties {
  if (active) {
    return {
      backgroundColor: COLORS.sidebar.activeItem,
      color: COLORS.sidebar.activeText,
    };
  }
  return {
    backgroundColor: "transparent",
    color: COLORS.sidebar.inactiveText,
  };
}

export default function MobileNavDrawer({ active }: MobileNavDrawerProps) {
  const { user, logout } = useAuth();
  const { mobileMenuOpen, close } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const role = user?.role ?? "admin";
  const items = NAV_ITEMS.filter((n) => n.show(role));
  const initial = (user?.name ?? "U").charAt(0).toUpperCase();

  if (!mobileMenuOpen) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 lg:hidden"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        aria-label="Close menu"
        onClick={close}
      />

      <div
        className="fixed inset-y-0 left-0 z-[60] flex w-[min(280px,88vw)] flex-col lg:hidden"
        style={{
          backgroundColor: COLORS.sidebar.bg,
          borderRight: `1px solid ${COLORS.sidebar.border}`,
        }}
      >
        <div className="relative shrink-0">
          <SidebarLogo expanded />
          <button
            type="button"
            onClick={close}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center"
            style={{ ...navLinkStyle(false), borderRadius: 7 }}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-4">
          <div className="flex flex-col gap-0.5">
            {items.map((item) => {
              const Icon = item.icon;
              const path = resolveNavPath(item, role);
              const on = isNavItemActive(item, active, location.pathname, role);
              return (
                <Link
                  key={item.key}
                  to={path}
                  onClick={close}
                  className="flex h-10 items-center gap-2.5 px-2.5 text-[13px] font-medium transition"
                  style={{ ...navLinkStyle(on), borderRadius: 7 }}
                >
                  <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {user ? (
          <div className="px-4 py-4" style={{ borderTop: `1px solid ${COLORS.sidebar.border}` }}>
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{ backgroundColor: COLORS.brand, color: COLORS.sidebar.activeText }}
              >
                {initial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" style={{ color: COLORS.sidebar.activeText }}>
                  {user.name}
                </p>
                <p className="truncate text-xs" style={{ color: COLORS.sidebar.inactiveText }}>
                  {roleLabel(user.role)}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="px-4 py-3" style={{ borderTop: `1px solid ${COLORS.sidebar.border}` }}>          
          <button
            type="button"
            onClick={() => {
              logout();
              close();
              navigate("/login");
            }}
            className="flex h-10 w-full items-center justify-center gap-2 text-sm font-medium"
            style={{ ...navLinkStyle(false), borderRadius: 7 }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
