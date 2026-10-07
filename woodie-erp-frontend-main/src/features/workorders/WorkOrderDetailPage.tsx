import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardList,
  Flag,
  Loader2,
  MapPin,
  Package,
  Plus,
  Save,
  Users,
  X,
} from "lucide-react";
import { FilePickField } from "../../components/FilePickField";
import WorkOrderInvoicesPanel from "../invoices/WorkOrderInvoicesPanel";
import AppShell from "../../components/layout/AppShell";
import { ConfirmActionModal } from "../../components/ConfirmActionModal";
import { ImagePreviewThumb } from "../../components/ImagePreview";
import { getMediaUrl } from "../../lib/apiClient";
import { formatCount, formatMemberCount } from "../../lib/formatCount";
import { formatMoney } from "../../lib/formatMoney";
import { themeClasses } from "../../theme/classes";
import { useAuth } from "../auth/AuthContext";
import {
  canAccessFinance,
  canManageWorkOrders,
  canRequestMaterialsForWorkOrder,
  canViewWorkOrders,
  isFieldRole,
  roleLabel,
} from "../auth/permissions";
import { getAssignableTeamMembers } from "../team/services/teamApi";
import type { TeamMember } from "../team/services/teamTypes";
import { BoqFeedbackPopup, useBoqFeedback } from "../boq/boqFeedback";
import {
  addWorkOrderProgressLog,
  addWorkOrderSnag,
  assignWorkOrderTeam,
  completeWorkOrder,
  getWorkOrderById,
  handoverWorkOrder,
  resolveWorkOrderSnag,
  startWorkOrderExecution,
  updateWorkOrder,
  uploadWorkOrderPhotos,
} from "./workOrderApi";
import {
  getNextStep,
  openSnagCount,
  statusBadge,
  type NextStepAction,
} from "./workOrderShared";
import type {
  WorkOrder,
  WorkOrderStatus,
} from "./workOrderTypes";

const LOCKED: WorkOrderStatus[] = ["Completed", "Handed Over", "Cancelled"];

function toDateInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function sameIdSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((id, i) => id === sb[i]);
}

type WorkOrderConfirm =
  | { kind: "start" }
  | { kind: "complete" }
  | { kind: "handover" }
  | { kind: "resolve-snag"; snagId: string; description: string };

function workOrderConfirmCopy(action: WorkOrderConfirm) {
  switch (action.kind) {
    case "start":
      return {
        title: "Start execution?",
        description:
          "The work order moves to In Progress. The assigned team can log progress, photos, and snags on site.",
        confirmLabel: "Start execution",
        tone: "primary" as const,
        itemLabel: undefined,
      };
    case "complete":
      return {
        title: "Mark work order complete?",
        description:
          "Confirm all site work is finished and there are no open snags. You can record client handover after this.",
        confirmLabel: "Mark complete",
        tone: "success" as const,
        itemLabel: undefined,
      };
    case "handover":
      return {
        title: "Record client handover?",
        description:
          "This marks the project as handed over to the client. The work order will be closed for site activity.",
        confirmLabel: "Confirm handover",
        tone: "handover" as const,
        itemLabel: undefined,
      };
    case "resolve-snag":
      return {
        title: "Mark snag resolved?",
        description: "This closes the snag on the work order record.",
        confirmLabel: "Mark resolved",
        tone: "success" as const,
        itemLabel: action.description,
      };
  }
}

