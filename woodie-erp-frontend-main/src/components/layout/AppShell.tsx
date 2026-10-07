import type { ReactNode } from "react";
import { COLORS } from "../../constants/colors";
import IconSidebar, { type NavKey } from "./IconSidebar";
import MobileNavDrawer from "./MobileNavDrawer";
import { SidebarProvider } from "./SidebarContext";
import TopNavbar from "./TopNavbar";

const NAV_PAGE_TITLES: Record<NavKey, string> = {
  dashboard: "Dashboard",
  inquiries: "Inquiries",
  tools: "BOQ Tools",
  workorders: "Work Orders",
  materials: "Materials",
  finance: "Invoices",
  settings: "Team",
};

type AppShellProps = {
  activeNav: NavKey;
  children: ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
  /** Full-bleed main (dashboard uses own padding) */
  flush?: boolean;
};

function AppShellContent({ activeNav, children, pageTitle, pageSubtitle, flush }: AppShellProps) {
  const navTitle = NAV_PAGE_TITLES[activeNav];
  const topTitle = pageTitle ?? pageSubtitle ?? navTitle;
  const topSubtitle = pageTitle && pageSubtitle ? pageSubtitle : undefined;

  return (
    <div className="flex min-h-screen font-sans" style={{ backgroundColor: COLORS.page.bg }}>
      <IconSidebar active={activeNav} />
      <MobileNavDrawer active={activeNav} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar title={topTitle} subtitle={topSubtitle} />
        <main className={flush ? "flex-1" : "flex-1 px-4 py-4 lg:px-6 lg:py-5"}>{children}</main>
      </div>
    </div>
  );
}

export default function AppShell(props: AppShellProps) {
  return (
    <SidebarProvider>
      <AppShellContent {...props} />
    </SidebarProvider>
  );
}
