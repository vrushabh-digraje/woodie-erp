import { COLORS, PIPELINE_BAR_COLORS } from "../../constants/colors";

export const INQUIRY_PIPELINE_STAGES = [
  { stage: "Pending", key: "Visit Pending Approval" },
  { stage: "Approved", key: "Visit Approved" },
  { stage: "Report ready", key: "Site Report Attached" },
  { stage: "Rejected", key: "Visit Rejected" },
] as const;

export function inquiryCountsFromMap(
  statusMap: Record<string, number> | undefined,
): { name: string; value: number; fill: string }[] {
  return INQUIRY_PIPELINE_STAGES.map((s, index) => ({
    name: s.stage,
    value: statusMap?.[s.key] ?? 0,
    fill: PIPELINE_BAR_COLORS[index % PIPELINE_BAR_COLORS.length],
  }));
}

export const MONTHLY_INQUIRY_TREND = [
  { month: "Jan", count: 0 },
  { month: "Feb", count: 0 },
  { month: "Mar", count: 0 },
  { month: "Apr", count: 0 },
  { month: "May", count: 0 },
  { month: "Jun", count: 0 },
] as const;

export function categoryCountsFromMap(
  statusMap: Record<string, number> | undefined,
): { name: string; value: number; fill: string }[] {
  return INQUIRY_PIPELINE_STAGES.map((s, index) => ({
    name: s.stage,
    value: statusMap?.[s.key] ?? 0,
    fill: PIPELINE_BAR_COLORS[index % PIPELINE_BAR_COLORS.length],
  }));
}

const CHART_PALETTE = [COLORS.brand, COLORS.sidebar.bg, COLORS.sidebar.bg, COLORS.sidebar.bg];
const INVOICE_PALETTE = [COLORS.sidebar.bg, COLORS.brand, COLORS.sidebar.bg, COLORS.sidebar.bg];

export function barChartFromStatusMap(
  statusMap: Record<string, number> | undefined,
): { name: string; value: number; fill: string }[] {
  const entries = Object.entries(statusMap ?? {}).filter(([, count]) => count > 0);
  return entries.map(([name, value], index) => ({
    name,
    value,
    fill: CHART_PALETTE[index % CHART_PALETTE.length],
  }));
}

export function pieChartFromBreakdown(
  rows: { status: string; count: number }[] | undefined,
): { name: string; value: number; fill: string }[] {
  return (rows ?? [])
    .filter((row) => row.count > 0)
    .map((row, index) => ({
      name: row.status,
      value: row.count,
      fill: INVOICE_PALETTE[index % INVOICE_PALETTE.length],
    }));
}

export const FIELD_VISIT_CHART = [
  { name: "Pending", key: "pending" as const },
  { name: "Approved", key: "approved" as const },
  { name: "Completed", key: "completed" as const },
] as const;

export function fieldVisitChartFromCounts(
  visits: { pending: number; approved: number; completed: number } | undefined,
): { name: string; value: number; fill: string }[] {
  return FIELD_VISIT_CHART.map((s, index) => ({
    name: s.name,
    value: visits?.[s.key] ?? 0,
    fill: PIPELINE_BAR_COLORS[index % PIPELINE_BAR_COLORS.length],
  }));
}

export function inquiryPipelineChart(
  statusMap: Record<string, number> | undefined,
): { name: string; value: number; fill: string }[] {
  return inquiryCountsFromMap(statusMap);
}
