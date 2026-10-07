import type { CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { COLORS } from "../../constants/colors";
import { useAuth } from "../../features/auth/AuthContext";
import SidebarLogo from "./SidebarLogo";
import {
  isNavItemActive,
  NAV_ITEMS,
  resolveNavPath,
  type NavKey,
} from "./navItems";
import { useSidebar } from "./SidebarContext";

export type { NavKey } from "./navItems";

const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED = 68;

type IconSidebarProps = {
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

export default function IconSidebar({ active }: IconSidebarProps) {
  const { user } = useAuth();
  const { expanded, toggle } = useSidebar();
  const location = useLocation();
  const role = user?.role ?? "admin";
  const items = NAV_ITEMS.filter((n) => n.show(role));
  const width = expanded ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED;

  return (
    <>
      <aside
        className="fixed left-0 top-0 z-40 hidden h-screen shrink-0 flex-col transition-[width] duration-200 ease-in-out lg:flex"
        style={{
          width,
          backgroundColor: COLORS.sidebar.bg,
          borderRight: `1px solid ${COLORS.sidebar.border}`,
        }}
      >
        <SidebarLogo expanded={expanded} />

        <nav
          className="flex flex-1 flex-col overflow-y-auto pb-3 pt-4"
          style={{ paddingLeft: expanded ? 10 : 8, paddingRight: expanded ? 10 : 8 }}
        >
          <div className="flex flex-col gap-0.5">
            {items.map((item) => {
              const Icon = item.icon;
              const path = resolveNavPath(item, role);
              const on = isNavItemActive(item, active, location.pathname, role);
              return (
                <Link
                  key={item.key}
                  to={path}
                  title={expanded ? undefined : item.label}
                  className="flex h-9 items-center text-[13px] font-medium transition"
                  style={{
                    ...navLinkStyle(on),
                    borderRadius: 7,
                    gap: expanded ? 10 : 0,
                    padding: expanded ? "0 10px" : 0,
                    width: expanded ? "100%" : 36,
                    justifyContent: expanded ? "flex-start" : "center",
                    margin: expanded ? undefined : "0 auto",
                  }}
                  onMouseEnter={(e) => {
                    if (on) return;
                    e.currentTarget.style.backgroundColor = COLORS.sidebar.hoverBg;
                    e.currentTarget.style.color = COLORS.sidebar.hoverText;
                  }}
                  onMouseLeave={(e) => {
                    Object.assign(e.currentTarget.style, navLinkStyle(on));
                  }}
                >
                  <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
                  {expanded ? <span className="truncate">{item.label}</span> : null}
                </Link>
              );
            })}
          </div>
        </nav>

        <div
          className="shrink-0"
          style={{
            borderTop: `1px solid ${COLORS.sidebar.border}`,
            padding: expanded ? "12px 14px" : "12px 8px",
          }}
        >
          <button
            type="button"
            onClick={toggle}
            className="flex h-8 items-center text-xs font-medium transition"
            style={{
              color: COLORS.sidebar.inactiveText,
              borderRadius: 7,
              width: expanded ? "100%" : 36,
              justifyContent: expanded ? "flex-start" : "center",
              gap: expanded ? 8 : 0,
              padding: expanded ? "0 8px" : 0,
              margin: expanded ? undefined : "0 auto",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.sidebar.hoverBg;
              e.currentTarget.style.color = COLORS.sidebar.hoverText;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = COLORS.sidebar.inactiveText;
            }}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span>Collapse</span>
              </>
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>

      <div
        className="hidden shrink-0 transition-[width] duration-200 ease-in-out lg:block"
        style={{ width }}
        aria-hidden
      />
    </>
  );
}
