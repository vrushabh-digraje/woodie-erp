import { CheckCircle2, CircleDashed, CircleX } from "lucide-react";
import type { InquiryStatus } from "../services/inquiryTypes";

type InquiryWorkflowPanelProps = {
  status: InquiryStatus;
};

export default function InquiryWorkflowPanel({ status }: InquiryWorkflowPanelProps) {
  const steps = [
    { label: "Created", done: true, rejected: false },
    {
      label: status === "Visit Rejected" ? "Rejected" : "Approved",
      done: status !== "Visit Pending Approval",
      rejected: status === "Visit Rejected",
    },
    { label: "Site report", done: status === "Site Report Attached", rejected: false },
  ];

  return (
    <article className="site-survey-panel flex flex-col overflow-hidden">
      <div className="border-b border-site-border px-4 py-2.5">
        <p className="text-xs font-semibold text-text-primary">Workflow</p>
      </div>

      <ol className="relative px-4 py-3 sm:px-5">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const Icon = step.rejected ? CircleX : step.done ? CheckCircle2 : CircleDashed;
          const lineActive = step.done && !step.rejected;

          return (
            <li key={step.label} className={`relative flex gap-2.5 ${isLast ? "" : "pb-5"}`}>
              {!isLast ? (
                <span
                  className={`absolute left-[13px] top-7 h-[calc(100%-4px)] w-px ${
                    lineActive ? "bg-emerald-300" : "bg-surface-border"
                  }`}
                  aria-hidden
                />
              ) : null}
              <span
                className={`relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2 ring-white ${
                  step.rejected
                    ? "bg-rose-100 text-rose-600"
                    : step.done
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-surface-muted text-text-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <p
                className={`pt-1 text-xs font-semibold leading-none ${
                  step.done || step.rejected ? "text-text-primary" : "text-text-muted"
                }`}
              >
                {step.label}
              </p>
            </li>
          );
        })}
      </ol>
    </article>
  );
}
