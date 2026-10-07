import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { COLORS } from "../../../constants/colors";
import { panelSurface, viewAllLinkStyle } from "../../../constants/surfaces";
import { DashboardInquiryBarChart } from "./DashboardRoleCharts";
import DashboardSectionHeader from "./DashboardSectionHeader";

type ChartSlice = { name: string; value: number; fill: string };

const panelStyle = panelSurface();

type DashboardInquiryPanelProps = {
  chartData: ChartSlice[];
};

export default function DashboardInquiryPanel({ chartData }: DashboardInquiryPanelProps) {
  return (
    <section className="flex h-full w-full min-w-0 flex-col p-4 lg:p-5" style={panelStyle}>
      <DashboardSectionHeader
        title="Inquiry pipeline"
        subtitle="Counts by inquiry status"
        action={
          <Link
            to="/inquiry/inquiries"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
            style={viewAllLinkStyle()}
          >
            View All
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div
        className="flex min-h-[280px] flex-1 flex-col justify-center p-4"
        style={{
          borderRadius: 8,
          border: `1px solid ${COLORS.page.cardBorder}`,
          backgroundColor: COLORS.badge.pending.bg,
        }}
      >
        <DashboardInquiryBarChart title="" data={chartData} horizontal embedded />
      </div>
    </section>
  );
}
