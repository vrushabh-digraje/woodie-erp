import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileCheck2,
  Layers,
  RefreshCw,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppShell from "../../components/layout/AppShell";
import { formatAed } from "../../lib/formatMoney";
import { themeClasses } from "../../theme/classes";
import { useAuth } from "../auth/AuthContext";
import {
  fetchMasterDashboardStats,
  fetchMasterDrilldown,
  type DrilldownRecord,
  type MasterDashboardStats,
} from "./dashboardApi";

const CHART_COLORS = {
  blue: "#2563EB",
  amber: "#D97706",
  emerald: "#059669",
  rose: "#E11D48",
  violet: "#7C3AED",
  slate: "#64748B",
  cyan: "#0891B2",
  indigo: "#4F46E5",
};

const PIE_PALETTE = [
  "#2563EB", // Blue
  "#D97706", // Amber
  "#059669", // Emerald
  "#7C3AED", // Violet
  "#E11D48", // Rose
  "#0891B2", // Cyan
  "#64748B", // Slate
];

function CompanyBadge({ companyId }: { companyId: string }) {
  const normalized = (companyId || "woodie-1").toLowerCase();
  if (normalized === "woodie-2") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Woodie 2
      </span>
    );
  }
  if (normalized === "woodie-3") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Woodie 3
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
      Woodie 1
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  let display = status;
  let color = "bg-slate-100 text-slate-700 border-slate-200";

  if (["Approved", "Won", "Completed", "Handed Over"].includes(status)) {
    if (status === "Won") display = "Done";
    color = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (status === "Visit Approved" || status === "Accepted") {
    display = "Accepted";
    color = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (status === "Visit Pending Approval" || status === "Site visit acceptance pending") {
    display = "Site visit acceptance pending";
    color = "bg-amber-50 text-amber-800 border-amber-200";
  } else if (["Pending Approval", "In Progress"].includes(status)) {
    color = "bg-amber-50 text-amber-800 border-amber-200";
  } else if (status === "Visit Rejected" || status === "Rejected") {
    display = "Rejected";
    color = "bg-rose-50 text-rose-700 border-rose-200";
  } else if (["Lost", "Cancelled"].includes(status)) {
    color = "bg-rose-50 text-rose-700 border-rose-200";
  } else if (status === "Site Report Attached" || status === "Done") {
    display = "Done";
    color = "bg-blue-50 text-blue-700 border-blue-200";
  } else if (["Scheduled"].includes(status)) {
    color = "bg-blue-50 text-blue-700 border-blue-200";
  }

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${color}`}>
      {display}
    </span>
  );
}

export default function MasterDashboardPage() {
  const { activeCompany, setActiveCompany } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MasterDashboardStats | null>(null);
  const [period, setPeriod] = useState<"month" | "year" | "all">("year");
  const [refreshing, setRefreshing] = useState(false);

  // Drilldown modal state
  const [drillModalOpen, setDrillModalOpen] = useState(false);
  const [drillCategory, setDrillCategory] = useState<string>("inquiries");
  const [drillStatus, setDrillStatus] = useState<string>("all");
  const [drillRecords, setDrillRecords] = useState<DrilldownRecord[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillSearch, setDrillSearch] = useState("");

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await fetchMasterDashboardStats({
        companyId: activeCompany,
        period,
      });
      setStats(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCompany, period]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openDrilldown = async (category: string, status = "all") => {
    setDrillCategory(category);
    setDrillStatus(status);
    setDrillSearch("");
    setDrillModalOpen(true);
    setDrillLoading(true);
    try {
      const res = await fetchMasterDrilldown({
        category,
        status,
        companyId: activeCompany,
      });
      setDrillRecords(res.records || []);
    } catch {
      setDrillRecords([]);
    } finally {
      setDrillLoading(false);
    }
  };

  const filteredDrillRecords = useMemo(() => {
    if (!drillSearch.trim()) return drillRecords;
    const q = drillSearch.toLowerCase();
    return drillRecords.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.projectName.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.companyName.toLowerCase().includes(q),
    );
  }, [drillRecords, drillSearch]);

  // Chart data transforms
  const inquiriesChartData = useMemo(() => {
    if (!stats?.inquiryByStatus) return [];
    return Object.entries(stats.inquiryByStatus)
      .map(([name, value], i) => ({
        name,
        value,
        color: PIE_PALETTE[i % PIE_PALETTE.length],
      }))
      .filter((d) => d.value > 0);
  }, [stats]);

  const siteVisitsChartData = useMemo(() => {
    if (!stats?.siteVisitBreakdown) return [];
    return Object.entries(stats.siteVisitBreakdown).map(([name, count]) => ({
      name,
      count,
    }));
  }, [stats]);

  const quotationsChartData = useMemo(() => {
    if (!stats?.quotationByStatus) return [];
    return Object.entries(stats.quotationByStatus)
      .map(([name, value], i) => ({
        name,
        value,
        color: PIE_PALETTE[(i + 2) % PIE_PALETTE.length],
      }))
      .filter((d) => d.value > 0);
  }, [stats]);

  const workOrdersChartData = useMemo(() => {
    if (!stats?.workOrdersByStatus) return [];
    return Object.entries(stats.workOrdersByStatus)
      .map(([name, value], i) => ({
        name,
        value,
        color: PIE_PALETTE[(i + 4) % PIE_PALETTE.length],
      }))
      .filter((d) => d.value > 0);
  }, [stats]);

  const companyComparisonData = useMemo(() => {
    if (!stats?.companyComparison) return [];
    return stats.companyComparison.map((c) => ({
      name: c.name,
      id: c.id,
      Inquiries: c.inquiries,
      Quotations: c.quotations,
      "Active Jobs": c.activeWorkOrders,
      ValueAed: c.quotationValue,
    }));
  }, [stats]);

  if (!stats) {
    return (
      <AppShell activeNav="dashboard">
        <div className="flex h-96 items-center justify-center">
          {loading ? (
            <div className="flex items-center gap-3 text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin text-brand-gold" />
              <span className="text-sm font-medium">Loading Master Dashboard...</span>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600 mb-3">Unable to load Master Dashboard data.</p>
              <button
                type="button"
                onClick={() => void loadData()}
                className="rounded-lg bg-brand-gold px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-amber-400 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  const companiesList = [
    { id: "all", label: "All Companies (Consolidated)" },
    { id: "woodie-1", label: "Woodie 1" },
    { id: "woodie-2", label: "Woodie 2" },
    { id: "woodie-3", label: "Woodie 3" },
  ];

  const companyScopeMeta: Record<string, { title: string; subtitle: string }> = {
    all: {
      title: "Multi-Company Master Dashboard",
      subtitle: "Consolidated live analytics across Woodie 1, Woodie 2, and Woodie 3.",
    },
    "woodie-1": {
      title: "Woodie 1 — Master Dashboard",
      subtitle: "Live analytics, pipeline, and site execution metrics for Woodie 1.",
    },
    "woodie-2": {
      title: "Woodie 2 — Master Dashboard",
      subtitle: "Live analytics, pipeline, and site execution metrics for Woodie 2.",
    },
    "woodie-3": {
      title: "Woodie 3 — Master Dashboard",
      subtitle: "Live analytics, pipeline, and site execution metrics for Woodie 3.",
    },
  };

  const currentScope = companyScopeMeta[activeCompany] || companyScopeMeta.all;

  return (
    <AppShell activeNav="dashboard">
      <div className="space-y-6 pb-12">
        {/* Master Dashboard Header & Switcher */}
        <div className="rounded-2xl border border-brand-gold/30 bg-gradient-to-r from-[#17233D] via-[#1E2E4F] to-[#17233D] p-6 text-white shadow-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2.5">
                <span>{currentScope.title}</span>
                {activeCompany !== "all" && (
                  <span
                    className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold border ${
                      activeCompany === "woodie-2"
                        ? "bg-emerald-500/25 text-emerald-300 border-emerald-400/40"
                        : activeCompany === "woodie-3"
                        ? "bg-amber-500/25 text-amber-300 border-amber-400/40"
                        : "bg-blue-500/25 text-blue-300 border-blue-400/40"
                    }`}
                  >
                    {activeCompany === "woodie-2" ? "Woodie 2" : activeCompany === "woodie-3" ? "Woodie 3" : "Woodie 1"}
                  </span>
                )}
              </h1>
              <p className="mt-1 text-xs text-slate-300">
                {currentScope.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Period Selector */}
              <div className="flex rounded-lg bg-white/10 p-1 border border-white/10">
                {(["month", "year", "all"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                      period === p
                        ? "bg-amber-400 text-slate-950 font-bold shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {p === "month" ? "This Month" : p === "year" ? "This Year" : "All Time"}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={refreshing}
                className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-all cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Company Switcher Tabs */}
          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-2.5">
              <Building2 className="h-4 w-4 text-amber-400" />
              <span>Select Company:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {companiesList.map((co) => {
                const isActive = activeCompany === co.id;
                return (
                  <button
                    key={co.id}
                    type="button"
                    onClick={() => setActiveCompany(co.id)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-amber-400 text-slate-950 shadow-lg ring-2 ring-amber-300 ring-offset-2 ring-offset-slate-900"
                        : "bg-white/10 text-white hover:bg-white/20 border border-white/15"
                    }`}
                  >
                    <Layers className={`h-3.5 w-3.5 ${isActive ? "text-slate-950" : "text-amber-400"}`} />
                    <span>{co.label}</span>
                    {isActive ? (
                      <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-black text-amber-400 tracking-wider">
                        ACTIVE
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Master KPI Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Inquiries */}
          <button
            type="button"
            onClick={() => void openDrilldown("inquiries", "all")}
            className="group relative overflow-hidden rounded-2xl border border-surface-border bg-white p-5 text-left shadow-sm transition-all hover:border-brand-gold hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Inquiries Pipeline
              </span>
              <div className="rounded-xl bg-blue-50 p-2 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <ClipboardList className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {stats?.summary?.totalInquiries ?? 0}
              </span>
              <span className="text-xs text-text-muted">Total captured</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-700 border border-amber-200">
                {stats?.summary?.pendingVisits ?? 0} pending visit approval
              </span>
              <span className="text-brand-navy font-medium ml-auto flex items-center group-hover:underline">
                Drill down <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </button>

          {/* Card 2: Site Visits */}
          <button
            type="button"
            onClick={() => void openDrilldown("visits", "all")}
            className="group relative overflow-hidden rounded-2xl border border-surface-border bg-white p-5 text-left shadow-sm transition-all hover:border-brand-gold hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Site Visits
              </span>
              <div className="rounded-xl bg-amber-50 p-2 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <CalendarDays className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {stats?.summary?.totalSiteVisits ?? 0}
              </span>
              <span className="text-xs text-text-muted">Visits scheduled</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 border border-emerald-200">
                {stats?.summary?.completedVisits ?? 0} report attached
              </span>
              <span className="text-brand-navy font-medium ml-auto flex items-center group-hover:underline">
                Drill down <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </button>

          {/* Card 3: Quotations */}
          <button
            type="button"
            onClick={() => void openDrilldown("quotations", "all")}
            className="group relative overflow-hidden rounded-2xl border border-surface-border bg-white p-5 text-left shadow-sm transition-all hover:border-brand-gold hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Quotations / BOQ
              </span>
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <FileCheck2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {stats?.summary?.totalQuotations ?? 0}
              </span>
              <span className="text-xs font-semibold text-emerald-600">
                {formatAed(stats?.summary?.quotationValueAed ?? 0)}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-700 border border-amber-200">
                {stats?.summary?.pendingApprovalQuotations ?? 0} pending review
              </span>
              <span className="text-brand-navy font-medium ml-auto flex items-center group-hover:underline">
                Drill down <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </button>

          {/* Card 4: Work Orders */}
          <button
            type="button"
            onClick={() => void openDrilldown("workorders", "all")}
            className="group relative overflow-hidden rounded-2xl border border-surface-border bg-white p-5 text-left shadow-sm transition-all hover:border-brand-gold hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Active Projects
              </span>
              <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {stats?.summary?.activeWorkOrders ?? 0}
              </span>
              <span className="text-xs text-text-muted">
                of {stats?.summary?.totalWorkOrders ?? 0} Work Orders
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="rounded-md bg-blue-50 px-2 py-0.5 font-medium text-blue-700 border border-blue-200">
                Live site execution
              </span>
              <span className="text-brand-navy font-medium ml-auto flex items-center group-hover:underline">
                Drill down <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </button>
        </div>

        {/* Section: Multi-Company Comparison Bar Chart */}
        <section className={themeClasses.cardPadding}>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand-gold" />
                Multi-Company Operational Benchmark
              </h2>
              <p className="text-xs text-slate-500">
                Side-by-side comparison of Woodie 1, Woodie 2, and Woodie 3 performance metrics.
              </p>
            </div>
            <span className="text-xs text-slate-400 italic">
              Click any company tab to isolate tenant view
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={companyComparisonData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748B", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [`${val ?? ""}`, ""]}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "12px",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }} />
                <Bar dataKey="Inquiries" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} cursor="pointer" onClick={() => openDrilldown("inquiries", "all")} />
                <Bar dataKey="Quotations" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} cursor="pointer" onClick={() => openDrilldown("quotations", "all")} />
                <Bar dataKey="Active Jobs" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} cursor="pointer" onClick={() => openDrilldown("workorders", "all")} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Section: 4 Interactive Charts Grid with Drill-Down */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Chart 1: Inquiries Pipeline Donut */}
          <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Inquiry Pipeline Status</h3>
                <p className="text-xs text-slate-500">Click any slice to view live records</p>
              </div>
              <span className="text-[11px] font-semibold text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-full">
                Interactive Drill-down
              </span>
            </div>
            <div className="mt-4 h-64 w-full">
              {inquiriesChartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  No inquiries recorded
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inquiriesChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      cursor="pointer"
                      onClick={(entry) => {
                        if (entry && entry.name) {
                          void openDrilldown("inquiries", entry.name);
                        }
                      }}
                    >
                      {inquiriesChartData.map((entry, index) => (
                        <Cell key={`inq-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "12px" }} />
                    <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Site Visits Breakdown Bar Chart */}
          <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Site Visit Approvals & Progress</h3>
                <p className="text-xs text-slate-500">Click any bar to drill down into site visits</p>
              </div>
              <span className="text-[11px] font-semibold text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-full">
                Interactive Drill-down
              </span>
            </div>
            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={siteVisitsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "12px" }} />
                  <Bar
                    dataKey="count"
                    fill={CHART_COLORS.amber}
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(entry) => {
                      if (entry && entry.name) {
                        void openDrilldown("visits", entry.name);
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Quotations by Status Donut */}
          <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Quotations by Approval Stage</h3>
                <p className="text-xs text-slate-500">Click slice to drill down into underlying BOQs</p>
              </div>
              <span className="text-[11px] font-semibold text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-full">
                Interactive Drill-down
              </span>
            </div>
            <div className="mt-4 h-64 w-full">
              {quotationsChartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  No quotations recorded
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={quotationsChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      cursor="pointer"
                      onClick={(entry) => {
                        if (entry && entry.name) {
                          void openDrilldown("quotations", entry.name);
                        }
                      }}
                    >
                      {quotationsChartData.map((entry, index) => (
                        <Cell key={`quot-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "12px" }} />
                    <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 4: Work Orders Progress Donut */}
          <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Work Orders Execution Status</h3>
                <p className="text-xs text-slate-500">Click slice to drill down into live work orders</p>
              </div>
              <span className="text-[11px] font-semibold text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-full">
                Interactive Drill-down
              </span>
            </div>
            <div className="mt-4 h-64 w-full">
              {workOrdersChartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  No work orders active
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={workOrdersChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      cursor="pointer"
                      onClick={(entry) => {
                        if (entry && entry.name) {
                          void openDrilldown("workorders", entry.name);
                        }
                      }}
                    >
                      {workOrdersChartData.map((entry, index) => (
                        <Cell key={`wo-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "12px" }} />
                    <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Drill-Down Modal / Drawer */}
      {drillModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-brand-navy px-2 py-0.5 text-xs font-semibold text-white uppercase tracking-wider">
                    Live Record Drill-Down
                  </span>
                  <span className="text-xs text-slate-500">
                    Category: <strong className="text-slate-800 capitalize">{drillCategory}</strong>
                  </span>
                  {drillStatus !== "all" ? (
                    <span className="rounded-md bg-brand-gold/20 px-2 py-0.5 text-xs font-semibold text-brand-navy border border-brand-gold/30">
                      Filter: {drillStatus}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  {drillCategory === "inquiries"
                    ? "Inquiries Records"
                    : drillCategory === "visits"
                    ? "Site Visits Records"
                    : drillCategory === "quotations"
                    ? "Quotations / BOQ Records"
                    : "Work Orders Execution Records"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDrillModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Search & Filters */}
            <div className="border-b border-slate-100 bg-white px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={drillSearch}
                    onChange={(e) => setDrillSearch(e.target.value)}
                    placeholder="Search by reference #, client name, project, or status..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-800 focus:border-brand-gold focus:bg-white focus:outline-hidden"
                  />
                </div>
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                  Showing <strong>{filteredDrillRecords.length}</strong> live records
                </span>
              </div>
            </div>

            {/* Modal Body / Table */}
            <div className="flex-1 overflow-y-auto p-6">
              {drillLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <RefreshCw className="h-4 w-4 animate-spin text-brand-gold" />
                    Loading underlying records...
                  </div>
                </div>
              ) : filteredDrillRecords.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center text-center">
                  <Layers className="h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-700">No records found</p>
                  <p className="text-xs text-slate-400">
                    No active records match the selected slice for this company.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Reference #</th>
                        <th className="px-4 py-3">Company</th>
                        <th className="px-4 py-3">Client / Project</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Details / Value</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDrillRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-bold text-brand-navy whitespace-nowrap">
                            {rec.number}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <CompanyBadge companyId={rec.companyId} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{rec.clientName}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">
                              {rec.projectName}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge status={rec.status} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {rec.value !== undefined ? (
                              <div className="font-bold text-slate-900">
                                {formatAed(rec.value)}
                              </div>
                            ) : null}
                            <div className="text-[11px] text-slate-400">
                              {rec.date ? new Date(rec.date).toLocaleDateString() : ""} {rec.time || ""}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <Link
                              to={rec.link}
                              onClick={() => setDrillModalOpen(false)}
                              className="inline-flex items-center gap-1 rounded-lg bg-brand-navy px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-navy/90 transition-all shadow-xs"
                            >
                              <span>Open Record</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3">
              <span className="text-[11px] text-slate-400">
                Data dynamically synced from company database partition.
              </span>
              <button
                type="button"
                onClick={() => setDrillModalOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
