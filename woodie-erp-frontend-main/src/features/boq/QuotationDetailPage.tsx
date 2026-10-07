import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgePercent,
  Building2,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  FileSpreadsheet,
  GitBranch,
  ListChecks,
  Loader2,
  MessageSquare,
  Percent,
  Plus,
  Receipt,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import { RamsModal } from "./RamsModal";
import { ConfirmDeleteModal, ConfirmDeleteTrigger } from "../../components/ConfirmDeleteModal";
import { canDeleteQuotation } from "../../lib/deleteRules";
import { formatCount } from "../../lib/formatCount";
import { displayOrEmpty } from "../inquiry/components/inquiryShared";
import { useAuth } from "../auth/AuthContext";
import { canApproveBoq, canManageBoq, canManageWorkOrders, isAdmin, isSales } from "../auth/permissions";
import { createWorkOrder, getWorkOrders } from "../workorders/workOrderApi";
import type { WorkOrder } from "../workorders/workOrderTypes";
import {
  approveQuotation,
  downloadQuotationPdf,
  getQuotationById,
  importSiteReportToQuotation,
  markLost,
  markNegotiation,
  markWon,
  deleteQuotation,
  rejectQuotation,
  requestQuotationRevision,
  saveQuotationDraft,
  submitQuotationForApproval,
  updateQuotation,
} from "./boqApi";
import { themeClasses } from "../../theme/classes";
import { BoqFeedbackPopup, useBoqFeedback } from "./boqFeedback";
import { ApprovalFlow, CategoryBadge, formatMoney, PricingCard, StatusBadge } from "./boqShared";
import QuotationSiteInformationPanel from "./QuotationSiteInformationPanel";
import type { BoqCategory, BoqItem, BoqQuotation } from "./boqTypes";

const categories: BoqCategory[] = ["Material", "Labor", "Equipment", "Service"];
const EDITABLE = ["BOQ In Progress", "Quotation Draft", "Revision Requested"];
const PRICE_EDITABLE_STATUSES = [
  "BOQ In Progress",
  "Quotation Draft",
  "Revision Requested",
  "Rejected",
  "Pending Approval",
  "Approved",
  "Quotation Sent",
  "Negotiation",
];

const fieldLabelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text-muted";
const readValueClass =
  "break-words text-sm leading-snug text-text-primary [overflow-wrap:anywhere]";

