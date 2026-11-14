import type { ComponentType } from "react";
import { CheckCircle2, Circle, Clock3, FileEdit, ListChecks, XCircle } from "lucide-react";
import type { BoqCategory, QuotationStatus } from "./boqTypes";

export type { BoqCategory, QuotationStatus } from "./boqTypes";

export const categoryBadgeStyles: Record<BoqCategory, string> = {
  Material: "bg-[#1DA1F2]/12 text-[#1DA1F2]",
  Labor: "bg-[#D9A15B]/15 text-[#B7791F]",
  Equipment: "bg-indigo-100 text-indigo-700",
  Service: "bg-emerald-100 text-emerald-700",
};

export const statusBadgeStyles: Record<QuotationStatus, string> = {
  "BOQ In Progress": "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
  "Quotation Draft": "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
  "Pending Approval": "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  Approved: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  Rejected: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
  "Revision Requested": "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
  "Quotation Sent": "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  Negotiation: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  Won: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  Lost: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/20",
};

export const WORKFLOW_STEPS: QuotationStatus[] = [
  "BOQ In Progress",
  "Quotation Draft",
  "Pending Approval",
];

export { formatAed, formatMoney } from "../../lib/formatMoney";

export function CategoryBadge({ category }: { category: BoqCategory }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${categoryBadgeStyles[category]}`}>
      {category}
    </span>
  );
}

export function getBoqDisplayStatus(status: QuotationStatus | string): {
  label: string;
  className: string;
  dotClassName?: string;
} {
  switch (status) {
    case "Approved":
    case "Quotation Sent":
    case "Negotiation":
    case "Won":
    case "BOQ Done":
      return {
        label: "BOQ Done",
        className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        dotClassName: "bg-emerald-500",
      };
    case "Pending Approval":
    case "Pending":
    case "BOQ Pending":
      return {
        label: "Pending",
        className: "bg-amber-50 text-amber-700 border border-amber-200",
        dotClassName: "bg-amber-500",
      };
    case "BOQ In Progress":
    case "Quotation Draft":
    case "Revision Requested":
    case "BOQ Progress":
    case "BOQ Processing":
    case "In Progress":
      return {
        label: "BOQ Progress",
        className: "bg-sky-50 text-sky-700 border border-sky-200",
        dotClassName: "bg-sky-500",
      };
    case "Rejected":
      return {
        label: "Rejected",
        className: "bg-rose-50 text-rose-700 border border-rose-200",
        dotClassName: "bg-rose-500",
      };
    case "Lost":
      return {
        label: "Lost",
        className: "bg-slate-100 text-slate-700 border border-slate-200",
        dotClassName: "bg-slate-400",
      };
    default:
      return {
        label: status || "—",
        className: "bg-slate-100 text-slate-700 border border-slate-200",
        dotClassName: "bg-slate-400",
      };
  }
}

export function StatusBadge({
  status,
  showOriginal = false,
}: {
  status: QuotationStatus | string;
  showOriginal?: boolean;
}) {
  const meta = getBoqDisplayStatus(status);
  return (
    <span
      title={`Stage: ${status}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${meta.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClassName || "bg-current"}`} />
      <span>{meta.label}</span>
      {showOriginal && status !== meta.label ? (
        <span className="ml-1 text-[10px] font-normal opacity-75">({status})</span>
      ) : null}
    </span>
  );
}

export function isQuotationSubmitted(quotation?: {
  sentAt?: string | null;
  status?: QuotationStatus | string;
} | null): boolean {
  if (!quotation) return false;
  return Boolean(
    quotation.sentAt ||
      ["Quotation Sent", "Negotiation", "Won"].includes(String(quotation.status || "")),
  );
}

export function QuotationSubmissionBadge({
  quotation,
  onToggle,
  canEdit = false,
  loading = false,
}: {
  quotation: {
    _id: string;
    sentAt?: string | null;
    status: QuotationStatus | string;
    quotationNumber?: string;
  };
  onToggle?: (targetSubmitted: boolean) => void | Promise<void>;
  canEdit?: boolean;
  loading?: boolean;
}) {
  const submitted = isQuotationSubmitted(quotation);

  if (!canEdit || !onToggle) {
    return (
      <span
        title={
          submitted && quotation.sentAt
            ? `Submitted at: ${new Date(quotation.sentAt).toLocaleString()}`
            : undefined
        }
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
          submitted
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
            : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${submitted ? "bg-emerald-500" : "bg-slate-400"}`}
        />
        {submitted ? "Submitted" : "Not Submitted"}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!loading) {
          void onToggle(!submitted);
        }
      }}
      disabled={loading}
      title={
        submitted
          ? `Quotation submitted${
              quotation.sentAt ? ` on ${new Date(quotation.sentAt).toLocaleDateString()}` : ""
            }. Click to mark as Not Submitted.`
          : "Click to mark quotation as Submitted to client"
      }
      className={`group inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-offset-1 ${
        submitted
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 hover:bg-emerald-100 focus:ring-emerald-500"
          : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 hover:bg-amber-100 focus:ring-amber-500"
      } ${loading ? "opacity-60 cursor-wait" : ""}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${submitted ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}
      />
      <span>{submitted ? "Submitted" : "Not Submitted"}</span>
      <span className="text-[10px] text-text-muted opacity-70 group-hover:opacity-100">✎</span>
    </button>
  );
}

export function PricingCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <article className="app-card min-w-0 overflow-hidden border-t-[3px] border-t-ui-primary p-4 sm:p-5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-medium leading-snug text-text-muted">{title}</p>
        <span className="shrink-0 rounded-lg bg-ui-primary-light p-2 text-ui-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="break-words text-lg font-semibold tabular-nums leading-tight text-text-primary sm:text-xl lg:text-2xl [overflow-wrap:anywhere]">
        {value}
      </p>
      <p className="mt-1 break-words text-xs leading-snug text-text-muted sm:text-sm">{detail}</p>
    </article>
  );
}

function stepIndex(status: QuotationStatus): number {
  if (status === "BOQ In Progress") return 0;
  if (status === "Quotation Draft" || status === "Revision Requested") return 1;
  if (status === "Pending Approval") return 2;
  if (status === "Approved") return 3;
  if (status === "Rejected") return 2;
  return 0;
}

export function ApprovalFlow({ status }: { status: QuotationStatus }) {
  const current = stepIndex(status);
  const terminal =
    status === "Approved" || status === "Rejected" || status === "Revision Requested";

  const steps: { label: string; icon: typeof Circle }[] = [
    { label: "BOQ preparation", icon: ListChecks },
    { label: "Quotation generation", icon: FileEdit },
    { label: "Manager approval", icon: Clock3 },
  ];

  if (status === "Approved") steps.push({ label: "Approved", icon: CheckCircle2 });
  if (status === "Rejected") steps.push({ label: "Rejected", icon: XCircle });
  if (status === "Revision Requested") steps.push({ label: "Revision Requested", icon: FileEdit });

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const isTerminalStep = terminal && index === steps.length - 1;
        const isDone = !isTerminalStep && index < current;
        const isCurrent = isTerminalStep || index === current;
        const Icon = step.icon;
        const isRejected = step.label === "Rejected";

        return (
          <div key={step.label} className="flex items-center gap-3">
            <span
              className={`rounded-full p-1 ${
                isRejected
                  ? "bg-rose-100 text-rose-600"
                  : isDone
                    ? "bg-emerald-100 text-emerald-600"
                    : isCurrent
                      ? "bg-[#D9A15B]/15 text-[#B7791F]"
                      : "bg-slate-100 text-slate-400"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <p className={`text-sm ${isCurrent ? "font-semibold text-slate-900" : "text-slate-600"}`}>{step.label}</p>
          </div>
        );
      })}
    </div>
  );
}









