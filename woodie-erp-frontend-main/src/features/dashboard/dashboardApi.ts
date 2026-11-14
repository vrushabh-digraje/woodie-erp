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

export type CompanyComparisonItem = {
  id: string;
  name: string;
  inquiries: number;
  quotations: number;
  quotationValue: number;
  workOrders: number;
  activeWorkOrders: number;
  revenue: number;
};

export type MasterDashboardStats = {
  role: "master_admin";
  companyFilter: string;
  companies: { id: string; name: string; shortName?: string; legalName: string }[];
  filters?: DashboardFiltersMeta;
  summary: {
    totalInquiries: number;
    totalSiteVisits: number;
    pendingVisits: number;
    approvedVisits: number;
    completedVisits: number;
    totalQuotations: number;
    pendingApprovalQuotations: number;
    approvedQuotations: number;
    wonQuotations: number;
    quotationValueAed: number;
    totalWorkOrders: number;
    activeWorkOrders: number;
    completedWorkOrders: number;
    totalInvoicedAed: number;
    totalPaidAed: number;
  };
  inquiryByStatus: StatusCountMap;
  siteVisitBreakdown: StatusCountMap;
  quotationByStatus: StatusCountMap;
  workOrdersByStatus: StatusCountMap;
  companyComparison: CompanyComparisonItem[];
  recentActivity: DashboardActivityItem[];
};

export type DrilldownRecord = {
  id: string;
  number: string;
  projectName: string;
  clientName: string;
  assignedPerson?: string;
  status: string;
  companyId: string;
  companyName: string;
  value?: number;
  date?: string;
  time?: string;
  link: string;
};

export type DrilldownResponse = {
  category: string;
  status: string;
  companyId: string;
  total: number;
  records: DrilldownRecord[];
};

export type DashboardStats =
  | OfficeDashboardStats
  | SalesDashboardStats
  | FieldDashboardStats
  | MasterDashboardStats;

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

export async function fetchMasterDashboardStats(params?: {
  companyId?: string;
  period?: "month" | "year" | "all";
  location?: string;
}) {
  const response = await api.get<MasterDashboardStats>("/dashboard/master", {
    params: {
      companyId: params?.companyId ?? "all",
      period: params?.period ?? "year",
      location: params?.location ?? "all",
    },
  });
  return response.data;
}

export async function fetchMasterDrilldown(params: {
  category: string;
  status?: string;
  companyId?: string;
}) {
  const response = await api.get<DrilldownResponse>("/dashboard/drilldown", {
    params: {
      category: params.category,
      status: params.status ?? "all",
      companyId: params.companyId ?? "all",
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
