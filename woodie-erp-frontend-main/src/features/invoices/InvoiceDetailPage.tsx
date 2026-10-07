import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, Loader2 } from "lucide-react";
import { FilePickField } from "../../components/FilePickField";
import AppShell from "../../components/layout/AppShell";
import { BoqFeedbackPopup, useBoqFeedback } from "../boq/boqFeedback";
import { themeClasses } from "../../theme/classes";
import { formatMoney } from "../../lib/formatMoney";
import { getMediaUrl } from "../../lib/apiClient";
import { useAuth } from "../auth/AuthContext";
import { isAdmin, isManager } from "../../config/rbac";
import {
  downloadInvoicePdf,
  getInvoiceById,
  recordInvoicePayment,
  resolveEscalation,
  sendInvoice,
} from "./invoiceApi";
import { InvoiceStatusBadge, InvoiceTypeBadge } from "./invoiceShared";
import { PAYMENT_METHODS, type Invoice, type PaymentMethod } from "./invoiceTypes";
import WorkOrderInvoicesPanel from "./WorkOrderInvoicesPanel";

type TimelineItem = {
  key: string;
  title: string;
  note?: string;
  byName?: string;
  at: string;
  kind: "payment" | "activity";
  receiptUrl?: string;
};

function InvoiceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canManage = isAdmin(user?.role ?? "admin") || isManager(user?.role ?? "admin");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("Bank Transfer");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [resolveAction, setResolveAction] = useState<"Resume" | "Write Off">("Resume");
  const [resolveNote, setResolveNote] = useState("");
  const { msg, notifyOk, notifyErr, dismiss } = useBoqFeedback();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const doc = await getInvoiceById(id);
      setInvoice(doc);
      setPayAmount(String(doc.outstandingBalance || doc.totalAmount));
    } catch (err) {
      notifyErr(err, "Could not load invoice.");
    } finally {
      setLoading(false);
    }
  }, [id, notifyErr]);

  useEffect(() => {
    void load();
  }, [load]);

  const timeline = useMemo((): TimelineItem[] => {
    if (!invoice) return [];
    const fromPayments: TimelineItem[] = (invoice.payments ?? []).map((p, i) => ({
      key: `pay-${p._id ?? i}`,
      title: `Payment · ${formatMoney(p.amount)}`,
      note: p.method,
      byName: p.recordedByName,
      at: p.recordedAt,
      kind: "payment",
      receiptUrl: p.receiptUrl,
    }));
    const fromActivity: TimelineItem[] = (invoice.activityTimeline ?? []).map((a, i) => ({
      key: `act-${a.at}-${i}`,
      title: a.action,
      note: a.note || undefined,
      byName: a.byName,
      at: a.at,
      kind: "activity",
    }));
    return [...fromPayments, ...fromActivity].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
  }, [invoice]);

  async function handlePayment(e: FormEvent) {
    e.preventDefault();
    if (!invoice || !receipt) {
      notifyErr(new Error("receipt"), "Receipt file is required.");
      return;
    }
    let amt = Number(payAmount);
    if (!amt || amt <= 0) return;
    if (amt > invoice.outstandingBalance + 0.009) {
      notifyErr(
        new Error("over"),
        `Payment cannot exceed outstanding ${formatMoney(invoice.outstandingBalance)}.`,
      );
      return;
    }
    amt = Math.min(amt, invoice.outstandingBalance);
    setBusy(true);
    dismiss();
    try {
      const updated = await recordInvoicePayment(invoice._id, amt, payMethod, receipt);
      setInvoice(updated);
      setReceipt(null);
      setPayAmount(String(updated.outstandingBalance || 0));
      notifyOk(
        updated.outstandingBalance <= 0
          ? "Payment recorded — work order fully paid."
          : "Payment recorded. Remaining balance updated.",
      );
    } catch (err) {
      notifyErr(err, "Could not record payment.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResolve(e: FormEvent) {
    e.preventDefault();
    if (!invoice || !resolveNote.trim()) return;
    setBusy(true);
    dismiss();
    try {
      setInvoice(await resolveEscalation(invoice._id, resolveAction, resolveNote.trim()));
      setResolveNote("");
      notifyOk("Escalation resolved.");
    } catch (err) {
      notifyErr(err, "Could not resolve.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadPdf() {
    if (!invoice) return;
    setBusy(true);
    dismiss();
    try {
      const blob = await downloadInvoicePdf(invoice._id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${invoice.invoiceNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      notifyOk("Invoice PDF downloaded.");
    } catch (err) {
      notifyErr(err, "PDF download failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    if (!invoice) return;
    setBusy(true);
    dismiss();
    try {
      setInvoice(await sendInvoice(invoice._id));
      notifyOk("Invoice sent — awaiting payment.");
    } catch (err) {
      notifyErr(err, "Could not send invoice.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !invoice) {
    return (
      <AppShell activeNav="finance" pageTitle="Invoice">
        <p className="text-sm text-text-muted">{loading ? "Loading..." : "Not found."}</p>
      </AppShell>
    );
  }

  const isDraft = invoice.status === "Draft";
  const canPay =
    invoice.status !== "Paid" &&
    invoice.status !== "Cancelled" &&
    invoice.outstandingBalance > 0;

  const paidPct =
    invoice.totalAmount > 0
      ? Math.min(100, Math.round((invoice.paidAmount / invoice.totalAmount) * 100))
      : 0;

  return (
    <AppShell activeNav="finance" pageTitle={invoice.invoiceNumber} pageSubtitle={invoice.clientName}>
      <BoqFeedbackPopup msg={msg} onDismiss={dismiss} />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <Link to="/finance/invoices" className="text-text-muted hover:text-text-primary">
            Back to invoices
          </Link>
          <span className="text-text-muted">·</span>
          <Link
            to={`/workorders/${invoice.workOrderId}`}
            className="font-medium text-ui-primary hover:underline"
          >
            {invoice.workOrderNumber}
          </Link>
        </div>

        <header className="app-card overflow-hidden">
          <div className="border-b border-surface-border-light px-4 py-4 sm:px-5">
            <p className="text-xs text-text-muted">
              {invoice.clientName}
              {invoice.projectName ? ` · ${invoice.projectName}` : ""}
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
                  {invoice.invoiceNumber}
                </h1>
                <InvoiceTypeBadge type={invoice.type} />
                <InvoiceStatusBadge status={invoice.status} />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDownloadPdf()}
                className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-brand-navy px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-navy-light disabled:cursor-not-allowed disabled:opacity-60"
                title="PDF"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                PDF
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-text-muted">
                {invoice.dueDate ? `Due ${new Date(invoice.dueDate).toLocaleDateString()}` : "No due date"}
              </p>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {isDraft ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSend()}
                    className={themeClasses.btnNavy}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Send invoice
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {isDraft ? (
            <p className="border-b border-amber-100 bg-amber-50/80 px-4 py-2 text-xs text-amber-900 sm:px-5">
              You can record an advance payment now (auto-sends) or send the invoice first.
              All later payments stay on this same invoice until fully paid.
            </p>
          ) : invoice.status === "Paid" ? (
            <p className="border-b border-emerald-100 bg-emerald-50/90 px-4 py-2 text-xs font-medium text-emerald-900 sm:px-5">
              Work order contract is settled. No further invoices or payments needed.
            </p>
          ) : invoice.paidAmount > 0 ? (
            <p className="border-b border-sky-100 bg-sky-50/90 px-4 py-2 text-xs text-sky-950 sm:px-5">
              Advance / partial payment collected. Record additional payments here until still due is{" "}
              {formatMoney(0)}.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-px bg-surface-border-light sm:grid-cols-5">
            <MoneyStat label="Ex-tax" value={formatMoney(invoice.amount)} />
            <MoneyStat label={`VAT (${invoice.taxPercent}%)`} value={formatMoney(invoice.taxAmount)} />
            <MoneyStat label="Invoice total" value={formatMoney(invoice.totalAmount)} emphasis />
            <MoneyStat label="Paid" value={formatMoney(invoice.paidAmount)} tone="success" />
            <MoneyStat
              label="Still due"
              value={formatMoney(invoice.outstandingBalance)}
              tone={invoice.outstandingBalance > 0 ? "danger" : "success"}
            />
          </div>

          <div className="px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-2 text-xs text-text-muted">
              <span>Paid {formatMoney(invoice.paidAmount)}</span>
              <span>{paidPct}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${paidPct}%` }}
              />
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-4">
            {canPay ? (
              <section className="app-card p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-text-primary">Record payment</h2>
                <p className="mt-0.5 text-xs text-text-muted">
                  Record advance and later payments here (incl. VAT). Max outstanding{" "}
                  <span className="font-semibold text-text-primary">
                    {formatMoney(invoice.outstandingBalance)}
                  </span>
                  . Payments stay on this invoice until 100% is collected.
                </p>
                <form onSubmit={(e) => void handlePayment(e)} className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-[11px] font-medium text-text-muted">
                        Paying now (incl. VAT)
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={invoice.outstandingBalance}
                        step="0.01"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className={themeClasses.input}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] font-medium text-text-muted">Method</span>
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                        className={`${themeClasses.select} w-full`}
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <FilePickField
                    file={receipt}
                    onFileChange={setReceipt}
                    disabled={busy}
                    title="Attach receipt"
                    hint="Required — image or PDF"
                  />
                  <button
                    type="submit"
                    disabled={busy || !receipt}
                    className={`${themeClasses.btnSuccess} w-full justify-center sm:w-auto`}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Record payment
                  </button>
                </form>
              </section>
            ) : null}

            {invoice.status === "Escalated" && canManage ? (
              <section className="app-card border border-rose-200 bg-rose-50/40 p-4 sm:p-5">
                <h2 className="mb-3 text-sm font-semibold text-rose-900">Resolve escalation</h2>
                <form onSubmit={(e) => void handleResolve(e)} className="space-y-3">
                  <select
                    value={resolveAction}
                    onChange={(e) => setResolveAction(e.target.value as typeof resolveAction)}
                    className={themeClasses.select}
                  >
                    <option value="Resume">Resume</option>
                    <option value="Write Off">Write Off</option>
                  </select>
                  <textarea
                    rows={2}
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    placeholder="Note (required)"
                    className={themeClasses.input}
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className={`${themeClasses.btnNavy} w-full justify-center sm:w-auto`}
                  >
                    Save resolution
                  </button>
                </form>
              </section>
            ) : null}

            <section className="app-card p-4 sm:p-5">
              <h2 className="mb-3 text-sm font-semibold text-text-primary">Activity on this invoice</h2>
              {timeline.length === 0 ? (
                <p className="text-sm text-text-muted">No payments or activity yet.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {timeline.map((item) => (
                    <li
                      key={item.key}
                      className={`border-l-2 pl-3 ${item.kind === "payment" ? "border-emerald-400" : "border-slate-200"}`}
                    >
                      <span className="font-medium">{item.title}</span>
                      {item.note ? <span className="text-text-muted"> — {item.note}</span> : null}
                      <p className="text-xs text-text-muted">
                        {item.byName ? `${item.byName} · ` : ""}
                        {new Date(item.at).toLocaleString()}
                        {item.receiptUrl ? (
                          <>
                            {" · "}
                            <a
                              href={getMediaUrl(item.receiptUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-ui-primary underline decoration-2 underline-offset-2 hover:text-ui-primary-hover"
                            >
                              View receipt
                            </a>
                          </>
                        ) : null}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <WorkOrderInvoicesPanel
              key={`${invoice._id}-${invoice.paidAmount}-${invoice.outstandingBalance}`}
              workOrderId={invoice.workOrderId}
              currentInvoiceId={invoice._id}
              hideCreate
              title="Payment Overview"
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MoneyStat({
  label,
  value,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "danger" | "success";
}) {
  const valueClass =
    tone === "danger"
      ? "text-rose-700"
      : tone === "success"
        ? "text-emerald-700"
        : emphasis
          ? "text-text-primary"
          : "text-text-primary";

  return (
    <div className="bg-white px-4 py-3 sm:px-5">
      <p className="text-[11px] text-text-muted">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums sm:text-base ${valueClass}`}>{value}</p>
    </div>
  );
}

export default InvoiceDetailPage;
