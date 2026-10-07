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
  "BOQ In Progress": "bg-gray-100 text-gray-600",
  "Quotation Draft": "bg-gray-100 text-gray-600",
  "Pending Approval": "bg-gray-100 text-gray-600",
  Approved: "bg-blue-100 text-blue-700",
  Rejected: "bg-gray-100 text-gray-600",
  "Revision Requested": "bg-gray-100 text-gray-600",
  "Quotation Sent": "bg-purple-100 text-purple-700",
  Negotiation: "bg-amber-100 text-amber-700",
  Won: "bg-green-100 text-green-700",
  Lost: "bg-red-100 text-red-700",
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

export function StatusBadge({ status }: { status: QuotationStatus }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusBadgeStyles[status]}`}>
      {status}
    </span>
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









