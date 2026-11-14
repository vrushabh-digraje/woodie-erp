import { Building2, LogOut, PanelLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { COLORS } from "../../constants/colors";
import { useAuth } from "../../features/auth/AuthContext";
import { isMasterAdmin, roleLabel } from "../../features/auth/permissions";
import { useSidebar } from "./SidebarContext";

type TopNavbarProps = {
  title: string;
  subtitle?: string;
};

export default function TopNavbar({ title, subtitle }: TopNavbarProps) {
  const { user, logout, activeCompany, setActiveCompany } = useAuth();
  const { toggle, mobileMenuOpen } = useSidebar();
  const navigate = useNavigate();
  const isSuper = user ? isMasterAdmin(user.role) : false;
  const initial = (user?.name ?? "U").charAt(0).toUpperCase();

  return (
    <header
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b px-4 lg:px-6"
      style={{
        backgroundColor: COLORS.topbar.bg,
        borderColor: COLORS.topbar.border,
      }}
    >
      <button
        type="button"
        onClick={toggle}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] lg:hidden"
        style={{
          border: `1px solid ${COLORS.topbar.border}`,
          color: COLORS.text.secondary,
        }}
        aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileMenuOpen}
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
        <span
          className="hidden h-6 w-[3px] shrink-0 rounded-full sm:block"
          style={{ backgroundColor: COLORS.topbar.accent }}
          aria-hidden
        />
        <div className="min-w-0">
          <h1
            className="truncate text-lg font-bold tracking-tight sm:text-xl"
            style={{ color: COLORS.topbar.title }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-xs sm:text-sm" style={{ color: COLORS.text.muted }}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        {isSuper ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs shadow-2xs">
            <Building2 className="h-3.5 w-3.5 text-brand-gold shrink-0" />
            <select
              value={activeCompany}
              onChange={(e) => setActiveCompany(e.target.value)}
              className="bg-transparent font-bold text-slate-800 cursor-pointer focus:outline-hidden pr-1 text-xs"
              aria-label="Filter active company"
            >
              <option value="all">🏢 All Companies</option>
              <option value="woodie-1">🏢 Woodie 1</option>
              <option value="woodie-2">🏢 Woodie 2</option>
              <option value="woodie-3">🏢 Woodie 3</option>
            </select>
          </div>
        ) : (
          <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200">
            <Building2 className="h-3 w-3" />
            {user?.companyId === "woodie-2" ? "Woodie 2" : user?.companyId === "woodie-3" ? "Woodie 3" : "Woodie 1"}
          </span>
        )}

        <div className="hidden text-right sm:block">
          <p className="text-xs font-semibold" style={{ color: COLORS.text.primary }}>
            {user?.name ?? "User"}
          </p>
          <p className="text-[10px]" style={{ color: COLORS.text.muted }}>
            {user ? roleLabel(user.role) : ""}
          </p>
        </div>

        <span
          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
          style={{ backgroundColor: COLORS.brand, color: COLORS.sidebar.activeText }}
          aria-hidden
        >
          {initial}
        </span>

        <button
          type="button"
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="flex h-9 w-9 items-center justify-center rounded-[7px]"
          style={{
            border: `1px solid ${COLORS.topbar.border}`,
            color: COLORS.text.muted,
          }}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
