import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, Banknote, Loader2 } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import { BoqFeedbackPopup, useBoqFeedback } from "../boq/boqFeedback";
import { themeClasses } from "../../theme/classes";
import { formatMoney } from "../../lib/formatMoney";
import { openSnagCount } from "../workorders/workOrderShared";
import { getWorkOrderById, getWorkOrders } from "../workorders/workOrderApi";
import type { WorkOrder } from "../workorders/workOrderTypes";
import { createInvoice, getWorkOrderInvoiceSummary } from "./invoiceApi";
import { INVOICE_TYPES, type InvoiceType, type WorkOrderInvoiceSummary } from "./invoiceTypes";

const WO_PICK_STATUSES = [
  "Scheduled",
  "In Progress",
  "On Hold",
  "Snagging",
  "Completed",
  "Handed Over",
];

function contractExTax(summary: WorkOrderInvoiceSummary | null, fallbackApproved: number) {
  if (summary && typeof summary.contractExTax === "number" && summary.contractExTax > 0) {
    return summary.contractExTax;
  }
  return Math.max(0, fallbackApproved || 0);
}

function CreateInvoicePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  /** Present when opened from work order details — lock to that WO only. */
  const lockedWorkOrderId = params.get("workOrderId")?.trim() || "";
  const isLockedToWorkOrder = Boolean(lockedWorkOrderId);

  const [workOrderOptions, setWorkOrderOptions] = useState<WorkOrder[]>([]);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(lockedWorkOrderId);
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [summary, setSummary] = useState<WorkOrderInvoiceSummary | null>(null);
  const [type, setType] = useState<InvoiceType>("Advance");
  const [taxPercent, setTaxPercent] = useState("5");
  const [dueDate, setDueDate] = useState("");
  const [loadingList, setLoadingList] = useState(!isLockedToWorkOrder);
  const [loadingOrder, setLoadingOrder] = useState(Boolean(lockedWorkOrderId));
  const [busy, setBusy] = useState(false);
  const { msg, notifyOk, notifyErr, dismiss } = useBoqFeedback();

  useEffect(() => {
    if (isLockedToWorkOrder) {
      setSelectedWorkOrderId(lockedWorkOrderId);
    }
  }, [isLockedToWorkOrder, lockedWorkOrderId]);

  useEffect(() => {
    const id = isLockedToWorkOrder ? lockedWorkOrderId : selectedWorkOrderId;
    if (!id) {
      setOrder(null);
      setSummary(null);
      setLoadingOrder(false);
      return;
    }
    let cancelled = false;
    setLoadingOrder(true);
    void Promise.all([getWorkOrderById(id), getWorkOrderInvoiceSummary(id)])
      .then(([wo, sum]) => {
        if (cancelled) return;
        setOrder(wo);
        setSummary(sum);
        setType("Advance");
        if (typeof sum.taxPercent === "number" && Number.isFinite(sum.taxPercent)) {
          setTaxPercent(String(sum.taxPercent));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOrder(null);
          setSummary(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOrder(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLockedToWorkOrder, lockedWorkOrderId, selectedWorkOrderId]);

  useEffect(() => {
    if (isLockedToWorkOrder) {
      setLoadingList(false);
      return;
    }
    let cancelled = false;
    setLoadingList(true);
    void getWorkOrders("", "All")
      .then((rows) => {
        if (!cancelled) {
          setWorkOrderOptions(rows.filter((wo) => WO_PICK_STATUSES.includes(wo.status)));
        }
      })
      .catch((err) => {
        if (!cancelled) notifyErr(err, "Could not load work orders.");
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLockedToWorkOrder, notifyErr]);

  const contract = useMemo(
    () => contractExTax(summary, order?.approvedAmount || 0),
    [order, summary],
  );

  const taxPreview = useMemo(() => {
    const amt = contract;
    const tax = Number(taxPercent) || 0;
    const taxAmount = Math.round(((amt * tax) / 100) * 100) / 100;
    return { taxAmount, total: Math.round((amt + taxAmount) * 100) / 100 };
  }, [contract, taxPercent]);

  const openSnags = order ? openSnagCount(order.snags) : 0;
  const finalBlocked = type === "Final" && openSnags > 0;
  const activeWorkOrderId = isLockedToWorkOrder ? lockedWorkOrderId : selectedWorkOrderId;
  const existingInvoiceId = summary?.primaryInvoiceId || summary?.invoices?.[0]?._id;
  const alreadyHasInvoice = (summary?.invoiceCount ?? 0) > 0 || Boolean(existingInvoiceId);
  const fullyPaid = Boolean(summary?.fullyPaid);

  function handleWorkOrderChange(id: string) {
    if (isLockedToWorkOrder) return;
    setSelectedWorkOrderId(id);
    setOrder(null);
    setSummary(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeWorkOrderId || finalBlocked || fullyPaid) return;
    // Existing under-billed invoice may be expanded; brand-new create needs contract amount.
    if (!alreadyHasInvoice && contract <= 0) {
      notifyErr(new Error("amt"), "Work order has no contract amount.");
      return;
    }
    if (alreadyHasInvoice && (summary?.remainingToInvoice ?? 0) <= 0.009) {
      if (existingInvoiceId) navigate(`/finance/invoices/${existingInvoiceId}`);
      return;
    }
    setBusy(true);
    dismiss();
    try {
      const inv = await createInvoice({
        workOrderId: activeWorkOrderId,
        type,
        amount: contract,
        taxPercent: Number(taxPercent) || 5,
        dueDate: dueDate || undefined,
      });
      notifyOk(
        alreadyHasInvoice
          ? `${inv.invoiceNumber} updated to full contract.`
          : `${inv.invoiceNumber} created for full contract. Record payments on the invoice.`,
      );
      setTimeout(() => navigate(`/finance/invoices/${inv._id}`), 600);
    } catch (err: unknown) {
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { existingInvoiceId?: string; message?: string } } }).response
              ?.data
          : undefined;
      if (data?.existingInvoiceId) {
        notifyErr(err, data.message || "Invoice already exists — opening it.");
        setTimeout(() => navigate(`/finance/invoices/${data.existingInvoiceId}`), 700);
      } else {
        notifyErr(err, "Could not create invoice.");
      }
    } finally {
      setBusy(false);
    }
  }

  const backHref = isLockedToWorkOrder ? `/workorders/${lockedWorkOrderId}` : "/finance/invoices";
  const backLabel = isLockedToWorkOrder ? "Back to work order" : "Back to invoices";

  return (
    <AppShell activeNav="finance" pageTitle="Create invoice">
      <BoqFeedbackPopup msg={msg} onDismiss={dismiss} />
      <div className="mx-auto max-w-xl space-y-4">
        <Link to={backHref} className="text-sm text-text-muted hover:text-text-primary">
          {backLabel}
        </Link>
        <section className={themeClasses.cardPadding}>
          <h2 className="mb-4 text-base font-semibold">New invoice</h2>

          {isLockedToWorkOrder ? (
            <div className="mb-4 rounded-lg border border-surface-border-light bg-surface-muted/40 px-3 py-2.5 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Work order</p>
              {loadingOrder && !order ? (
                <p className="mt-1 text-text-muted">Loading…</p>
              ) : order ? (
                <>
                  <p className="mt-0.5 font-semibold text-text-primary">
                    {order.workOrderNumber}
                    <span className="ml-2 text-xs font-medium text-text-secondary">· {order.status}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {order.clientName}
                    {order.projectName ? ` · ${order.projectName}` : ""}
                    {contract > 0 ? ` · Contract (ex-tax) ${formatMoney(contract)}` : ""}
                    {summary?.contractInclTax
                      ? ` · Incl. VAT ${formatMoney(summary.contractInclTax)}`
                      : ""}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-rose-600">Work order could not be loaded.</p>
              )}
            </div>
          ) : (
            <label className="mb-4 block text-sm">
              <span className="mb-1 block font-medium">Work order</span>
              {loadingList ? (
                <p className="text-text-muted">Loading...</p>
              ) : (
                <select
                  value={selectedWorkOrderId}
                  onChange={(e) => handleWorkOrderChange(e.target.value)}
                  className={`${themeClasses.select} w-full`}
                >
                  <option value="">Select work order…</option>
                  {workOrderOptions.map((wo) => (
                    <option key={wo._id} value={wo._id}>
                      {wo.workOrderNumber} · {wo.status}
                      {wo.clientName ? ` · ${wo.clientName}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </label>
          )}

          {loadingOrder && !isLockedToWorkOrder ? (
            <p className="text-sm text-text-muted">Loading work order…</p>
          ) : null}

          {order && !loadingOrder && alreadyHasInvoice ? (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
              <p className="font-semibold">Invoice already exists for this work order</p>
              <p className="text-xs leading-relaxed text-amber-900/90">
                Additional cash (advance, progress, balance) must be recorded as payments on the
                existing invoice — not as a new invoice. Contract total does not change.
              </p>
              {(summary?.remainingToInvoice ?? 0) > 0.009 ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSubmit({ preventDefault() {} } as FormEvent)}
                  className={`${themeClasses.btnSecondary} inline-flex w-full justify-center sm:w-auto`}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Expand invoice to full contract
                </button>
              ) : null}
              {existingInvoiceId ? (
                <Link
                  to={`/finance/invoices/${existingInvoiceId}`}
                  className={`${themeClasses.btnNavy} inline-flex w-full justify-center sm:w-auto`}
                >
                  <Banknote className="h-4 w-4" />
                  Open invoice & record payment
                </Link>
              ) : null}
            </div>
          ) : null}

          {order && !loadingOrder && fullyPaid && !alreadyHasInvoice ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Work order is fully paid — no further invoices can be created.
            </p>
          ) : null}

          {order && !loadingOrder && !alreadyHasInvoice && !fullyPaid ? (
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className={`space-y-4 ${isLockedToWorkOrder ? "" : "border-t pt-4"}`}
            >
              {!isLockedToWorkOrder ? (
                <p className="text-sm text-text-muted">
                  {order.clientName}
                  {contract > 0 ? ` · Contract (ex-tax) ${formatMoney(contract)}` : ""}
                </p>
              ) : null}

              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-950">
                <p className="font-semibold">How billing works</p>
                <p className="mt-1 leading-relaxed text-sky-900/90">
                  One invoice is created for the <strong>full contract</strong>. Record the advance
                  and any later payments on that same invoice until the balance is{" "}
                  <strong>100% collected</strong>. Creating another invoice is blocked once this
                  record exists.
                </p>
              </div>

              {summary ? (
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-surface-border-light bg-surface-muted/30 p-2.5 text-xs sm:grid-cols-3">
                  <div>
                    <p className="text-text-muted">Contract ex-tax</p>
                    <p className="font-semibold tabular-nums">{formatMoney(contract)}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">Incl. VAT</p>
                    <p className="font-semibold tabular-nums">
                      {formatMoney(summary.contractInclTax)}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted">Status</p>
                    <p className="font-semibold">{summary.paymentStatus || "Not invoiced"}</p>
                  </div>
                </div>
              ) : null}

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Label / type</span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as InvoiceType)}
                  className={`${themeClasses.select} w-full`}
                >
                  {INVOICE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-text-muted">
                  Used for PDF labeling. Amount is always the full contract.
                </span>
              </label>

              {finalBlocked ? (
                <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Final invoice blocked: {openSnags} open snag(s) on this work order. Resolve snags
                  first.
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Amount (ex-tax AED)</span>
                  <input
                    type="text"
                    readOnly
                    value={formatMoney(contract)}
                    className={`${themeClasses.input} bg-surface-muted/50`}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Tax %</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(e.target.value)}
                    className={themeClasses.input}
                  />
                </label>
              </div>

              <p className="text-sm text-text-muted">
                VAT {formatMoney(taxPreview.taxAmount)} · Invoice total{" "}
                {formatMoney(taxPreview.total)}
              </p>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Due date</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={themeClasses.input}
                />
              </label>

              <button
                type="submit"
                disabled={busy || finalBlocked || contract <= 0}
                className={`${themeClasses.btnNavy} w-full justify-center sm:w-auto`}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create contract invoice
              </button>
            </form>
          ) : activeWorkOrderId && !loadingOrder && !order ? (
            <p className="text-sm text-rose-600">Work order could not be loaded.</p>
          ) : !isLockedToWorkOrder && !activeWorkOrderId ? (
            <p className="text-sm text-text-muted">Select a work order to continue.</p>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

export default CreateInvoicePage;
