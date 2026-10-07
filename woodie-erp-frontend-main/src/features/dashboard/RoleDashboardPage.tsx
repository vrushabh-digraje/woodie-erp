import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ClipboardList,
  FileCheck,
  Hammer,
  MapPin,
  Trophy,
  Wrench,
} from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import { formatAed } from "../../lib/formatMoney";
import { themeClasses } from "../../theme/classes";
import { useAuth } from "../auth/AuthContext";
import { isFieldRole, ROLES } from "../../config/rbac";
import { getInquiriesPage } from "../inquiry/services/inquiryApi";
import type { Inquiry } from "../inquiry/services/inquiryTypes";
import DashboardGreeting, { type DashboardPeriod } from "./components/DashboardGreeting";
import DashboardInquiryPanel from "./components/DashboardInquiryPanel";
import DashboardLoading from "./components/DashboardLoading";
import DashboardRecentActivity from "./components/DashboardRecentActivity";
import DashboardRecentInquiriesTable from "./components/DashboardRecentInquiriesTable";
import {
  DashboardChartsRow,
  DashboardInquiryBarChart,
  DashboardInvoiceDonutChart,
  DashboardMonthlyTrendChart,
} from "./components/DashboardRoleCharts";
import DashboardStatCards, { type StatCardData } from "./components/DashboardStatCards";
import {
  barChartFromStatusMap,
  fieldVisitChartFromCounts,
  inquiryPipelineChart,
  pieChartFromBreakdown,
} from "./dashboardChartData";
import {
  fetchDashboardStats,
  type DashboardStats,
  type FieldDashboardStats,
  type OfficeDashboardStats,
  type SalesDashboardStats,
} from "./dashboardApi";

const REFRESH_MS = 5 * 60 * 1000;
const DEFAULT_LOCATIONS = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
];

function isOfficeStats(stats: DashboardStats): stats is OfficeDashboardStats {
  return stats.role === "admin" || stats.role === "manager";
}

function isSalesStats(stats: DashboardStats): stats is SalesDashboardStats {
  return stats.role === "sales";
}

function isFieldStats(stats: DashboardStats): stats is FieldDashboardStats {
  return stats.role === "field";
}

function RoleDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInquiries, setRecentInquiries] = useState<Inquiry[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [location, setLocation] = useState("all");
  const [period, setPeriod] = useState<DashboardPeriod>("year");
  const statsRef = useRef<DashboardStats | null>(null);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  const loadStats = useCallback(async () => {
    if (!user) return;
    const isInitial = !statsRef.current;
    setError(null);
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await fetchDashboardStats({ location, period });
      setStats(data);
    } catch {
      setError("Could not load dashboard. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, location, period]);

  const loadRecentInquiries = useCallback(async () => {
    if (!user) return;
    setInquiriesLoading(true);
    try {
      const data = await getInquiriesPage("", "All", 1, 8);
      setRecentInquiries(data.items);
    } catch {
      setRecentInquiries([]);
    } finally {
      setInquiriesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadStats();
    const timer = window.setInterval(() => {
      void loadStats();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [user, loadStats]);

  useEffect(() => {
    if (!user) return;
    void loadRecentInquiries();
  }, [user, loadRecentInquiries]);

  const locations = stats?.filters?.locations?.length ? stats.filters.locations : DEFAULT_LOCATIONS;

  const view = useMemo(() => {
    if (!user || !stats) return null;

    if (isFieldRole(user.role) && isFieldStats(stats)) {
      const cards: StatCardData[] = [
        {
          title: "Pending visits",
          value: stats.myVisits.pending,
          icon: MapPin,
          hint: "Awaiting approval",
          to: "/inquiry/my-visits",
        },
        {
          title: "Active jobs",
          value: stats.myActiveWorkOrders,
          icon: Wrench,
          hint: "Work orders in progress",
          to: "/workorders",
        },
        {
          title: "Open snags",
          value: stats.myOpenSnags,
          icon: Hammer,
          hint: "On your assigned jobs",
          to: "/workorders",
        },
        {
          title: "Completed this month",
          value: stats.completedThisMonth,
          icon: CheckCircle2,
          hint: "Work orders completed",
          to: "/workorders",
        },
      ];

      return {
        cards,
        charts: (
          <DashboardInquiryBarChart
            title="My visits"
            subtitle="Status breakdown of assigned site visits"
            data={fieldVisitChartFromCounts(stats.myVisits)}
            horizontal
          />
        ),
        activity: stats.recentActivity,
      };
    }

    if (user.role === ROLES.SALES && isSalesStats(stats)) {
      const myInquiryTotal = Object.values(stats.myInquiriesByStatus).reduce((s, n) => s + n, 0);
      const myQuotationTotal = Object.values(stats.myQuotationsByStatus).reduce((s, n) => s + n, 0);

      const cards: StatCardData[] = [
        {
          title: "My inquiries",
          value: myInquiryTotal,
          icon: ClipboardList,
          hint: "Created by you",
          to: "/inquiry/inquiries",
        },
        {
          title: "My quotations",
          value: myQuotationTotal,
          icon: FileCheck,
          hint: "BOQ pipeline",
          to: "/boq",
        },
        {
          title: "Pending approvals",
          value: stats.pendingApprovals,
          icon: AlertTriangle,
          hint: "Awaiting manager sign-off",
          to: "/boq?status=Pending+Approval",
        },
        {
          title: "Won this month",
          value: stats.wonThisMonth,
          icon: Trophy,
          hint: "Inquiries marked won",
          to: "/inquiry/inquiries",
        },
      ];

      return {
        cards,
        charts: (
          <div className="space-y-4">
            <DashboardChartsRow
              left={
                <DashboardInquiryBarChart
                  title="My inquiries by stage"
                  subtitle="Your inquiry pipeline"
                  data={barChartFromStatusMap(stats.myInquiriesByStatus)}
                  horizontal
                />
              }
              right={
                <DashboardMonthlyTrendChart data={stats.monthlyTrend ?? []} />
              }
            />
          </div>
        ),
        activity: stats.recentActivity,
      };
    }

    if (isOfficeStats(stats)) {
      const cards: StatCardData[] = [
        {
          title: "Total inquiries",
          value: stats.totalInquiries,
          icon: ClipboardList,
          hint: "Filtered inquiries",
          to: "/inquiry/inquiries",
        },
        {
          title: "Active work orders",
          value: stats.activeWorkOrders,
          icon: Wrench,
          hint: "Excluding completed or handed over",
          to: "/workorders",
        },
        {
          title: "Outstanding",
          value: formatAed(stats.outstandingInvoicesAmount),
          icon: Banknote,
          hint: "Unpaid invoice balance (AED)",
          to: "/finance/invoices",
        },
        {
          title: "Escalated invoices",
          value: stats.escalatedInvoices,
          icon: AlertTriangle,
          hint: "Requires follow-up",
          to: "/finance/invoices?status=Escalated",
        },
      ];

      const inquiryChart = inquiryPipelineChart(stats.inquiryPipeline);
      const invoiceChart = pieChartFromBreakdown(stats.invoiceStatusBreakdown);

      return {
        cards,
        charts: (
          <div className="space-y-4">
            <DashboardMonthlyTrendChart data={stats.monthlyTrend ?? []} />
            <DashboardChartsRow
              left={<DashboardInquiryPanel chartData={inquiryChart} />}
              right={
                <DashboardInvoiceDonutChart
                  title="Invoice status"
                  subtitle="Breakdown by invoice status"
                  data={invoiceChart}
                />
              }
            />
            <DashboardRecentInquiriesTable
              inquiries={recentInquiries}
              loading={inquiriesLoading}
            />
          </div>
        ),
        activity: stats.recentActivity,
        hideActivity: true,
      };
    }

    return null;
  }, [user, stats, recentInquiries, inquiriesLoading]);

  return (
    <AppShell activeNav="dashboard" flush>
      <div className="mx-auto max-w-[1440px] space-y-4 px-4 py-4 lg:px-6 lg:py-5">
        {loading && !stats ? (
          <DashboardLoading />
        ) : error && !stats ? (
          <div className={`${themeClasses.cardPadding} border-rose-200 bg-rose-50/50`}>
            <p className="text-sm font-medium text-rose-700">{error}</p>
            <button
              type="button"
              className={`${themeClasses.btnPrimary} mt-4`}
              onClick={() => {
                void loadStats();
              }}
            >
              Retry
            </button>
          </div>
        ) : view && user ? (
          <>
            <DashboardGreeting
              user={user}
              location={location}
              period={period}
              locations={locations}
              onLocationChange={setLocation}
              onPeriodChange={setPeriod}
            />
            {error ? (
              <p className="text-xs font-medium text-rose-600">{error}</p>
            ) : null}
            <div
              className={`space-y-4 transition-opacity duration-200 ${refreshing ? "pointer-events-none opacity-60" : "opacity-100"}`}
              aria-busy={refreshing}
            >
              <DashboardStatCards cards={view.cards} />
              {view.charts}
              {"hideActivity" in view && view.hideActivity ? null : (
                <DashboardRecentActivity items={view.activity} />
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-text-muted">No dashboard data available for your role.</p>
        )}
      </div>
    </AppShell>
  );
}

export default RoleDashboardPage;
