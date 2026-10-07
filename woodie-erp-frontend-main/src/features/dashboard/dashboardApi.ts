import { api } from "../../lib/apiClient";

export type StatusCountMap = Record<string, number>;

export type DashboardActivityItem = {
  source: "inquiry" | "workorder" | "invoice";
  action: string;
  note: string;
  createdAt: string;
  createdBy: string;
};

export type InvoiceStatusSlice = { status: string; count: number };

export type DashboardFiltersMeta = {
  period: "month" | "year" | "all";
  location: string;
  locations: string[];
};

export type MonthlyTrendPoint = {
  month: string;
  inquiries: number;
  workOrders: number;
};

export type OfficeDashboardStats = {
  role: "admin" | "manager";
  totalInquiries: number;
  activeWorkOrders: number;
  outstandingInvoicesAmount: number;
  escalatedInvoices: number;
  inquiryPipeline: StatusCountMap;
  invoiceStatusBreakdown: InvoiceStatusSlice[];
  monthlyTrend?: MonthlyTrendPoint[];
  filters?: DashboardFiltersMeta;
  recentActivity: DashboardActivityItem[];
};

export type SalesDashboardStats = {
  role: "sales";
  myInquiriesByStatus: StatusCountMap;
  myQuotationsByStatus: StatusCountMap;
  pendingApprovals: number;
  wonThisMonth: number;
  monthlyTrend?: MonthlyTrendPoint[];
  filters?: DashboardFiltersMeta;
  recentActivity: DashboardActivityItem[];
};

export type FieldDashboardStats = {
  role: "field";
  myVisits: { pending: number; approved: number; completed: number };
  myActiveWorkOrders: number;
  myOpenSnags: number;
  completedThisMonth: number;
  filters?: DashboardFiltersMeta;
  recentActivity: DashboardActivityItem[];
};

export type DashboardStats = OfficeDashboardStats | SalesDashboardStats | FieldDashboardStats;

export async function fetchDashboardStats(params?: {
  location?: string;
  period?: "month" | "year" | "all";
}) {
  const response = await api.get<DashboardStats>("/dashboard/stats", {
    params: {
      location: params?.location ?? "all",
      period: params?.period ?? "year",
    },
  });
  return response.data;
}

/** @deprecated Use fetchDashboardStats */
export async function fetchAdminDashboard() {
  return fetchDashboardStats() as Promise<OfficeDashboardStats>;
}

/** @deprecated Use fetchDashboardStats */
export async function fetchSalesDashboard() {
  return fetchDashboardStats() as Promise<SalesDashboardStats>;
}

/** @deprecated Use fetchDashboardStats */
export async function fetchEngineerDashboard() {
  return fetchDashboardStats() as Promise<FieldDashboardStats>;
}

export const fetchFieldDashboard = fetchEngineerDashboard;

/** @deprecated Use fetchDashboardStats */
export async function fetchManagerDashboard() {
  return fetchDashboardStats() as Promise<OfficeDashboardStats>;
}
