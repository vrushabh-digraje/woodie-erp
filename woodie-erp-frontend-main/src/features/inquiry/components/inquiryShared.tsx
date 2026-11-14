import type { ComponentType } from "react";
import { CheckCircle2, CircleDashed, CircleX, Sparkles } from "lucide-react";
import { AppStatCard } from "../../../components/ui/AppStatCard";
import { Link } from "react-router-dom";
import type { ActivityItem, InquiryStatus, Inquiry, SiteReport } from "../services/inquiryTypes";
import { getBoqDisplayStatus } from "../../boq/boqShared";

export const EMPTY_DISPLAY = "-";

export function displayOrEmpty(value: string | undefined | null): string {
  const trimmed = String(value ?? "").trim();
  return trimmed || EMPTY_DISPLAY;
}

const statusShort: Record<InquiryStatus, string> = {
  "Visit Pending Approval": "Site visit acceptance pending",
  "Visit Approved": "Accepted",
  "Visit Rejected": "Rejected",
  "Site Report Attached": "Done",
  Won: "Done",
  Lost: "Lost",
};

export function inquiryStatusShortLabel(status: InquiryStatus | string): string {
  if (status in statusShort) return statusShort[status as InquiryStatus];
  if (status === "Visit Pending Approval") return "Site visit acceptance pending";
  if (status === "Visit Approved") return "Accepted";
  if (status === "Visit Rejected") return "Rejected";
  if (status === "Site Report Attached" || status === "Won") return "Done";
  return String(status || "Unknown");
}

export function inquiryStatusPillClass(status: InquiryStatus | string): string {
  const base = "inline-flex shrink-0 max-w-full rounded-full px-2.5 py-0.5 text-xs font-semibold border";
  switch (status) {
    case "Visit Pending Approval":
    case "Site visit acceptance pending":
      return `${base} bg-amber-50 text-amber-700 border-amber-200`;
    case "Visit Approved":
    case "Accepted":
      return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
    case "Site Report Attached":
    case "Done":
    case "Won":
      return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
    case "Lost":
    case "Visit Rejected":
    case "Rejected":
      return `${base} bg-rose-50 text-rose-700 border-rose-200`;
    default:
      return `${base} bg-slate-100 text-slate-700 border-slate-200`;
  }
}

export function StatusBadge({ status }: { status: InquiryStatus | string; short?: boolean }) {
  const label = inquiryStatusShortLabel(status);
  return (
    <span className={inquiryStatusPillClass(status)} title={String(status)}>
      {label}
    </span>
  );
}

export function isVisitAccepted(status: InquiryStatus | string): boolean {
  return (
    status === "Visit Approved" ||
    status === "Accepted" ||
    status === "Site Report Attached" ||
    status === "Won"
  );
}

export function isSiteVisitDone(item: { status: InquiryStatus | string; siteReport?: SiteReport }): boolean {
  if (item.status === "Site Report Attached" || item.status === "Won") return true;
  if (item.siteReport?.reportSubmittedAt) return true;
  if (item.siteReport?.scopes && item.siteReport.scopes.length > 0) {
    return item.siteReport.scopes.some(
      (s) => Boolean(s.workItems && s.workItems.length > 0) || Boolean(s.measurements && s.measurements.length > 0)
    );
  }
  return false;
}

export function SiteVisitBadge({ item }: { item: Inquiry }) {
  if (!isVisitAccepted(item.status)) {
    return <span className="text-text-muted font-mono text-xs">—</span>;
  }
  const done = isSiteVisitDone(item);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
        done
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${done ? "bg-emerald-500" : "bg-amber-500"}`} />
      {done ? "Done" : "Pending"}
    </span>
  );
}

export function BoqStatusBadge({ item }: { item: Inquiry }) {
  const hasBoq = Boolean(item.boqId || item.boqStatus || item.boqPrepared);
  const visitDone = isVisitAccepted(item.status) && isSiteVisitDone(item);
  const targetUrl = item.boqId ? `/boq/${item.boqId}` : "/boq";

  if (!hasBoq && !visitDone) {
    return (
      <Link
        to="/boq"
        title="Open BOQ tool"
        className="text-text-muted hover:text-ui-primary font-mono text-xs transition cursor-pointer hover:underline px-1 py-0.5"
      >
        —
      </Link>
    );
  }

  const rawStatus = item.boqStatus || (item.boqPrepared ? "Approved" : "Pending");
  const display = getBoqDisplayStatus(rawStatus);

  return (
    <Link
      to={targetUrl}
      title={item.boqId ? `Open BOQ: ${item.boqNumber || "Quotation"}` : "Open BOQ tool"}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition cursor-pointer hover:opacity-90 ${display.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${display.dotClassName || "bg-current"}`} />
      {display.label}
    </Link>
  );
}

