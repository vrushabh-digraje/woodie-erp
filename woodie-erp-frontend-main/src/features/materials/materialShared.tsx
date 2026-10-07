import type { MaterialRequestStatus } from "./materialTypes";

export const materialRequestStatusBadge: Record<MaterialRequestStatus, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Approved: "bg-sky-100 text-sky-800",
  Issued: "bg-emerald-100 text-emerald-800",
  "Procurement Needed": "bg-orange-100 text-orange-800",
  Rejected: "bg-rose-100 text-rose-800",
};

export function MaterialRequestStatusBadge({ status }: { status: MaterialRequestStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${materialRequestStatusBadge[status]}`}
    >
      {status}
    </span>
  );
}

export function stockLevelTone(current: number, min: number): string {
  if (current <= 0) return "text-rose-600";
  if (current <= min) return "text-amber-700";
  return "text-text-primary";
}

export type FlowStepState = "done" | "current" | "upcoming" | "skipped";

export type MaterialFlowStep = {
  id: string;
  label: string;
  state: FlowStepState;
};

/** Map request status to flowchart steps (procurement sub-steps shown as note when applicable). */
export function materialRequestFlowSteps(status: MaterialRequestStatus): MaterialFlowStep[] {
  const steps: { id: string; label: string }[] = [
    { id: "create", label: "Assigned team creates request" },
    { id: "approve", label: "Manager approval" },
    { id: "check", label: "Inventory check (auto)" },
    { id: "branch", label: "Stock available?" },
    { id: "issue", label: "Issue to work order" },
  ];

  const stateFor = (stepId: string): FlowStepState => {
    if (status === "Rejected") {
      if (stepId === "create") return "done";
      if (stepId === "approve") return "skipped";
      return "skipped";
    }

    if (status === "Pending") {
      if (stepId === "create") return "done";
      if (stepId === "approve") return "current";
      return "upcoming";
    }

    if (status === "Approved") {
      if (["create", "approve"].includes(stepId)) return "done";
      if (stepId === "check") return "current";
      return "upcoming";
    }

    if (status === "Issued") {
      return "done";
    }

    if (status === "Procurement Needed") {
      if (["create", "approve", "check", "branch"].includes(stepId)) return "done";
      if (stepId === "issue") return "current";
      return "upcoming";
    }

    return "upcoming";
  };

  return steps.map((s) => ({ ...s, state: stateFor(s.id) }));
}

export function MaterialRequestFlowSteps({ status }: { status: MaterialRequestStatus }) {
  const steps = materialRequestFlowSteps(status);
  const showProcurementNote = status === "Procurement Needed";

  return (
    <div className="rounded-lg border border-surface-border-light bg-surface-muted/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
        Material & procurement flow
      </p>
      <ol className="mt-2 space-y-1.5">
        {steps.map((step, i) => (
          <li key={step.id} className="flex items-start gap-2 text-xs">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                step.state === "done"
                  ? "bg-emerald-600 text-white"
                  : step.state === "current"
                    ? "bg-ui-primary text-white"
                    : step.state === "skipped"
                      ? "bg-rose-100 text-rose-600 line-through"
                      : "bg-slate-200 text-slate-500"
              }`}
            >
              {step.state === "done" ? "✓" : i + 1}
            </span>
            <span
              className={
                step.state === "current"
                  ? "font-medium text-text-primary"
                  : step.state === "skipped"
                    ? "text-rose-600 line-through"
                    : "text-text-secondary"
              }
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>
      {showProcurementNote ? (
        <p className="mt-2 border-t border-surface-border-light pt-2 text-[11px] leading-relaxed text-orange-800">
          Purchase path: RFQ (2+ vendors) → compare quotes → PO → delivery → GRN & inspection → accept →
          then issue to work order.
        </p>
      ) : null}
    </div>
  );
}
