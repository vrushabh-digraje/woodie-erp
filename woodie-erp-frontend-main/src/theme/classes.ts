/** Flat Woodie UI class bundles — no shadows, no gradients */
export const themeClasses = {
  page: "min-h-screen bg-surface-page text-text-primary font-sans",
  card: "app-card",
  cardPadding: "app-panel",
  dashboardPanel: "dashboard-panel",
  input:
    "w-full rounded-lg border border-surface-border-light bg-surface-input px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand-amber focus:ring-2 focus:ring-brand-amber/15",
  select:
    "rounded-lg border border-surface-border-light bg-surface-input px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-amber focus:ring-2 focus:ring-brand-amber/15",
  searchBar:
    "flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3 py-2",
  searchInput: "w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none",
  tableHeadRow: "table-head-sidebar",
  tableTh:
    "whitespace-nowrap px-3.5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-white first:pl-4 last:pr-4",
  tableBodyRow: "transition-colors hover:bg-surface-muted/50",
  tableTd: "px-4 py-3 text-text-primary first:pl-5 last:pr-5",
  sectionTitle: "border-l-[3px] border-brand-amber pl-2.5 text-[15px] font-bold text-text-primary",
  btnPrimary:
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-amber px-4 py-2 text-sm font-semibold text-text-on-brand transition hover:bg-brand-amber-hover disabled:cursor-not-allowed disabled:opacity-60",
  btnSecondary:
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60",
  btnNavy:
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy-light disabled:cursor-not-allowed disabled:opacity-60",
  btnSuccess:
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60",
  btnGhost:
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60",
  sidebar: "hidden",
  header: "hidden",
  navItemActive: "sidebar-nav-active",
  navItemHover: "sidebar-nav-idle",
  breadcrumb: "text-xs text-text-muted",
  dashboardSection: "dashboard-panel",
  dashboardWelcome: "text-sm text-text-secondary",
  chartTitle: "text-sm font-semibold text-text-primary",
  chartSubtitle: "text-xs text-text-muted",
  badgeNeutral: "rounded-md bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text-secondary",
  badgeGold: "rounded-md bg-accent-amber-light px-2 py-0.5 text-[11px] font-semibold text-brand-amber",
  headerTitle: "truncate text-lg font-semibold text-text-primary sm:text-xl",
  sidebarLogoWrap: "flex items-center justify-center border-b border-white/10 px-3 py-4",
  sidebarLogo: "h-10 w-auto max-w-[140px] object-contain",
  navItem: "flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-medium transition",
  tableRow: "border-b border-surface-border-light transition hover:bg-surface-muted/50",
  tableCell: "py-3 pr-3 font-medium text-text-primary",
  tableCellMuted: "py-3 pr-3 text-text-muted",
} as const;