function scrollToWorkOrderSnags() {
  const target =
    document.getElementById("work-order-snag-list") ?? document.getElementById("work-order-snags");
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function OpenSnagsAlert({ count, onViewSnags }: { count: number; onViewSnags: () => void }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50 p-4 shadow-sm ring-2 ring-orange-200/60 sm:flex-row sm:items-center sm:justify-between"
      role="alert"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-md">
          <Flag className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-left">
          <p className="text-sm font-bold text-orange-900">
            {formatCount(count, "open snag", "open snags")} need attention
          </p>
          <p className="mt-0.5 text-sm text-orange-800/90">
            Review site reports below and mark each item resolved when fixed.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onViewSnags}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
      >
        <Flag className="h-4 w-4" />
        Review snags
      </button>
    </div>
  );
}

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const role = user?.role ?? "sales";

  const isField = isFieldRole(role);
  const canPlan = canManageWorkOrders(role) && !isField;
  const isViewer = canViewWorkOrders(role) && !canPlan && !isField;
  const showFinance = canAccessFinance(role);

  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { msg, notifyOk, notifyErr, notifyErrText, dismiss } = useBoqFeedback();

  const [projectName, setProjectName] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [targetCompletion, setTargetCompletion] = useState("");
  const [teamOptions, setTeamOptions] = useState<TeamMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const [logNote, setLogNote] = useState("");
  const [snagText, setSnagText] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoFiles, setPhotoFiles] = useState<FileList | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<WorkOrderConfirm | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      applyOrder(await getWorkOrderById(id));
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  function applyOrder(data: WorkOrder) {
    setOrder(data);
    setProjectName(data.projectName);
    setNotes(data.notes ?? "");
    setScheduledStart(toDateInput(data.scheduledStart));
    setTargetCompletion(toDateInput(data.targetCompletion));
    setSelectedMemberIds(data.assignedTeam.map((m) => String(m.memberId)));
  }

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canPlan) return;
    void getAssignableTeamMembers().then(setTeamOptions).catch(() => setTeamOptions([]));
  }, [canPlan]);

  const savedTeamIds = useMemo(
    () => (order?.assignedTeam ?? []).map((m) => String(m.memberId)),
    [order],
  );

  const showMaterialRequest = useMemo(
    () => (order && user ? canRequestMaterialsForWorkOrder(order, user) : false),
    [order, user],
  );

  const hasPlanChanges = useMemo(() => {
    if (!order) return false;
    return (
      projectName.trim() !== order.projectName ||
      notes !== (order.notes ?? "") ||
      scheduledStart !== toDateInput(order.scheduledStart) ||
      targetCompletion !== toDateInput(order.targetCompletion) ||
      !sameIdSet(selectedMemberIds, savedTeamIds)
    );
  }, [order, projectName, notes, scheduledStart, targetCompletion, selectedMemberIds, savedTeamIds]);

  const isLocked = order ? LOCKED.includes(order.status) : true;
  const openSnags = order ? openSnagCount(order.snags) : 0;

  const nextStep = useMemo(() => {
    if (!order) return null;
    if (isField) return getNextStep(order, "field");
    if (canPlan) return getNextStep(order, "planner");
    return getNextStep(order, "viewer");
  }, [order, isField, canPlan]);

  async function handleSavePlan() {
    if (!id || !order || !canPlan || isLocked) return;
    if (selectedMemberIds.length === 0) {
      notifyErrText("Select at least one team member.");
      return;
    }
    if (!hasPlanChanges) {
      notifyErrText("No changes to save.");
      return;
    }

    setBusy(true);
    dismiss();
    try {
      let current = order;
      const detailsChanged =
        projectName.trim() !== order.projectName ||
        notes !== (order.notes ?? "") ||
        scheduledStart !== toDateInput(order.scheduledStart) ||
        targetCompletion !== toDateInput(order.targetCompletion);
      const teamChanged = !sameIdSet(selectedMemberIds, savedTeamIds);

      if (detailsChanged) {
        const updated = await updateWorkOrder(id, {
          projectName: projectName.trim(),
          notes,
          scheduledStart: scheduledStart || null,
          targetCompletion: targetCompletion || null,
        });
        current = updated;
      }
      if (teamChanged) {
        current = await assignWorkOrderTeam(id, selectedMemberIds);
      }
      applyOrder(current);
      notifyOk("Plan saved successfully.");
    } catch (err) {
      notifyErr(err, "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runAction(fn: () => Promise<WorkOrder>, ok: string) {
    if (!id) return;
    setBusy(true);
    dismiss();
    try {
      applyOrder(await fn());
      notifyOk(ok);
    } catch (err) {
      notifyErr(err, "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleConfirmWorkOrderAction() {
    if (!id || !pendingConfirm) return;
    const action = pendingConfirm;
    setPendingConfirm(null);
    if (action.kind === "start") {
      void runAction(() => startWorkOrderExecution(id), "Execution started — team notified in app.");
    } else if (action.kind === "complete") {
      void runAction(() => completeWorkOrder(id), "Project marked complete.");
    } else if (action.kind === "handover") {
      void runAction(() => handoverWorkOrder(id), "Client handover recorded.");
    } else {
      void runAction(
        () => resolveWorkOrderSnag(id, action.snagId, "Resolved"),
        "Snag marked resolved.",
      );
    }
  }

  const confirmModal = pendingConfirm ? workOrderConfirmCopy(pendingConfirm) : null;

  function toggleMember(memberId: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((x) => x !== memberId) : [...prev, memberId],
    );
  }

  if (loading) {
    return (
      <AppShell activeNav="workorders">
        <p className="text-sm text-text-muted">Loading work order…</p>
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell activeNav="workorders">
        <p className="text-sm text-text-muted">Work order not found.</p>
        <Link to="/workorders" className="mt-2 text-sm text-ui-primary hover:underline">
          Back to list
        </Link>
      </AppShell>
    );
  }

  const showPlannerSetup = canPlan && !isLocked;
  const showFieldWorkbench = isField && !isLocked && (order.status === "In Progress" || order.status === "Snagging");
  const showTeamUpdates = canViewWorkOrders(role) || isField;
  return (
    <AppShell activeNav="workorders" pageTitle={order.workOrderNumber}>
      <BoqFeedbackPopup msg={msg} onDismiss={dismiss} />
      <ConfirmActionModal
        open={Boolean(confirmModal)}
        title={confirmModal?.title ?? ""}
        description={confirmModal?.description}
        itemLabel={confirmModal?.itemLabel}
        confirmLabel={confirmModal?.confirmLabel}
        tone={confirmModal?.tone}
        loading={busy}
        onCancel={() => setPendingConfirm(null)}
        onConfirm={handleConfirmWorkOrderAction}
      />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/workorders"
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {isField ? "my jobs" : "work orders"}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {showMaterialRequest ? (
              <Link
                to={`/materials/requests/new?workOrderId=${order._id}`}
                className={`${themeClasses.btnNavy} shrink-0`}
              >
                <Package className="h-4 w-4" />
                Request materials
              </Link>
            ) : null}
          </div>
        </div>

        <header className="overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(26,29,33,0.05)] ring-1 ring-black/5">
          <div className="flex flex-wrap items-start justify-between gap-2 bg-ui-primary px-3 py-2.5 sm:px-3.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Work order</p>
                <span className="inline-flex shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {order.status}
                </span>
              </div>
              <h1 className="mt-0.5 text-lg font-bold tracking-tight text-white sm:text-xl">
                {order.workOrderNumber}
              </h1>
              {order.projectName?.trim() ? (
                <p className="mt-0.5 truncate text-sm text-white/75">{order.projectName}</p>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-white/65">
                Contract (ex-tax)
              </span>
              <p className="mt-px text-base font-semibold tabular-nums text-white sm:text-lg">
                {formatMoney(order.approvedAmount)}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center justify-end gap-1.5">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    order.paymentStatus === "Paid"
                      ? "bg-emerald-500 text-white"
                      : order.paymentStatus === "Partially Paid"
                        ? "bg-amber-400 text-white"
                        : "bg-white/20 text-white"
                  }`}
                >
                  {order.paymentStatus === "Paid"
                    ? "Fully paid"
                    : order.paymentStatus || "Unpaid"}
                </span>
                {showFinance && order.paymentStatus !== "Paid" ? (
                  <Link
                    to={`/finance/invoices/new?workOrderId=${order._id}`}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-ui-primary shadow-sm transition hover:bg-white/90"
                  >
                    <Plus className="h-3 w-3" />
                    {order.paymentStatus === "Partially Paid" ? "Record payment" : "Create invoice"}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 text-sm sm:px-3.5">
            {order.scopeOfWork?.trim() && order.scopeOfWork.trim() !== order.projectName?.trim() ? (
              <p className="min-w-0 max-w-full text-text-secondary sm:max-w-[50%]">
                <span className="text-xs text-text-muted">Scope · </span>
                {order.scopeOfWork}
              </p>
            ) : null}
            {order.notes?.trim() ? (
              <p className="min-w-0 max-w-full text-text-secondary sm:max-w-[40%]">
                <span className="text-xs text-text-muted">Notes · </span>
                {order.notes}
              </p>
            ) : null}
            <p className="flex min-w-0 items-start gap-1.5 text-text-muted">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ui-primary" />
              <span className="break-words">{order.siteAddress?.trim() || "No address on file"}</span>
            </p>
          </div>
        </header>

        <JobPipeline
          order={order}
          nextStep={nextStep}
          busy={busy}
          canPlan={canPlan}
          openSnags={openSnags}
          hasPlanChanges={hasPlanChanges}
          onSavePlan={() => void handleSavePlan()}
          onStart={() => setPendingConfirm({ kind: "start" })}
          onComplete={() => setPendingConfirm({ kind: "complete" })}
          onHandover={() => setPendingConfirm({ kind: "handover" })}
        />

        {canPlan && openSnags > 0 ? (
          <OpenSnagsAlert count={openSnags} onViewSnags={scrollToWorkOrderSnags} />
        ) : null}

        <section id="work-order-overview" className="scroll-mt-24 space-y-3">
          <SectionGuide title="Job at a glance" description="Quick counts for this work order." />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryTile
              icon={Users}
              label="Assigned team"
              value={formatMemberCount(order.assignedTeam.length, "Unassigned")}
            />
            <SummaryTile icon={ClipboardList} label="Progress logs" value={String(order.progressLogs.length)} />
            <SummaryTile icon={Camera} label="Site photos" value={String(order.sitePhotos.length)} />
            <SummaryTile
              icon={Flag}
              label="Open snags"
              value={String(openSnags)}
              highlight={openSnags > 0}
              highlightText={openSnags > 0 ? "Needs attention" : undefined}
            />
          </div>
        </section>

        {showFinance ? (
          <div id="work-order-finance" className="scroll-mt-24">
            <WorkOrderInvoicesPanel workOrderId={order._id} title="Payment Overview" />
          </div>
        ) : null}

        {showPlannerSetup ? (
          <section id="work-order-plan" className="scroll-mt-24 space-y-3">
            <SectionGuide
              title="Plan, schedule & assign team"
              description="Assign the team and schedule, save, then start execution from the pipeline above."
            />
            <PlannerSetupCard
              busy={busy}
              teamOptions={teamOptions}
              selectedMemberIds={selectedMemberIds}
              onToggleMember={toggleMember}
              projectName={projectName}
              onProjectNameChange={setProjectName}
              scheduledStart={scheduledStart}
              onScheduledStartChange={setScheduledStart}
              targetCompletion={targetCompletion}
              onTargetCompletionChange={setTargetCompletion}
              notes={notes}
              onNotesChange={setNotes}
              hasPlanChanges={hasPlanChanges}
              onSavePlan={() => void handleSavePlan()}
            />
          </section>
        ) : null}

        {isViewer ? (
          <section id="work-order-plan" className="scroll-mt-24 space-y-3">
            <SectionGuide title="Project plan" description="Schedule and team are set by admin or manager." />
            <PlanReadOnlyCard order={order} />
          </section>
        ) : null}

        {showFieldWorkbench ? (
          <section id="work-order-site" className="scroll-mt-24 space-y-3">
            <SectionGuide
              title="Submit your site work"
              description="Log progress, upload photos, or report a snag."
            />
            <FieldWorkbench
            busy={busy}
            logNote={logNote}
            onLogNoteChange={setLogNote}
            onAddLog={() =>
              void runAction(async () => {
                const updated = await addWorkOrderProgressLog(id!, logNote.trim());
                setLogNote("");
                return updated;
              }, "Progress saved.")
            }
            snagText={snagText}
            onSnagTextChange={setSnagText}
            onReportSnag={() =>
              void runAction(async () => {
                const updated = await addWorkOrderSnag(id!, snagText.trim());
                setSnagText("");
                return updated;
              }, "Snag reported.")
            }
            photoCaption={photoCaption}
            onPhotoCaptionChange={setPhotoCaption}
            photoFiles={photoFiles}
            onPhotoFilesChange={setPhotoFiles}
            onUploadPhotos={() =>
              void runAction(async () => {
                const updated = await uploadWorkOrderPhotos(id!, Array.from(photoFiles ?? []), photoCaption);
                setPhotoFiles(null);
                setPhotoCaption("");
                return updated;
              }, "Photos uploaded.")
            }
            />
          </section>
        ) : null}

        {showTeamUpdates ? (
          <section
            id={showFieldWorkbench ? "work-order-snags" : "work-order-site"}
            className="scroll-mt-24 space-y-3"
          >
            {!showFieldWorkbench ? (
              <span id="work-order-snags" className="sr-only" />
            ) : null}
            <SectionGuide
              title="Updates from site team"
              description={
                showFieldWorkbench
                  ? "What you submit above appears here for your manager."
                  : "Read-only feed from field staff. Resolve open snags when fixed."
              }
            />
            <TeamUpdatesPanel
              order={order}
              readOnly={!showFieldWorkbench}
              busy={busy}
              canResolveSnags={canPlan}
              onResolveSnag={(snagId) => {
                const snag = order.snags.find((s) => s._id === snagId);
                setPendingConfirm({
                  kind: "resolve-snag",
                  snagId,
                  description: snag?.description?.trim() || "Snag item",
                });
              }}
            />
          </section>
        ) : null}

        <ActivityCard order={order} />
      </div>
    </AppShell>
  );
}

function SectionGuide({
  title,
  description,
}: {
  variant?: "action" | "overview" | "monitor";
  badge?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="min-w-0">
      <h2 className="text-base font-semibold tracking-tight text-text-primary">{title}</h2>
      {description ? <p className="mt-0.5 text-sm text-text-muted">{description}</p> : null}
    </div>
  );
}

const JOB_PIPELINE = [
  { id: "plan", label: "Plan" },
  { id: "ready", label: "Ready" },
  { id: "onsite", label: "On site" },
  { id: "complete", label: "Complete" },
  { id: "handover", label: "Handover" },
] as const;

function pipelineIndex(order: WorkOrder): number {
  // Return next incomplete step index. Handed Over = past last step (all filled).
  if (order.status === "Handed Over") return JOB_PIPELINE.length;
  if (order.status === "Completed") return 3;
  if (order.status === "In Progress" || order.status === "Snagging") return 2;
  if (order.status === "Scheduled" || order.status === "On Hold") {
    return order.assignedTeam.length > 0 ? 1 : 0;
  }
  if (order.status === "Cancelled") return -1;
  return order.assignedTeam.length > 0 ? 1 : 0;
}

function JobPipeline({
  order,
  nextStep,
  busy,
  canPlan,
  openSnags,
  hasPlanChanges,
  onSavePlan,
  onStart,
  onComplete,
  onHandover,
}: {
  order: WorkOrder;
  nextStep: NextStepAction | null;
  busy: boolean;
  canPlan: boolean;
  openSnags: number;
  hasPlanChanges: boolean;
  onSavePlan: () => void;
  onStart: () => void;
  onComplete: () => void;
  onHandover: () => void;
}) {
  const active = pipelineIndex(order);
  const cancelled = order.status === "Cancelled";
  const allDone = active >= JOB_PIPELINE.length;

  const showStart =
    canPlan &&
    (order.status === "Scheduled" || order.status === "On Hold") &&
    order.assignedTeam.length > 0;
  const showComplete =
    canPlan && (order.status === "In Progress" || order.status === "Snagging") && openSnags === 0;
  const showHandover = canPlan && order.status === "Completed";
  const showSave = canPlan && hasPlanChanges;

  return (
    <section className="app-card p-4 sm:p-5" aria-label="Job pipeline">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Job pipeline</p>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[order.status]}`}>
          {order.status}
        </span>
      </div>

      {cancelled ? (
        <p className="mt-3 text-sm text-rose-700">This work order was cancelled.</p>
      ) : (
        <ol className="relative mt-5 flex w-full items-start justify-between">
          {/* Full-width track behind nodes — no side gaps */}
          <li className="pointer-events-none absolute left-4 right-4 top-4 h-0.5" aria-hidden>
            <span className="absolute inset-0 bg-slate-200" />
            <span
              className="absolute inset-y-0 left-0 bg-ui-primary transition-all"
              style={{
                width: allDone
                  ? "100%"
                  : active <= 0
                    ? "0%"
                    : `${(active / (JOB_PIPELINE.length - 1)) * 100}%`,
              }}
            />
          </li>

          {JOB_PIPELINE.map((stage, i) => {
            const done = active > i;
            const current = !allDone && active === i;
            return (
              <li key={stage.id} className="relative z-[1] flex flex-col items-center text-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-sm ${
                    done
                      ? "bg-ui-primary text-white"
                      : current
                        ? "bg-white text-ui-primary ring-2 ring-ui-primary ring-offset-2"
                        : "bg-white text-slate-400 ring-2 ring-slate-200"
                  }`}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} /> : i + 1}
                </span>
                <span
                  className={`mt-2 max-w-[4.5rem] text-[11px] font-semibold leading-tight sm:max-w-none sm:text-xs ${
                    current ? "text-ui-primary" : done ? "text-text-primary" : "text-text-muted"
                  }`}
                >
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {nextStep && !cancelled && !allDone ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-surface-border-light pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">{nextStep.title}</p>
            <p className="mt-0.5 text-xs text-text-muted sm:text-sm">{nextStep.description}</p>
            {showStart && hasPlanChanges ? (
              <p className="mt-1.5 text-xs font-medium text-amber-800">Save the plan below before starting.</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {showSave ? (
              <button type="button" disabled={busy} onClick={onSavePlan} className={themeClasses.btnNavy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save plan
              </button>
            ) : null}
            {showStart ? (
              <button
                type="button"
                disabled={busy || hasPlanChanges}
                onClick={onStart}
                className={themeClasses.btnPrimary}
              >
                Start execution
              </button>
            ) : null}
            {showComplete ? (
              <button type="button" disabled={busy} onClick={onComplete} className={themeClasses.btnSuccess}>
                Mark complete
              </button>
            ) : null}
            {showHandover ? (
              <button type="button" disabled={busy} onClick={onHandover} className={themeClasses.btnNavy}>
                Client handover
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  highlight,
  highlightText,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  highlight?: boolean;
  highlightText?: string;
}) {
  return (
    <article className={`app-card p-3.5 ${highlight ? "ring-2 ring-orange-300 bg-orange-50/50" : ""}`}>
      <Icon className={`h-5 w-5 ${highlight ? "text-orange-600" : "text-ui-primary"}`} />
      <p className="mt-2 text-xs text-text-muted">{label}</p>
      <p className="text-base font-semibold">{value}</p>
      {highlightText ? <p className="mt-1 text-xs font-medium text-orange-700">{highlightText}</p> : null}
    </article>
  );
}

function TeamAssignPicker({
  teamOptions,
  selectedMemberIds,
  onToggleMember,
  disabled,
}: {
  teamOptions: TeamMember[];
  selectedMemberIds: string[];
  onToggleMember: (id: string) => void;
  disabled?: boolean;
}) {
  const available = teamOptions.filter((m) => !selectedMemberIds.includes(m._id));
  const selected = teamOptions.filter((m) => selectedMemberIds.includes(m._id));

  function handleAdd(e: ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (id) onToggleMember(id);
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      <div className="max-w-xl">
        <label htmlFor="wo-team-add" className="mb-1 block text-sm font-medium text-text-primary">
          Add team members
        </label>
        <div className="relative">
          <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <select
            id="wo-team-add"
            disabled={disabled || available.length === 0}
            onChange={handleAdd}
            defaultValue=""
            className={`${themeClasses.input} w-full appearance-none py-2 pl-9 pr-8`}
          >
            <option value="" disabled>
              {available.length === 0 ? "Everyone available is already assigned" : "Choose a team member…"}
            </option>
            {available.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name} — {roleLabel(m.role)}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-xs text-text-muted">Pick from the list; add as many as needed. Remove with × below.</p>
      </div>

      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Assigned team">
          {selected.map((m) => (
            <li
              key={m._id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-ui-primary/30 bg-ui-primary-light py-1 pl-3 pr-1.5 text-sm"
            >
              <span className="truncate font-medium text-text-primary">{m.name}</span>
              <span className="shrink-0 text-xs text-text-muted">{roleLabel(m.role)}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onToggleMember(m._id)}
                className="rounded-full p-0.5 text-text-muted transition hover:bg-white/80 hover:text-rose-600 disabled:opacity-50"
                aria-label={`Remove ${m.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-surface-border bg-surface-muted/40 px-3 py-2 text-sm text-text-muted">
          No team members selected yet.
        </p>
      )}
    </div>
  );
}

function StepCard({
  step,
  title,
  subtitle,
  children,
  highlight,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="border-t border-surface-border-light pt-4 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-start gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            highlight ? "bg-ui-primary text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {step}
        </span>
        <div>
          <h3 className="font-semibold text-text-primary">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p> : null}
        </div>
      </div>
      <div className="sm:pl-10">{children}</div>
    </div>
  );
}

function PlannerSetupCard({
  busy,
  teamOptions,
  selectedMemberIds,
  onToggleMember,
  projectName,
  onProjectNameChange,
  scheduledStart,
  onScheduledStartChange,
  targetCompletion,
  onTargetCompletionChange,
  notes,
  onNotesChange,
  hasPlanChanges,
  onSavePlan,
}: {
  busy: boolean;
  teamOptions: TeamMember[];
  selectedMemberIds: string[];
  onToggleMember: (id: string) => void;
  projectName: string;
  onProjectNameChange: (v: string) => void;
  scheduledStart: string;
  onScheduledStartChange: (v: string) => void;
  targetCompletion: string;
  onTargetCompletionChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  hasPlanChanges: boolean;
  onSavePlan: () => void;
}) {
  const needsTeam = selectedMemberIds.length === 0;

  return (
    <article id="work-order-setup" className="app-card scroll-mt-4 p-4 sm:p-5">
      <div className="space-y-4">
        <StepCard step={1} title="Assign project team" subtitle="Who will work on site?" highlight={needsTeam}>
          {teamOptions.length === 0 ? (
            <p className="mb-3 text-sm text-amber-900">
              No active team members found. Add field staff under <strong>Team</strong>, then return here.
            </p>
          ) : (
            <TeamAssignPicker
              teamOptions={teamOptions}
              selectedMemberIds={selectedMemberIds}
              onToggleMember={onToggleMember}
              disabled={busy}
            />
          )}
        </StepCard>

        <StepCard step={2} title="Schedule" subtitle="When should work happen?">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Project name" value={projectName} onChange={onProjectNameChange} disabled={busy} />
            <Field label="Start date" type="date" value={scheduledStart} onChange={onScheduledStartChange} disabled={busy} />
            <Field label="Target finish" type="date" value={targetCompletion} onChange={onTargetCompletionChange} disabled={busy} />
          </div>
          <div className="mt-3">
            <Field label="Notes for the team" value={notes} onChange={onNotesChange} disabled={busy} multiline />
          </div>
        </StepCard>

        <div className="flex flex-col gap-2 border-t border-surface-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-muted">
            {hasPlanChanges ? "You have unsaved changes" : "No changes to save yet"}
          </p>
          <button type="button" disabled={busy || !hasPlanChanges} onClick={onSavePlan} className={themeClasses.btnNavy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save plan
          </button>
        </div>
      </div>
    </article>
  );
}

function PlanReadOnlyCard({ order }: { order: WorkOrder }) {
  return (
    <article className="app-card p-4 sm:p-5">
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-text-muted">Schedule</dt>
          <dd className="font-medium">
            {formatDate(order.scheduledStart)} → {formatDate(order.targetCompletion)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Team</dt>
          <dd className="font-medium">{order.assignedTeam.map((m) => m.name).join(", ") || "Not assigned"}</dd>
        </div>
      </dl>
      {order.notes ? <p className="mt-2 text-xs text-text-secondary">{order.notes}</p> : null}
    </article>
  );
}

function FieldWorkbench({
  busy,
  logNote,
  onLogNoteChange,
  onAddLog,
  snagText,
  onSnagTextChange,
  onReportSnag,
  photoCaption,
  onPhotoCaptionChange,
  photoFiles,
  onPhotoFilesChange,
  onUploadPhotos,
}: {
  busy: boolean;
  logNote: string;
  onLogNoteChange: (v: string) => void;
  onAddLog: () => void;
  snagText: string;
  onSnagTextChange: (v: string) => void;
  onReportSnag: () => void;
  photoCaption: string;
  onPhotoCaptionChange: (v: string) => void;
  photoFiles: FileList | null;
  onPhotoFilesChange: (f: FileList | null) => void;
  onUploadPhotos: () => void;
}) {
  return (
    <article className="app-card p-4 sm:p-5">
      <div className="grid gap-3 md:grid-cols-3 md:items-stretch">
        <ActionTile
          step={1}
          icon={ClipboardList}
          title="Daily progress"
          description="What did you do today?"
          accent="bg-ui-primary-light text-ui-primary"
          footer={
            <button
              type="button"
              disabled={busy || !logNote.trim()}
              onClick={onAddLog}
              className={`${themeClasses.btnNavy} w-full justify-center`}
            >
              Submit update
            </button>
          }
        >
          <textarea
            value={logNote}
            disabled={busy}
            onChange={(e) => onLogNoteChange(e.target.value)}
            placeholder="e.g. Completed kitchen wrap, 80% done…"
            className="h-full min-h-0 w-full flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </ActionTile>

        <ActionTile
          step={2}
          icon={Camera}
          title="Site photos"
          description="Show progress on site"
          accent="bg-amber-50 text-amber-800"
          footer={
            <button
              type="button"
              disabled={busy || !photoFiles?.length}
              onClick={onUploadPhotos}
              className={`${themeClasses.btnNavy} w-full justify-center`}
            >
              Upload{photoFiles?.length ? ` (${photoFiles.length})` : ""}
            </button>
          }
        >
          <div className="flex h-full min-h-0 flex-1 flex-col gap-2">
            <FilePickField
              accept="image/*"
              multiple
              compact
              disabled={busy}
              files={photoFiles}
              onFilesChange={onPhotoFilesChange}
              title="Choose photos"
              hint="JPG, PNG · multiple OK"
              tone="amber"
              icon={<Camera className="h-6 w-6 shrink-0 text-amber-700" strokeWidth={1.75} />}
            />
            <input
              value={photoCaption}
              onChange={(e) => onPhotoCaptionChange(e.target.value)}
              placeholder="Caption (optional)"
              className="w-full shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </ActionTile>

        <ActionTile
          step={3}
          icon={Flag}
          title="Report a snag"
          description="Issue that needs attention"
          accent="bg-orange-50 text-orange-800"
          footer={
            <button
              type="button"
              disabled={busy || snagText.trim().length < 3}
              onClick={onReportSnag}
              className={`${themeClasses.btnNavy} w-full justify-center`}
            >
              Report snag
            </button>
          }
        >
          <textarea
            value={snagText}
            disabled={busy}
            onChange={(e) => onSnagTextChange(e.target.value)}
            placeholder="Describe the problem…"
            className="h-full min-h-0 w-full flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </ActionTile>
      </div>
    </article>
  );
}

function ActionTile({
  step,
  icon: Icon,
  title,
  description,
  accent,
  children,
  footer,
}: {
  step: number;
  icon: typeof ClipboardList;
  title: string;
  description: string;
  accent: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border-2 border-surface-border bg-surface-muted/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ui-primary text-xs font-bold text-white">
          {step}
        </span>
        <span className={`inline-flex rounded-lg p-2 ${accent}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <h3 className="font-semibold text-text-primary">{title}</h3>
      <p className="mt-0.5 min-h-[2rem] text-xs leading-snug text-text-muted">{description}</p>
      <div className="mt-3 flex h-[168px] flex-col">{children}</div>
      <div className="mt-3 w-full shrink-0 pt-1">{footer}</div>
    </div>
  );
}

function TeamUpdatesPanel({
  order,
  readOnly,
  busy,
  canResolveSnags,
  onResolveSnag,
}: {
  order: WorkOrder;
  readOnly: boolean;
  busy: boolean;
  canResolveSnags: boolean;
  onResolveSnag: (snagId: string) => void;
}) {
  const empty = order.progressLogs.length === 0 && order.sitePhotos.length === 0 && order.snags.length === 0;

  return (
    <article className="app-card space-y-5 p-4 sm:p-5">
      {empty ? (
        <div className="rounded-lg border border-dashed border-surface-border-light bg-white py-10 text-center text-sm text-text-muted">
          No site updates yet. {readOnly ? "Waiting for the assigned team." : "Submit your first update above."}
        </div>
      ) : (
        <div className="space-y-5">
          {order.progressLogs.length > 0 ? (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <ClipboardList className="h-4 w-4 text-ui-primary" />
                Progress log
              </h3>
              <ul className="relative space-y-0">
                {order.progressLogs.map((log, i) => {
                  const isLast = i === order.progressLogs.length - 1;
                  return (
                    <li key={log._id} className="relative flex gap-3 pb-4 last:pb-0">
                      {!isLast ? (
                        <span
                          className="absolute left-[7px] top-4 bottom-0 w-px bg-slate-200"
                          aria-hidden
                        />
                      ) : null}
                      <span
                        className="relative z-[1] mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-ui-primary bg-white"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1 rounded-lg border border-surface-border-light bg-white px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <p className="text-xs font-semibold text-ui-primary">{formatDate(log.logDate)}</p>
                          <span className="text-xs text-text-muted">· {log.createdBy}</span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-text-primary">{log.note}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {order.sitePhotos.length > 0 ? (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Camera className="h-4 w-4 text-ui-primary" />
                Photos
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {order.sitePhotos.map((p) => (
                  <div key={p._id}>
                    <ImagePreviewThumb
                      src={getMediaUrl(p.url)}
                      alt={p.caption || "Site"}
                      className="aspect-square w-full"
                      imgClassName="h-full w-full object-cover"
                    />
                    <p className="mt-1 truncate text-xs text-text-muted">{p.uploadedBy}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {order.snags.length > 0 ? (
            <section id="work-order-snag-list" className="scroll-mt-24">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Flag className="h-4 w-4 text-orange-600" />
                Snags
                {openSnagCount(order.snags) > 0 ? (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
                    {openSnagCount(order.snags)} open
                  </span>
                ) : null}
              </h3>
              <ul className="space-y-2.5">
                {order.snags.map((s) => (
                  <li
                    key={s._id}
                    className={`rounded-lg border px-3.5 py-3 text-sm ${
                      s.status === "open"
                        ? "border-orange-200 bg-orange-50/60"
                        : "border-surface-border-light bg-white"
                    }`}
                  >
                    <p className="font-medium leading-snug">{s.description}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {s.status} · {s.reportedBy} · {formatDate(s.reportedAt)}
                    </p>
                    {s.status === "open" && canResolveSnags ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onResolveSnag(s._id)}
                        className="mt-1.5 text-xs font-medium text-ui-primary hover:underline"
                      >
                        Mark resolved
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </article>
  );
}

function ActivityCard({ order }: { order: WorkOrder }) {
  return (
    <details className="app-card group">
      <summary className="cursor-pointer list-none p-4 text-sm font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
        Activity history
        <span className="ml-1.5 text-xs font-normal text-text-muted">({order.activityTimeline.length})</span>
      </summary>
      <ul className="max-h-48 space-y-1 overflow-y-auto border-t border-surface-border px-3 pb-3 pt-2 text-xs">
        {order.activityTimeline.map((a, i) => (
          <li key={`${a.action}-${i}`} className="border-b border-slate-100 pb-1.5">
            <p className="font-medium">{a.action}</p>
            <p className="text-text-secondary">{a.note}</p>
            <p className="text-xs text-text-muted">
              {a.createdBy} · {new Date(a.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-text-primary">{label}</label>
      {multiline ? (
        <textarea
          rows={2}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
        />
      ) : (
        <input
          type={type}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
        />
      )}
    </div>
  );
}
