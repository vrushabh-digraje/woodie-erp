import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Banknote, CheckCircle2, Plus } from "lucide-react";
import { themeClasses } from "../../theme/classes";
import { formatMoney } from "../../lib/formatMoney";
import { getWorkOrderInvoiceSummary } from "./invoiceApi";
import { InvoiceTypeBadge } from "./invoiceShared";
import type { WorkOrderInvoiceSummary } from "./invoiceTypes";

type Props = {
  workOrderId: string;
  /** Highlight this invoice in the sibling list (invoice detail page). */
  currentInvoiceId?: string;
  hideCreate?: boolean;
  title?: string;
};

function PaymentStatusBadge({ status }: { status: string }) {
  const s = status || "Not invoiced";
  const cls =
    s === "Paid"
      ? "bg-emerald-600 text-white"
      : s === "Partially Paid"
        ? "bg-amber-500 text-white"
        : s === "Unpaid"
          ? "bg-rose-600 text-white"
          : "bg-slate-500 text-white";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${cls}`}
    >
      {s === "Paid" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      {s}
    </span>
  );
}

function Stat({
  label,
  value,
  accent = "#2A4A7A",
  hint,
}: {
  label: string;
  value: string;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg bg-white ring-1 ring-slate-300/90">
      <div className="px-2.5 py-1.5" style={{ background: accent }}>
        <p className="text-[10px] font-bold uppercase tracking-wide text-white">{label}</p>
      </div>
      <div className="px-2.5 py-2">
        <p className="text-sm font-semibold tabular-nums text-text-primary">{value}</p>
        {hint ? <p className="mt-0.5 text-[10px] text-text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}

export default function WorkOrderInvoicesPanel({
  workOrderId,
  currentInvoiceId,
  hideCreate = false,
  title = "Payment Overview",
}: Props) {
  const [summary, setSummary] = useState<WorkOrderInvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await getWorkOrderInvoiceSummary(workOrderId));
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className={`${themeClasses.card} p-4`}>
        <p className="text-sm text-text-muted">Loading payments…</p>
      </section>
    );
  }
  if (!summary) return null;

  const contractEx = summary.contractExTax ?? 0;
  const remaining = summary.remainingToInvoice ?? 0;
  const invoicedEx = summary.invoicedExTax ?? 0;
  const canCreate =
    summary.canCreateInvoice !== false && !summary.fullyPaid && (summary.invoiceCount ?? 0) === 0;
  const primary =
    summary.invoices.find((i) => i._id === summary.primaryInvoiceId) ||
    summary.invoices.find((i) => i._id === currentInvoiceId) ||
    summary.invoices[0] ||
    null;
  const primaryId = primary?._id || summary.primaryInvoiceId || null;
  const paymentStatus = primary?.status || summary.paymentStatus || "Not invoiced";
  const paidPct = summary.paidPercent ?? 0;

  const headerAction = !hideCreate ? (
    canCreate ? (
      <Link
        to={`/finance/invoices/new?workOrderId=${workOrderId}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-ui-primary shadow-sm transition hover:bg-white/90"
      >
        <Plus className="h-3.5 w-3.5" />
        Create invoice
      </Link>
    ) : summary.fullyPaid ? null : primaryId ? (
      <Link
        to={`/finance/invoices/${primaryId}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-400"
      >
        <Banknote className="h-3.5 w-3.5" />
        Record payment
      </Link>
    ) : null
  ) : null;

  return (
    <section className={`${themeClasses.card} overflow-hidden p-0 ring-1 ring-slate-300/90`}>
      <div className="bg-ui-primary px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-white sm:text-base">{title}</h2>
            <p className="mt-0.5 text-[11px] text-white/70 sm:text-xs">
              {summary.quotationNumber ? `Quotation ${summary.quotationNumber}` : "No quotation linked"}
              {summary.quotationNumber ? " · One invoice · payments on same record" : ""}
            </p>
            {primary ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-white">{primary.invoiceNumber}</span>
                <InvoiceTypeBadge type={primary.type} />
                <PaymentStatusBadge status={paymentStatus} />
              </div>
            ) : (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <PaymentStatusBadge status={paymentStatus} />
              </div>
            )}
          </div>
          {headerAction}
        </div>
      </div>

      <div className="space-y-3 px-3 py-3 sm:px-4">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold text-text-secondary">
            <span>Collected vs contract</span>
            <span className="tabular-nums">{paidPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${paidPct}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-text-muted">
            {summary.advanceCollected
              ? "Advance / payments recorded — remaining balance decreases after each payment."
              : "No payments yet. Create the contract invoice, then record advance and later payments on it."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat
            label="1. Contract (ex-tax)"
            value={formatMoney(contractEx)}
            accent="#3B5BDB"
            hint={
              summary.contractInclTax
                ? `Incl. VAT ${formatMoney(summary.contractInclTax)}`
                : undefined
            }
          />
          <Stat
            label="2. Invoiced (ex-tax)"
            value={formatMoney(invoicedEx)}
            accent="#2A4A7A"
            hint={`Incl. VAT ${formatMoney(summary.totalInvoiced)}`}
          />
          <Stat
            label="3. Still to invoice"
            value={formatMoney(remaining)}
            accent={remaining > 0 ? "#C92A2A" : "#2F9E44"}
            hint="Should stay 0 after first invoice"
          />
          <Stat
            label="4. Collected"
            value={formatMoney(summary.totalPaid)}
            accent="#2F9E44"
            hint={summary.advanceCollected ? "Includes advance" : "No cash yet"}
          />
          <Stat
            label="5. Still due"
            value={formatMoney(summary.outstanding)}
            accent={summary.outstanding > 0 ? "#E8590C" : "#2F9E44"}
            hint="Open invoice balance"
          />
          <Stat
            label="Payment status"
            value={paymentStatus}
            accent="#5C7CFA"
            hint={
              primary
                ? `${primary.invoiceNumber} · ${primary.type}`
                : "No invoice yet"
            }
          />
        </div>
      </div>
    </section>
  );
}
