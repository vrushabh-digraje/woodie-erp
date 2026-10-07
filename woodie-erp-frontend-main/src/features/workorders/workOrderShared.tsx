import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Flag,
  Handshake,
  Play,
  Users,
  type LucideIcon,
} from "lucide-react";
import { formatCount } from "../../lib/formatCount";
import type { WorkOrder, WorkOrderStatus } from "./workOrderTypes";

export const WORK_ORDER_STATUS_OPTIONS: WorkOrderStatus[] = [
  "Scheduled",
  "In Progress",
  "On Hold",
  "Snagging",
  "Completed",
  "Handed Over",
  "Cancelled",
];

export const statusBadge: Record<WorkOrderStatus, string> = {
  Scheduled: "bg-slate-100 text-slate-700",
  "In Progress": "bg-ui-primary-light text-ui-primary",
  "On Hold": "bg-amber-100 text-amber-800",
  Snagging: "bg-orange-100 text-orange-800",
  Completed: "bg-emerald-100 text-emerald-800",
  "Handed Over": "bg-indigo-100 text-indigo-800",
  Cancelled: "bg-rose-100 text-rose-800",
};

export function openSnagCount(snags: { status: string }[]) {
  return snags.filter((s) => s.status === "open").length;
}

export type NextStepAction = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "primary" | "warning" | "success" | "neutral";
};

export function getNextStep(order: WorkOrder, role: "planner" | "field" | "viewer"): NextStepAction | null {
  const openSnags = openSnagCount(order.snags);
  const hasTeam = order.assignedTeam.length > 0;

  if (order.status === "Handed Over" || order.status === "Cancelled") {
    return {
      id: "done",
      title: "Job closed",
      description: "No further action required.",
      icon: CheckCircle2,
      tone: "success",
    };
  }

  if (role === "field") {
    if (order.status === "Scheduled" || order.status === "On Hold") {
      return {
        id: "wait",
        title: "Waiting to start",
        description: "Your manager will start execution on site. Check back soon.",
        icon: Calendar,
        tone: "neutral",
      };
    }
    if (openSnags > 0 && order.status === "Snagging") {
      return {
        id: "snags",
        title: "Resolve snags on site",
        description: `${formatCount(openSnags, "open issue", "open issues")} need attention. Update logs and mark resolved when fixed.`,
        icon: Flag,
        tone: "warning",
      };
    }
    return {
      id: "field-work",
      title: "Update your manager",
      description: "Add today’s progress, site photos, or report any issues below.",
      icon: ClipboardList,
      tone: "primary",
    };
  }

  if (role === "viewer") {
    return {
      id: "monitor",
      title: "Monitor site updates",
      description: "Review progress logs, photos, and snags submitted by the field team.",
      icon: ClipboardList,
      tone: "neutral",
    };
  }

  // planner (manager)
  if (!hasTeam) {
    return {
      id: "team",
      title: "Step 1 — Assign your team",
      description: "Select who will work on site, then save the plan.",
      icon: Users,
      tone: "primary",
    };
  }
  if (order.status === "Scheduled" || order.status === "On Hold") {
    return {
      id: "start",
      title: "Step 2 — Start execution",
      description: "Save the plan, then press Start execution so the team can work on site.",
      icon: Play,
      tone: "primary",
    };
  }
  if (order.status === "Snagging" || openSnags > 0) {
    return {
      id: "snags-resolve",
      title: "Snags need resolution",
      description: `${formatCount(openSnags, "open snag", "open snags")}. Ask the team to fix, or mark resolved when done.`,
      icon: Flag,
      tone: "warning",
    };
  }
  if (order.status === "In Progress") {
    return {
      id: "complete",
      title: "When work is finished",
      description: "Review team updates below, then mark the project complete.",
      icon: CheckCircle2,
      tone: "success",
    };
  }
  if (order.status === "Completed") {
    return {
      id: "handover",
      title: "Final step — Client handover",
      description: "Confirm the client has received the completed work.",
      icon: Handshake,
      tone: "primary",
    };
  }
  return null;
}

export function plannerChecklist(order: WorkOrder) {
  const hasTeam = order.assignedTeam.length > 0;
  const hasSchedule = Boolean(order.scheduledStart || order.targetCompletion);
  const started = Boolean(order.executionStartedAt);
  const done = order.status === "Completed" || order.status === "Handed Over";

  return [
    { label: "Team assigned", done: hasTeam },
    { label: "Schedule set", done: hasSchedule },
    { label: "Execution started", done: started },
    { label: "Project completed", done: done },
  ];
}
