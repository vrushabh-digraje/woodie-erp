import { LogOut, Menu, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { roleLabel } from "../features/auth/permissions";
import { themeClasses } from "../theme/classes";
import { colors } from "../theme/colors";

type HeaderProps = {
  title?: string;
  breadcrumb?: string;
};

function Header({ title = "Dashboard", breadcrumb = "Dashboard / Home" }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
            <h1 className={themeClasses.headerTitle}>{title}</h1>
            <p className={themeClasses.breadcrumb}>{breadcrumb}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">          
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
            className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-border-light"
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









