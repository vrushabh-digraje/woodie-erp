import { Building2, LogOut, Menu, Sparkles, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { isMasterAdmin, roleLabel } from "../features/auth/permissions";
import { themeClasses } from "../theme/classes";
import { colors } from "../theme/colors";

type HeaderProps = {
  title?: string;
  breadcrumb?: string;
};

const COMPANY_NAMES: Record<string, string> = {
  "woodie-1": "Woodie 1",
  "woodie-2": "Woodie 2",
  "woodie-3": "Woodie 3",
  all: "All Companies",
};

function CompanyHeaderBadge({ companyId, isMaster }: { companyId?: string | null; isMaster?: boolean }) {
  if (isMaster) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-brand-gold border border-brand-gold/40 shadow-xs">
        <Sparkles className="h-3.5 w-3.5 text-brand-gold" />
        <span>Master Super Admin</span>
      </span>
    );
  }

  const cid = (companyId || "woodie-1").toLowerCase();
  let badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
  if (cid === "woodie-2") {
    badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (cid === "woodie-3") {
    badgeColor = "bg-amber-50 text-amber-800 border-amber-200";
  }

  return (
    <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border ${badgeColor}`}>
      <Building2 className="h-3.5 w-3.5" />
      <span>{COMPANY_NAMES[cid] || "Woodie 1"}</span>
    </span>
  );
}

function Header({ title = "Dashboard", breadcrumb = "Dashboard / Home" }: HeaderProps) {
  const { user, logout, activeCompany, setActiveCompany } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user ? isMasterAdmin(user.role) : false;

  return (
    <header className={themeClasses.header}>
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="rounded-lg border border-surface-border p-2 text-text-secondary lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className={themeClasses.headerTitle}>{title}</h1>
              <CompanyHeaderBadge companyId={user?.companyId} isMaster={isSuperAdmin} />
            </div>
            <p className={themeClasses.breadcrumb}>{breadcrumb}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Master Admin Company Switcher Dropdown in Header */}
          {isSuperAdmin ? (
            <div className="relative hidden md:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800">
              <Building2 className="h-4 w-4 text-brand-gold" />
              <select
                value={activeCompany}
                onChange={(e) => setActiveCompany(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer pr-2"
                aria-label="Filter active company"
              >
                <option value="all">Scope: All Companies</option>
                <option value="woodie-1">Scope: Woodie 1</option>
                <option value="woodie-2">Scope: Woodie 2</option>
                <option value="woodie-3">Scope: Woodie 3</option>
              </select>
            </div>
          ) : null}

          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-text-primary">{user?.name ?? "User"}</p>
            <p className="text-xs text-text-muted">{user ? roleLabel(user.role) : ""}</p>
          </div>
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-text-on-primary"
            style={{ backgroundColor: colors.brand.primary }}
            aria-hidden
          >
            {(user?.name ?? "U").charAt(0).toUpperCase()}
          </span>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-border-light cursor-pointer"
          >
            <UserCircle2 className="h-5 w-5 text-text-muted" />
            <span className="hidden sm:inline">Sign out</span>
            <LogOut className="h-4 w-4 sm:hidden" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