function SectionCard({
  title,
  icon: Icon,
  action,
  children,
  className = "",
}: {
  title: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`app-panel min-w-0 overflow-hidden ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-border-light pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary">
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
          <h2 className={themeClasses.sectionTitle}>{title}</h2>
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function BoqItemRow({
  item,
  index,
  canEdit,
  canEditPrice = false,
  onUpdate,
  onRemove,
  quotationId,
}: {
  item: BoqItem;
  index: number;
  canEdit: boolean;
  canEditPrice?: boolean;
  onUpdate: (index: number, patch: Partial<BoqItem>) => void;
  onRemove: (index: number) => void;
  quotationId?: string;
}) {
  const lineTotal = item.quantity * item.unitPrice;
  const isItemEditable = canEdit || canEditPrice;

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-surface-border-light bg-surface-muted/25 p-3 transition-colors hover:bg-surface-muted/40 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {isItemEditable ? (
            <input
              value={item.itemCode}
              onChange={(e) => onUpdate(index, { itemCode: e.target.value })}
              className={`${themeClasses.input} w-full max-w-[7rem] font-mono text-xs sm:max-w-[8rem]`}
              aria-label="Item code"
            />
          ) : (
            <span className="font-mono text-xs font-semibold text-ui-primary">{item.itemCode}</span>
          )}
          {!isItemEditable ? <CategoryBadge category={item.category} /> : null}

          {quotationId ? (
            <Link
              to={`/boq/${quotationId}/costing?block=${index}`}
              title="Open Costing & Rate Analysis Breakdown"
              className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-300/80 hover:bg-amber-100 hover:border-amber-400 shadow-2xs transition-all"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-amber-700" />
              Costing Sheet
            </Link>
          ) : null}
        </div>
        {isItemEditable ? (
          <div className="flex shrink-0 items-center gap-2">
            <select
              value={item.category}
              onChange={(e) => onUpdate(index, { category: e.target.value as BoqCategory })}
              className={themeClasses.select}
              aria-label="Category"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="cursor-pointer rounded-lg p-2 text-rose-600 transition-colors hover:bg-rose-50"
              aria-label="Remove item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-12 lg:items-end">
        <div className="min-w-0 lg:col-span-5">
          <label className={fieldLabelClass}>Description</label>
          {isItemEditable ? (
            <input
              value={item.description}
              onChange={(e) => onUpdate(index, { description: e.target.value })}
              className={themeClasses.input}
            />
          ) : (
            <p className={readValueClass}>{item.description}</p>
          )}
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-7">
          <div className="min-w-0">
            <label className={fieldLabelClass}>Qty</label>
            {isItemEditable ? (
              <input
                type="number"
                min={0}
                value={item.quantity}
                onChange={(e) => onUpdate(index, { quantity: Number(e.target.value) })}
                className={themeClasses.input}
              />
            ) : (
              <p className={`${readValueClass} tabular-nums`}>{item.quantity}</p>
            )}
          </div>
          <div className="min-w-0">
            <label className={fieldLabelClass}>Unit</label>
            {isItemEditable ? (
              <input
                value={item.unit}
                onChange={(e) => onUpdate(index, { unit: e.target.value })}
                className={themeClasses.input}
              />
            ) : (
              <p className={readValueClass}>{item.unit}</p>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-between">
              <label className={fieldLabelClass}>Unit price</label>
              {canEditPrice && !canEdit ? (
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-1 py-0.2 rounded">
                  Editable
                </span>
              ) : null}
            </div>
            {isItemEditable ? (
              <input
                type="number"
                min={0}
                step="0.01"
                value={item.unitPrice}
                onChange={(e) => onUpdate(index, { unitPrice: Number(e.target.value) })}
                className={`${themeClasses.input} font-bold text-emerald-900 ${
                  canEditPrice && !canEdit
                    ? "border-emerald-300 bg-emerald-50/30 focus:border-emerald-500 focus:ring-emerald-200"
                    : ""
                }`}
              />
            ) : (
              <p className={`${readValueClass} tabular-nums`}>{formatMoney(item.unitPrice)}</p>
            )}
          </div>
          <div className="min-w-0">
            <label className={fieldLabelClass}>Line total</label>
            <p className="break-words text-sm font-semibold tabular-nums text-text-primary [overflow-wrap:anywhere]">
              {formatMoney(lineTotal)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

type NegotiationAction = "won" | "lost" | "negotiation";

function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? "sales";

  const [quotation, setQuotation] = useState<BoqQuotation | null>(null);
  const [items, setItems] = useState<BoqItem[]>([]);
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [taxPercent, setTaxPercent] = useState("8");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [paymentTerms, setPaymentTerms] = useState("Net 30 days");
  const [notes, setNotes] = useState("");
  const [managerRemarks, setManagerRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const { msg, notifyOk, notifyErr, notifyErrText, dismiss } = useBoqFeedback();
  const [busy, setBusy] = useState(false);
  const [actionLoading, setActionLoading] = useState<NegotiationAction | null>(null);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [showLossModal, setShowLossModal] = useState(false);
  const [showWonModal, setShowWonModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRamsModal, setShowRamsModal] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [clientFeedback, setClientFeedback] = useState("");
  const [lossReason, setLossReason] = useState("");
  const [lossReasonError, setLossReasonError] = useState("");
  const [linkedWorkOrder, setLinkedWorkOrder] = useState<WorkOrder | null>(null);
  const [woBusy, setWoBusy] = useState(false);

  const canEdit = canManageBoq(role) && quotation && EDITABLE.includes(quotation.status);
  const canEditPrice =
    canManageBoq(role) && quotation && PRICE_EDITABLE_STATUSES.includes(quotation.status);
  const isApprovedStage = Boolean(
    quotation && ["Approved", "Quotation Sent", "Negotiation"].includes(quotation.status),
  );
  const canCreateWorkOrder = canManageWorkOrders(role);
  const canSendToClient = isAdmin(role) || isSales(role);
  const canCloseDeal = canSendToClient || canApproveBoq(role);
  const negotiationBusy = busy || actionLoading !== null;
  const canReview = canApproveBoq(role) && quotation?.status === "Pending Approval";
  const canDownloadPdf =
    Boolean(quotation && items.length > 0 && (canManageBoq(role) || canApproveBoq(role)));

  const canDelete =
    quotation &&
    canDeleteQuotation(quotation.status, role, {
      isOwner: !user?.id || String(quotation.createdBy) === String(user.id),
    }) &&
    !(quotation.status === "Won" && linkedWorkOrder);

  async function handleDeleteQuotation() {
    if (!id || !quotation) return;
    setDeleteBusy(true);
    dismiss();
    try {
      await deleteQuotation(id);
      notifyOk(`Quotation ${quotation.quotationNumber} deleted.`);
      navigate("/boq");
    } catch (err) {
      notifyErr(err, "Could not delete quotation.");
    } finally {
      setDeleteBusy(false);
      setShowDeleteModal(false);
    }
  }

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getQuotationById(id);
      setQuotation(data);
      setItems(data.items ?? []);
      setProjectName(data.projectName ?? "");
      setClientName(data.clientName ?? "");
      setClientEmail(data.clientEmail ?? "");
      setClientPhone(data.clientPhone ?? "");
      setTaxPercent(String(data.taxPercent ?? 8));
      setDiscountPercent(String(data.discountPercent ?? 0));
      setPaymentTerms(data.paymentTerms ?? "Net 30 days");
      setNotes(data.notes ?? "");
      setManagerRemarks(data.approval?.remarks ?? "");
    } catch {
      setQuotation(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadLinkedWorkOrder = useCallback(async () => {
    if (!id || quotation?.status !== "Won") {
      setLinkedWorkOrder(null);
      return;
    }
    try {
      const rows = await getWorkOrders("", "All", id);
      setLinkedWorkOrder(rows[0] ?? null);
    } catch {
      setLinkedWorkOrder(null);
    }
  }, [id, quotation?.status]);

  useEffect(() => {
    void loadLinkedWorkOrder();
  }, [loadLinkedWorkOrder]);

  async function handleCreateWorkOrder() {
    if (!id || !canCreateWorkOrder) return;
    setWoBusy(true);
    dismiss();
    try {
      const wo = await createWorkOrder({ quotationId: id });
      setLinkedWorkOrder(wo);
      notifyOk(`Work order ${wo.workOrderNumber} created.`);
    } catch (err) {
      notifyErr(err, "Could not create work order.");
    } finally {
      setWoBusy(false);
    }
  }

  const preview = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const tax = (subtotal * Number(taxPercent || 0)) / 100;
    const discount = (subtotal * Number(discountPercent || 0)) / 100;
    return { subtotal, tax, discount, grand: subtotal + tax - discount };
  }, [items, taxPercent, discountPercent]);

  function buildPayload() {
    return {
      projectName,
      clientName,
      clientEmail,
      clientPhone,
      items,
      taxPercent: Number(taxPercent),
      discountPercent: Number(discountPercent),
      paymentTerms,
      notes,
    };
  }

  async function handleSave() {
    if (!id || (!canEdit && !canEditPrice)) return;
    setBusy(true);
    dismiss();
    try {
      const updated = await updateQuotation(id, buildPayload());
      setQuotation(updated);
      setItems(updated.items ?? []);
      notifyOk(isApprovedStage ? "Pricing updated successfully." : "BOQ saved.");
    } catch (err) {
      notifyErr(err, "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDraft() {
    if (!id) return;
    setBusy(true);
    dismiss();
    try {
      await updateQuotation(id, buildPayload());
      const updated = await saveQuotationDraft(id);
      setQuotation(updated);
      notifyOk("Quotation draft created.");
    } catch (err) {
      notifyErr(err, "Could not save draft.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (!id) return;
    setBusy(true);
    dismiss();
    try {
      await updateQuotation(id, buildPayload());
      const updated = await submitQuotationForApproval(id);
      setQuotation(updated);
      notifyOk(
        isAdmin(role) ? "Quotation saved and approved." : "Submitted for manager approval.",
      );
    } catch (err) {
      notifyErr(err, "Submit failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    if (!id) return;
    setBusy(true);
    dismiss();
    try {
      const updated = await approveQuotation(id, managerRemarks);
      setQuotation(updated);
      notifyOk("Quotation approved.");
    } catch (err) {
      notifyErr(err, "Approve failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!id || !managerRemarks.trim()) {
      notifyErrText("Remarks required to reject.");
      return;
    }
    setBusy(true);
    dismiss();
    try {
      const updated = await rejectQuotation(id, managerRemarks.trim());
      setQuotation(updated);
      notifyOk("Quotation rejected.");
    } catch (err) {
      notifyErr(err, "Reject failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevision() {
    if (!id || !managerRemarks.trim()) {
      notifyErrText("Remarks required for revision request.");
      return;
    }
    setBusy(true);
    dismiss();
    try {
      const updated = await requestQuotationRevision(id, managerRemarks.trim());
      setQuotation(updated);
      notifyOk("Sent back to sales for revision.");
    } catch (err) {
      notifyErr(err, "Revision request failed.");
    } finally {
      setBusy(false);
    }
  }

  function addItem() {
    setItems((prev) => [
      {
        itemCode: `NEW-${String(prev.length + 1).padStart(3, "0")}`,
        description: "New BOQ item",
        category: "Material",
        quantity: 1,
        unit: "unit",
        unitPrice: 0,
      },
      ...prev,
    ]);
  }

  function updateItem(index: number, patch: Partial<BoqItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleDownloadPdf() {
    if (!id || !quotation) return;
    setBusy(true);
    dismiss();
    try {
      const blob = await downloadQuotationPdf(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `quotation-${quotation.quotationNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      notifyOk("Quotation PDF downloaded.");
    } catch (err) {
      notifyErr(err, "PDF download failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runNegotiationAction(
    action: NegotiationAction,
    fn: () => Promise<BoqQuotation>,
    successMessage: string,
  ) {
    if (!id) return;
    const previousScrollY = window.scrollY;
    setActionLoading(action);
    dismiss();
    try {
      const updated = await fn();
      setQuotation(updated);
      if (updated.status === "Won") {
        try {
          const rows = await getWorkOrders("", "All", id);
          setLinkedWorkOrder(rows[0] ?? null);
        } catch {
          /* ignore */
        }
      } else {
        setLinkedWorkOrder(null);
      }
      notifyOk(successMessage);
      setShowNegotiationModal(false);
      setShowLossModal(false);
      setShowWonModal(false);
      setClientFeedback("");
      setLossReason("");
      setLossReasonError("");
      requestAnimationFrame(() => {
        window.scrollTo({ top: previousScrollY });
      });
    } catch (err) {
      notifyErr(err, "Action failed.");
    } finally {
      setActionLoading(null);
    }
  }

  function handleConfirmNegotiation() {
    if (!id) return;
    void runNegotiationAction(
      "negotiation",
      () => markNegotiation(id, clientFeedback.trim() || undefined),
      "Marked as under negotiation.",
    );
  }

  function handleConfirmWon() {
    if (!id) return;
    void runNegotiationAction("won", () => markWon(id), "Quotation marked as won.");
  }

  function handleConfirmLost() {
    const trimmed = lossReason.trim();
    if (!trimmed) {
      setLossReasonError("Loss reason is required.");
      return;
    }
    if (trimmed.length < 5) {
      setLossReasonError("Loss reason must be at least 5 characters.");
      return;
    }
    if (!id) return;
    void runNegotiationAction("lost", () => markLost(id, trimmed), "Quotation marked as lost.");
  }

  async function handleImportSiteReport() {
    if (!id || !quotation?.inquiryId || !canEdit || items.length > 0) return;
    setBusy(true);
    dismiss();
    try {
      const { quotation: updated, addedCount } = await importSiteReportToQuotation(id);
      setQuotation(updated);
      setItems(updated.items ?? []);
      if (!notes.trim() && updated.notes) setNotes(updated.notes);
      notifyOk(
        addedCount > 0
          ? `Loaded ${formatCount(addedCount, "line", "lines")} from site report. Add unit prices next.`
          : "No new lines to load.",
      );
    } catch (err) {
      notifyErr(err, "Import from site report failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AppShell activeNav="tools">
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-ui-primary" />
          <p className="text-sm text-text-muted">Loading quotation…</p>
        </div>
      </AppShell>
    );
  }

  if (!quotation) {
    return (
      <AppShell activeNav="tools">
        <div className="dashboard-hero mx-auto max-w-lg text-center">
          <p className="text-base font-semibold text-text-primary">Quotation not found</p>
          <p className="mt-1 text-sm text-text-muted">It may have been removed or you may not have access.</p>
          <Link
            to="/boq"
            className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ui-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to BOQ list
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeNav="tools" pageTitle={quotation.quotationNumber} pageSubtitle={projectName || "BOQ details"}>
      <BoqFeedbackPopup msg={msg} onDismiss={dismiss} />
      <ConfirmDeleteModal
        open={showDeleteModal}
        title="Delete this quotation?"
        description="The BOQ and all line items will be permanently removed. This is only allowed before client outcome or work orders."
        itemLabel={`${quotation.quotationNumber} · ${quotation.projectName || "BOQ"}`}
        loading={deleteBusy}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => void handleDeleteQuotation()}
      />

      <div className="mx-auto min-w-0 max-w-[1600px] space-y-5">
        {/* Page header */}
        <header className="dashboard-hero min-w-0 overflow-hidden">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <Link
                to="/boq"
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-text-muted transition hover:text-text-primary"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to list
              </Link>
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <h1 className="truncate text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
                  {quotation.quotationNumber}
                </h1>
                <StatusBadge status={quotation.status} />
              </div>
              <p className="truncate text-sm font-medium text-text-secondary">
                {projectName || "Untitled project"}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Sales: {displayOrEmpty(quotation.createdByName)}</span>
                </span>
                {clientName ? (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{clientName}</span>
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {canDelete ? (
                <ConfirmDeleteTrigger
                  label="Delete"
                  disabled={busy || deleteBusy}
                  onClick={() => setShowDeleteModal(true)}
                />
              ) : null}
              {canDownloadPdf ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDownloadPdf()}
                    className={themeClasses.btnNavy}
                    title="Download PDF"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Download PDF
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setShowRamsModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-xs hover:bg-emerald-100 hover:border-emerald-600/50 transition-all cursor-pointer"
                    title="Download Risk Assessment & Method of Statement (RAMS)"
                  >
                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                    Risk Assessment &amp; MOS
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start xl:gap-6">
          {/* Main column */}
          <div className="min-w-0 space-y-5">
            <SectionCard title="Project & client" icon={Building2}>
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Project name" value={projectName} onChange={setProjectName} disabled={!canEdit} />
                <Field label="Client name" value={clientName} onChange={setClientName} disabled={!canEdit} />
                <Field label="Client email" value={clientEmail} onChange={setClientEmail} disabled={!canEdit} />
                <Field label="Client phone" value={clientPhone} onChange={setClientPhone} disabled={!canEdit} />
              </div>
            </SectionCard>

            <QuotationSiteInformationPanel
              siteInformation={quotation.siteInformation}
              items={items}
              quotationId={quotation._id}
            />

            <section aria-label="Amount summary" className="min-w-0">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary">
                  <Calculator className="h-4 w-4" strokeWidth={2} />
                </span>
                <h2 className={themeClasses.sectionTitle}>Amount summary</h2>
              </div>
              <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4">
                <PricingCard title="Subtotal" value={formatMoney(preview.subtotal)} detail="BOQ items" icon={Receipt} />
                <PricingCard title="Tax" value={formatMoney(preview.tax)} detail={`${taxPercent}%`} icon={Percent} />
                <PricingCard
                  title="Discount"
                  value={formatMoney(preview.discount)}
                  detail={`${discountPercent}%`}
                  icon={BadgePercent}
                />
                <PricingCard
                  title="Grand total"
                  value={formatMoney(preview.grand)}
                  detail="Final quotation"
                  icon={CircleDollarSign}
                />
              </div>
            </section>

            <SectionCard
              title="BOQ items"
              icon={ListChecks}
              action={
                canEdit ? (
                  <>
                    {quotation.inquiryId && items.length === 0 ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleImportSiteReport()}
                        className={themeClasses.btnSecondary}
                      >
                        <Download className="h-4 w-4" />
                        Load from site report
                      </button>
                    ) : null}
                    <button type="button" onClick={addItem} className={themeClasses.btnPrimary}>
                      <Plus className="h-4 w-4" />
                      Add item
                    </button>
                  </>
                ) : canEditPrice ? (
                  <button type="button" onClick={addItem} className={themeClasses.btnSecondary}>
                    <Plus className="h-4 w-4" />
                    Add item
                  </button>
                ) : undefined
              }
            >
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-surface-border bg-surface-muted/30 px-6 py-10 text-center">
                  <ListChecks className="mx-auto h-8 w-8 text-text-muted/60" />
                  <p className="mt-2 text-sm font-medium text-text-primary">No BOQ items</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {quotation.inquiryId && (canEdit || canEditPrice)
                      ? "Use Load from site report or add items manually."
                      : "Add line items to build the quotation."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <BoqItemRow
                      key={`${item.itemCode}-${index}`}
                      item={item}
                      index={index}
                      canEdit={Boolean(canEdit)}
                      canEditPrice={Boolean(canEditPrice)}
                      onUpdate={updateItem}
                      onRemove={removeItem}
                      quotationId={quotation._id}
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Taxes, discount & payment" icon={Calculator}>
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Tax %"
                  value={taxPercent}
                  onChange={setTaxPercent}
                  disabled={!canEdit && !canEditPrice}
                  type="number"
                />
                <Field
                  label="Discount %"
                  value={discountPercent}
                  onChange={setDiscountPercent}
                  disabled={!canEdit && !canEditPrice}
                  type="number"
                />
                <div className="min-w-0 sm:col-span-2">
                  <Field
                    label="Payment terms"
                    value={paymentTerms}
                    onChange={setPaymentTerms}
                    disabled={!canEdit && !canEditPrice}
                  />
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <label className={fieldLabelClass}>Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    disabled={!canEdit && !canEditPrice}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`${themeClasses.input} resize-y disabled:bg-surface-muted/60`}
                  />
                </div>
              </div>
            </SectionCard>

            {canEdit || canEditPrice ? (
              <div className="app-panel flex min-w-0 flex-wrap items-center justify-between gap-3 border-t-2 border-brand-amber/30">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={busy} onClick={() => void handleSave()} className={themeClasses.btnNavy}>
                    <Save className="h-4 w-4" />
                    {isApprovedStage ? "Save updated pricing" : "Save BOQ preparation"}
                  </button>
                  {quotation.status === "BOQ In Progress" || quotation.status === "Revision Requested" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSaveDraft()}
                      className={themeClasses.btnNavy}
                    >
                      Generate quotation
                    </button>
                  ) : null}
                  {quotation.status === "Quotation Draft" || quotation.status === "Revision Requested" ? (
                    <button type="button" disabled={busy} onClick={() => void handleSubmit()} className={themeClasses.btnNavy}>
                      <Send className="h-4 w-4" />
                      {isAdmin(role) ? "Save & approve" : "Submit for manager approval"}
                    </button>
                  ) : null}
                </div>
                {isApprovedStage ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Prices are editable after approval · Click Save to update totals & PDF
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Sidebar */}
          <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
            <SectionCard title="Workflow" icon={GitBranch}>
              <ApprovalFlow status={quotation.status} />
            </SectionCard>

            {canReview ? (
              <SectionCard title="Manager approval" icon={MessageSquare}>
                <label className={fieldLabelClass}>Remarks</label>
                <textarea
                  rows={4}
                  value={managerRemarks}
                  onChange={(e) => setManagerRemarks(e.target.value)}
                  placeholder="Required for reject / revision. Optional for approve."
                  className={`${themeClasses.input} mb-4 resize-y`}
                />
                <div className="space-y-2">
                  <button type="button" disabled={busy} onClick={() => void handleApprove()} className={`${themeClasses.btnSuccess} w-full`}>
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleReject()}
                    className="w-full cursor-pointer rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRevision()}
                    className="w-full cursor-pointer rounded-lg border border-orange-300 bg-orange-50 py-2.5 text-sm font-medium text-orange-800 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Request revision
                  </button>
                </div>
              </SectionCard>
            ) : null}

            {quotation.approval?.remarks && !canReview ? (
              <div className="app-panel min-w-0 overflow-hidden border-l-[3px] border-l-brand-amber">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Manager remarks</p>
                <p className="mt-2 break-words text-sm leading-relaxed text-text-primary [overflow-wrap:anywhere]">
                  {quotation.approval.remarks}
                </p>
                <p className="mt-3 text-xs text-text-muted">
                  {quotation.approval.reviewedByName}
                  {quotation.approval.reviewedAt
                    ? ` · ${new Date(quotation.approval.reviewedAt).toLocaleString()}`
                    : ""}
                </p>
              </div>
            ) : null}

            <ClientNegotiationPanel
              quotation={quotation}
              canSendToClient={canSendToClient}
              canCloseDeal={canCloseDeal}
              canCreateWorkOrder={canCreateWorkOrder}
              linkedWorkOrder={linkedWorkOrder}
              woBusy={woBusy}
              onCreateWorkOrder={() => void handleCreateWorkOrder()}
              negotiationBusy={negotiationBusy}
              actionLoading={actionLoading}
              onOpenNegotiation={() => {
                setClientFeedback(quotation.clientFeedback ?? "");
                setShowNegotiationModal(true);
              }}
              onOpenWon={() => setShowWonModal(true)}
              onOpenLost={() => {
                setLossReason("");
                setLossReasonError("");
                setShowLossModal(true);
              }}
            />

            <SectionCard title="Activity" icon={Clock3}>
              <ul className="max-h-72 space-y-0 overflow-y-auto pr-1">
                {quotation.activityTimeline.map((a, i) => (
                  <li key={`${a.action}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-muted">
                      <Clock3 className="h-3.5 w-3.5" />
                    </span>
                    <div
                      className={`min-w-0 flex-1 ${i < quotation.activityTimeline.length - 1 ? "border-b border-surface-border-light pb-4" : ""}`}
                    >
                      <p className="break-words text-sm font-semibold text-text-primary">{a.action}</p>
                      {a.note ? (
                        <p className="mt-0.5 break-words text-sm text-text-secondary [overflow-wrap:anywhere]">{a.note}</p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-text-muted">{new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </aside>
        </div>
      </div>

      {showNegotiationModal ? (
        <NegotiationModal
          clientFeedback={clientFeedback}
          onClientFeedbackChange={setClientFeedback}
          loading={actionLoading === "negotiation"}
          disabled={negotiationBusy}
          onCancel={() => {
            if (negotiationBusy) return;
            setShowNegotiationModal(false);
          }}
          onConfirm={() => handleConfirmNegotiation()}
        />
      ) : null}

      {showLossModal ? (
        <LossReasonModal
          lossReason={lossReason}
          error={lossReasonError}
          loading={actionLoading === "lost"}
          disabled={negotiationBusy}
          onLossReasonChange={(value) => {
            setLossReason(value);
            if (lossReasonError) setLossReasonError("");
          }}
          onCancel={() => {
            if (negotiationBusy) return;
            setShowLossModal(false);
          }}
          onConfirm={() => handleConfirmLost()}
        />
      ) : null}

      {showWonModal ? (
        <WonConfirmModal
          loading={actionLoading === "won"}
          disabled={negotiationBusy}
          onCancel={() => {
            if (negotiationBusy) return;
            setShowWonModal(false);
          }}
          onConfirm={() => handleConfirmWon()}
        />
      ) : null}

      <RamsModal
        isOpen={showRamsModal}
        onClose={() => setShowRamsModal(false)}
        quotationId={quotation._id}
        defaultLocation={projectName || quotation.siteInformation?.location || ""}
        defaultScope={quotation.siteInformation?.scopeOfWork || ""}
        onSuccess={notifyOk}
        onError={notifyErr}
      />
    </AppShell>
  );
}

const actionButtonStyles = {
  primary:
    "bg-ui-primary text-text-on-primary shadow-sm hover:bg-ui-primary-hover",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
  warning: "bg-amber-500 text-white hover:bg-amber-600",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  secondary: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
} as const;

function ActionButton({
  children,
  onClick,
  disabled,
  loading,
  variant = "primary",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: keyof typeof actionButtonStyles;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${actionButtonStyles[variant]}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

const OUTCOME_ACTION_STATUSES = ["Approved", "Quotation Sent", "Negotiation"] as const;

function ClientNegotiationPanel({
  quotation,
  canSendToClient,
  canCloseDeal,
  canCreateWorkOrder,
  linkedWorkOrder,
  woBusy,
  onCreateWorkOrder,
  negotiationBusy,
  actionLoading,
  onOpenNegotiation,
  onOpenWon,
  onOpenLost,
}: {
  quotation: BoqQuotation;
  canSendToClient: boolean;
  canCloseDeal: boolean;
  canCreateWorkOrder: boolean;
  linkedWorkOrder: WorkOrder | null;
  woBusy: boolean;
  onCreateWorkOrder: () => void;
  negotiationBusy: boolean;
  actionLoading: NegotiationAction | null;
  onOpenNegotiation: () => void;
  onOpenWon: () => void;
  onOpenLost: () => void;
}) {
  const { status } = quotation;
  const showActions =
    canCloseDeal && OUTCOME_ACTION_STATUSES.includes(status as (typeof OUTCOME_ACTION_STATUSES)[number]);
  const showNegotiationButton = canSendToClient && status !== "Negotiation";

  if (status === "Won") {
    return (
      <SectionCard title="Client outcome" icon={CircleDollarSign}>
        <p className="mb-3 text-sm leading-relaxed text-text-muted">
          Quotation won. A work order is created automatically — open it below to assign the team and start execution.
        </p>
        <span className="inline-flex rounded-md bg-green-100 px-3 py-1.5 text-sm font-semibold text-green-700">
          Won ✓
        </span>
        {linkedWorkOrder ? (
          <div className="mt-4 min-w-0 rounded-lg border border-surface-border-light bg-surface-muted/30 p-3">
            <p className="break-words text-sm text-text-secondary">
              Work order{" "}
              <span className="font-semibold text-text-primary">{linkedWorkOrder.workOrderNumber}</span> —{" "}
              {linkedWorkOrder.status}
            </p>
            <Link to={`/workorders/${linkedWorkOrder._id}`} className={`${themeClasses.btnNavy} mt-3 inline-flex`}>
              Open work order
            </Link>
          </div>
        ) : canCreateWorkOrder ? (
          <div className="mt-4 space-y-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
            <p className="text-sm text-amber-900">Work order not found yet. Create one manually.</p>
            <button
              type="button"
              disabled={woBusy || negotiationBusy}
              onClick={onCreateWorkOrder}
              className={`${themeClasses.btnNavy} inline-flex`}
            >
              {woBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create work order
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-text-muted">Work order will appear here once created by admin or manager.</p>
        )}
      </SectionCard>
    );
  }

  if (status === "Lost") {
    return (
      <SectionCard title="Client outcome" icon={CircleDollarSign}>
        <span className="inline-flex rounded-md bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-700">Lost</span>
        {quotation.lossReason?.trim() ? (
          <p className="mt-3 break-words text-sm text-text-secondary [overflow-wrap:anywhere]">
            <span className="font-semibold text-text-primary">Reason: </span>
            {quotation.lossReason}
          </p>
        ) : null}
      </SectionCard>
    );
  }

  if (!showActions) return null;

  const buttonCols = showNegotiationButton ? "sm:grid-cols-3" : "sm:grid-cols-2";

  return (
    <SectionCard title="Client outcome" icon={CircleDollarSign}>
      <p className="mb-4 text-sm leading-relaxed text-text-muted">
        Share the quotation with your client (email, PDF, or in person), then update the status here.
      </p>

      {status === "Negotiation" && quotation.clientFeedback?.trim() ? (
        <div className="mb-4 min-w-0 rounded-lg border border-surface-border-light bg-surface-muted/30 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Client feedback</p>
          <p className="mt-1 break-words text-sm text-text-primary [overflow-wrap:anywhere]">{quotation.clientFeedback}</p>
        </div>
      ) : null}

      <div className={`grid grid-cols-1 gap-2 ${buttonCols}`}>
        <ActionButton
          variant="success"
          disabled={negotiationBusy}
          loading={actionLoading === "won"}
          onClick={onOpenWon}
        >
          Mark Won
        </ActionButton>
        {showNegotiationButton ? (
          <ActionButton
            variant="warning"
            disabled={negotiationBusy}
            loading={actionLoading === "negotiation"}
            onClick={onOpenNegotiation}
          >
            Under Negotiation
          </ActionButton>
        ) : null}
        <ActionButton
          variant="danger"
          disabled={negotiationBusy}
          loading={actionLoading === "lost"}
          onClick={onOpenLost}
        >
          Mark Lost
        </ActionButton>
      </div>
    </SectionCard>
  );
}

function ModalShell({
  title,
  children,
  onCancel,
  onConfirm,
  confirmLabel,
  loading,
  disabled,
  confirmVariant = "primary",
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  loading?: boolean;
  disabled?: boolean;
  confirmVariant?: "primary" | "success" | "danger";
}) {
  const confirmStyles = {
    primary: "bg-ui-primary text-text-on-primary hover:bg-ui-primary-hover",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]" role="dialog" aria-modal>
      <div className="app-panel w-full max-w-md shadow-lg">
        <h3 className="mb-1 text-base font-bold text-text-primary">{title}</h3>
        <div className="mb-4 h-px bg-surface-border-light" />
        {children}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={disabled || loading}
            onClick={onCancel}
            className={`${themeClasses.btnSecondary} flex-1`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={disabled || loading}
            onClick={onConfirm}
            className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${confirmStyles[confirmVariant]}`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function NegotiationModal({
  clientFeedback,
  onClientFeedbackChange,
  loading,
  disabled,
  onCancel,
  onConfirm,
}: {
  clientFeedback: string;
  onClientFeedbackChange: (value: string) => void;
  loading?: boolean;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell
      title="Under negotiation"
      confirmLabel="Confirm"
      loading={loading}
      disabled={disabled}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <label className={fieldLabelClass}>Client feedback (optional)</label>
      <textarea
        rows={4}
        maxLength={500}
        value={clientFeedback}
        disabled={disabled || loading}
        onChange={(e) => onClientFeedbackChange(e.target.value)}
        className={`${themeClasses.input} resize-y disabled:bg-surface-muted/60`}
        placeholder="Notes from client discussion…"
      />
      <p className="mt-1 text-xs text-slate-400">{clientFeedback.length}/500</p>
    </ModalShell>
  );
}

function LossReasonModal({
  lossReason,
  error,
  loading,
  disabled,
  onLossReasonChange,
  onCancel,
  onConfirm,
}: {
  lossReason: string;
  error: string;
  loading?: boolean;
  disabled?: boolean;
  onLossReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell
      title="Mark as lost"
      confirmLabel="Confirm"
      confirmVariant="danger"
      loading={loading}
      disabled={disabled}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <label className={fieldLabelClass}>Loss reason</label>
      <input
        type="text"
        value={lossReason}
        disabled={disabled || loading}
        onChange={(e) => onLossReasonChange(e.target.value)}
        className={`${themeClasses.input} disabled:bg-surface-muted/60 ${error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-200" : ""}`}
        placeholder="Why was this quotation lost?"
      />
      {error ? <p className="mt-1 text-sm text-rose-600">{error}</p> : null}
    </ModalShell>
  );
}

function WonConfirmModal({
  loading,
  disabled,
  onCancel,
  onConfirm,
}: {
  loading?: boolean;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell
      title="Mark as won"
      confirmLabel="Confirm"
      confirmVariant="success"
      loading={loading}
      disabled={disabled}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <p className="text-sm text-slate-600">Are you sure you want to mark this as Won?</p>
    </ModalShell>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <div className="min-w-0">
      <label className={fieldLabelClass}>{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${themeClasses.input} disabled:bg-surface-muted/60`}
      />
    </div>
  );
}

export default QuotationDetailPage;









