import { ClipboardList, FileText, Wrench } from "lucide-react";
import { COLORS } from "../../../constants/colors";
import { panelSurface } from "../../../constants/surfaces";
import type { DashboardActivityItem } from "../dashboardApi";
import DashboardSectionHeader from "./DashboardSectionHeader";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const sourceTone: Record<DashboardActivityItem["source"], { bg: string; color: string }> = {
  inquiry: COLORS.card.icon2,
  workorder: COLORS.card.icon1,
  invoice: COLORS.card.icon4,
};

const panelStyle = panelSurface();

function ActivityIcon({ source }: { source: DashboardActivityItem["source"] }) {
  const className = "h-4 w-4";
  if (source === "workorder") return <Wrench className={className} />;
  if (source === "invoice") return <FileText className={className} />;
  return <ClipboardList className={className} />;
}

type DashboardRecentActivityProps = {
  items: DashboardActivityItem[];
};

export default function DashboardRecentActivity({ items }: DashboardRecentActivityProps) {
  return (
    <section className="p-4 lg:p-5" style={panelStyle}>
      <DashboardSectionHeader
        title="Recent activity"
        subtitle="Latest updates across inquiries, work orders, and invoices"
      />

      {items.length === 0 ? (
        <p className="text-sm" style={{ color: COLORS.text.muted }}>
          No recent activity yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => {
            const tone = sourceTone[item.source];
            return (
              <li
                key={`${item.source}-${item.createdAt}-${index}`}
                className="flex gap-3 px-4 py-3 transition"
                style={{
                  borderRadius: 8,
                  border: `1px solid ${COLORS.page.cardBorder}`,
                  backgroundColor: COLORS.badge.pending.bg,
                }}
              >
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center"
                  style={{
                    backgroundColor: tone.bg,
                    color: tone.color,
                    borderRadius: 8,
                  }}
                >
                  <ActivityIcon source={item.source} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold" style={{ color: COLORS.text.primary }}>
                    {item.action}
                  </p>
                  {item.note ? (
                    <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: COLORS.text.muted }}>
                      {item.note}
                    </p>
                  ) : null}
                  <p className="mt-1.5 text-[11px]" style={{ color: COLORS.text.muted }}>
                    {item.createdBy} · {timeAgo(item.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