export function InquiryStatCard({
  title,
  value,
  detail,
  icon,
  iconIndex = 0,
}: {
  title: string;
  value: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  iconIndex?: number;
}) {
  return (
    <AppStatCard title={title} value={value} subtitle={detail} icon={icon} iconIndex={iconIndex} />
  );
}

export function WorkflowTimeline({ status }: { status: InquiryStatus }) {
  const outcome = status === "Won" || status === "Lost";
  const steps = outcome
    ? [
        { label: "Created", done: true },
        { label: "Site visit", done: true },
        { label: status === "Won" ? "Done" : "Lost", done: true, rejected: status === "Lost" },
      ]
    : [
        { label: "Created", done: true },
        {
          label: status === "Visit Rejected" ? "Rejected" : "Accepted",
          done: status !== "Visit Pending Approval",
          rejected: status === "Visit Rejected",
        },
        { label: "Site report", done: status === "Site Report Attached" },
      ];

  return (
    <div className="space-y-3">
      {steps.map((step) => {
        const Icon = step.rejected ? CircleX : step.done ? CheckCircle2 : CircleDashed;
        return (
          <div key={step.label} className="flex items-center gap-3">
            <span
              className={`rounded-full p-1 ${
                step.rejected
                  ? "bg-rose-100 text-rose-600"
                  : step.done
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <p className={`text-sm ${step.done ? "font-semibold text-slate-900" : "text-slate-600"}`}>{step.label}</p>
          </div>
        );
      })}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
      <Sparkles className="mx-auto mb-2 h-5 w-5 text-[#1DA1F2]" />
      {message}
    </div>
  );
}

export function RejectionBanner({ reason }: { reason: string }) {
  if (!reason.trim()) return null;
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <p className="font-medium">Visit rejected</p>
      <p className="mt-1">{reason}</p>
    </div>
  );
}

const ACTIVITY_DOT: Record<string, string> = {
  "Inquiry Created": "bg-sky-500",
  "Visit Assigned": "bg-violet-500",
  "Visit Approved": "bg-emerald-500",
  "Visit Rejected": "bg-rose-500",
  "Site Report Uploaded": "bg-amber-500",
};

export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  if (!items.length) {
    return (
      <article className="overflow-hidden rounded-lg bg-white ring-1 ring-slate-200/80">
        <div className="border-b border-slate-100 bg-slate-800 px-3 py-2">
          <h3 className="text-[13px] font-bold text-white">Activity timeline</h3>
        </div>
        <p className="px-3 py-4 text-center text-xs text-slate-400">No activity yet</p>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-lg bg-white ring-1 ring-slate-200/80">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-800 px-3 py-2">
        <h3 className="text-[13px] font-bold text-white">Activity timeline</h3>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white">
          {items.length}
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((item, index) => {
          const dot = ACTIVITY_DOT[item.action] ?? "bg-slate-400";
          const when = new Date(item.createdAt);
          const timeLabel = Number.isNaN(when.getTime())
            ? ""
            : when.toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
          return (
            <li key={`${item.action}-${index}`} className="flex gap-2.5 px-3 py-2">
              <span className="relative mt-1.5 flex w-2.5 shrink-0 justify-center">
                <span className={`h-2.5 w-2.5 rounded-full ${dot} ring-2 ring-white`} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <p className="text-[12px] font-semibold leading-tight text-slate-800">{item.action}</p>
                  {timeLabel ? (
                    <time className="shrink-0 text-[10px] tabular-nums text-slate-400">{timeLabel}</time>
                  ) : null}
                </div>
                {item.note ? (
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">{item.note}</p>
                ) : null}
                <p className="mt-0.5 text-[10px] text-slate-400">{item.createdBy}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

