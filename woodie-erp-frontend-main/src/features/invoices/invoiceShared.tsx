import type { InvoiceStatus, InvoiceType } from "./invoiceTypes";

const statusStyles: Record<InvoiceStatus, string> = {
  Draft: "bg-slate-100 text-slate-700",
  "Awaiting Payment": "bg-amber-100 text-amber-800",
  "Partially Paid": "bg-orange-100 text-orange-800",
  Paid: "bg-emerald-100 text-emerald-800",
  Escalated: "bg-rose-100 text-rose-800",
  Cancelled: "bg-slate-200 text-slate-500",
};

const typeStyles: Record<InvoiceType, string> = {
  Advance: "bg-sky-100 text-sky-800",
  Progress: "bg-violet-100 text-violet-800",
  Final: "bg-indigo-100 text-indigo-800",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex w-fit max-w-full shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold leading-none ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

export function InvoiceTypeBadge({ type }: { type: InvoiceType }) {
  return (
    <span
      className={`inline-flex w-fit shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold leading-none ${typeStyles[type]}`}
    >
      {type}
    </span>
  );
}

export function isInvoiceOverdue(dueDate?: string | null, status?: InvoiceStatus) {
  if (!dueDate || status === "Paid" || status === "Cancelled" || status === "Draft") return false;
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today && (status === "Awaiting Payment" || status === "Partially Paid" || status === "Escalated");
}
