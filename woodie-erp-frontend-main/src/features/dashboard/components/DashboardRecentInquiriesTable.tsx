import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { COLORS } from "../../../constants/colors";
import { panelSurface, tableHeadSurface, viewAllLinkStyle } from "../../../constants/surfaces";
import type { Inquiry } from "../../inquiry/services/inquiryTypes";
import { inquiryStatusShortLabel } from "../../inquiry/components/inquiryShared";
import { inquiryStatusBadgeColors } from "../dashboardStatusBadge";
import DashboardSectionHeader from "./DashboardSectionHeader";

function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

type DashboardRecentInquiriesTableProps = {
  inquiries: Inquiry[];
  loading?: boolean;
};

export default function DashboardRecentInquiriesTable({
  inquiries,
  loading = false,
}: DashboardRecentInquiriesTableProps) {
  return (
    <section className="p-4 lg:p-5" style={panelSurface()}>
      <DashboardSectionHeader
        title="Recent inquiries"
        subtitle="Latest inquiries across the pipeline"
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

      {loading ? (
        <p className="text-sm" style={{ color: COLORS.text.muted }}>
          Loading inquiries…
        </p>
      ) : inquiries.length === 0 ? (
        <p className="text-sm" style={{ color: COLORS.text.muted }}>
          No inquiries yet.
        </p>
      ) : (
        <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-full text-left text-sm">
              <thead>
                <tr style={tableHeadSurface()}>
                  {["Client", "Inquiry", "Category", "Status"].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] first:pl-5 last:pr-5"
                      style={{ color: COLORS.sidebar.activeText }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inquiries.map((row) => {
                  const badge = inquiryStatusBadgeColors(row.status);
                  return (
                    <tr
                      key={row._id}
                      className="transition-colors hover:bg-[#f8fafc]"
                      style={{ borderTop: `1px solid ${COLORS.page.cardBorder}` }}
                    >
                      <td className="px-4 py-3 first:pl-5 last:pr-5">
                        <Link
                          to={`/inquiry/inquiries/${row._id}`}
                          className="flex items-center gap-2.5 font-medium"
                          style={{ color: COLORS.text.primary }}
                        >
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                            style={{ backgroundColor: COLORS.sidebar.bg, color: COLORS.sidebar.activeText }}
                          >
                            {clientInitials(row.clientName)}
                          </span>
                          <span className="truncate">{row.clientName}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 first:pl-5 last:pr-5">
                        <span className="font-mono text-xs font-semibold" style={{ color: COLORS.brand }}>
                          {row.inquiryNumber}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-xs first:pl-5 last:pr-5"
                        style={{ color: COLORS.text.secondary }}
                      >
                        {row.category}
                      </td>
                      <td className="px-4 py-3 first:pl-5 last:pr-5">
                        <span
                          className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          style={{ backgroundColor: badge.bg, color: badge.color }}
                        >
                          {inquiryStatusShortLabel(row.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </div>
      )}
    </section>
  );
}
