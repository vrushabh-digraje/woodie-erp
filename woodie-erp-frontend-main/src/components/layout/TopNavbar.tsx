import { LogOut, PanelLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { COLORS } from "../../constants/colors";
import { useAuth } from "../../features/auth/AuthContext";
import { roleLabel } from "../../features/auth/permissions";
import { useSidebar } from "./SidebarContext";

type TopNavbarProps = {
  title: string;
  subtitle?: string;
};

export default function TopNavbar({ title, subtitle }: TopNavbarProps) {
  const { user, logout } = useAuth();
  const { toggle, mobileMenuOpen } = useSidebar();
  const navigate = useNavigate();
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
