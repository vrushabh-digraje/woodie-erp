import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MoreVertical } from "lucide-react";
import type { Inquiry, InquiryStatus } from "../../inquiry/services/inquiryTypes";
import { inquiryStatusPillClass, inquiryStatusShortLabel } from "../../inquiry/components/inquiryShared";
import { canManageBoq } from "../../auth/permissions";
import type { UserRole } from "../../auth/authTypes";
import {
  DataTable,
  DataTableBody,
  DataTableHeadRow,
  DataTableHeader,
  DataTableTh,
} from "../../../components/list/DataTable";
import { themeClasses } from "../../../theme/classes";

const TAB_STATUS: Record<string, InquiryStatus> = {
  approval: "Visit Pending Approval",
  new: "Visit Approved",
  estimates: "Site Report Attached",
};

const TABS = [
  { key: "approval" as const, label: "Approval" },
  { key: "new" as const, label: "New orders" },
  { key: "estimates" as const, label: "Estimates" },
];

const rowAction: Partial<Record<InquiryStatus, { label: string; className: string }>> = {
  "Visit Pending Approval": {
    label: "Review",
    className: "bg-accent-blue-light text-accent-blue hover:opacity-90",
  },
  "Visit Approved": {
    label: "Site survey",
    className: "bg-accent-amber-light text-accent-amber hover:opacity-90",
  },
  "Site Report Attached": {
    label: "BOQ",
    className: "bg-ui-primary text-text-on-primary hover:bg-ui-primary-hover",
  },
  "Visit Rejected": {
    label: "View",
    className: "bg-surface-muted text-text-secondary hover:bg-surface-border-light",
  },
  Won: {
    label: "View won",
    className: "bg-emerald-100 text-emerald-800 hover:opacity-90",
  },
  Lost: {
    label: "View",
    className: "bg-rose-100 text-rose-800 hover:opacity-90",
  },
};

type DashboardTasksTableProps = {
  inquiries: Inquiry[];
  role: UserRole;
};

export default function DashboardTasksTable({ inquiries, role }: DashboardTasksTableProps) {
  const [tab, setTab] = useState<keyof typeof TAB_STATUS>("approval");
  const statusFilter = TAB_STATUS[tab];
  const showBoq = canManageBoq(role);

  const counts = useMemo(
    () => ({
      approval: inquiries.filter((i) => i.status === "Visit Pending Approval").length,
      new: inquiries.filter((i) => i.status === "Visit Approved").length,
      estimates: inquiries.filter((i) => i.status === "Site Report Attached").length,
    }),
    [inquiries],
  );

  const filtered = useMemo(() => inquiries.filter((i) => i.status === statusFilter), [inquiries, statusFilter]);
  const shown = filtered.slice(0, 10);

  return (
    <section className="dashboard-card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-surface-border-light px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">My tasks</h3>
          <p className="mt-0.5 text-xs text-text-muted">Work items that need your attention</p>
        </div>

        <div className="inline-flex rounded-lg border border-surface-border-light bg-surface-muted p-1">
          {TABS.map(({ key, label }) => {
            const count = counts[key];
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-surface-card text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {label}
                <span
                  className={`ml-1.5 tabular-nums ${active ? "text-ui-primary" : "text-text-muted"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border-light px-5 py-3">
        <select className="dashboard-filter py-2 text-xs">
          <option>All categories</option>
        </select>
        <p className="text-xs text-text-muted">
          {shown.length === 0
            ? "No items"
            : `Showing ${shown.length} of ${filtered.length}`}
        </p>
      </div>

      <DataTable minWidth="720px" className="border-0 shadow-none">
          <DataTableHeader>
            <DataTableHeadRow>
              <DataTableTh>#</DataTableTh>
              <DataTableTh>Client</DataTableTh>
              <DataTableTh>Inquiry</DataTableTh>
              <DataTableTh>Category</DataTableTh>
              <DataTableTh>Status</DataTableTh>
              <DataTableTh>Action</DataTableTh>
              <DataTableTh className="w-10">{""}</DataTableTh>
            </DataTableHeadRow>
          </DataTableHeader>
          <DataTableBody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-text-muted">
                  No items in this list.
                </td>
              </tr>
            ) : (
              shown.map((row, i) => {
                const action = rowAction[row.status];
                return (
                  <tr
                    key={row._id}
                    className="border-b border-surface-border-light/80 transition-colors last:border-0 hover:bg-surface-muted/60"
                  >
                    <td className="px-5 py-3.5 text-xs tabular-nums text-text-muted">{i + 1}</td>
                    <td className="px-3 py-3.5 font-medium text-text-primary">{row.clientName}</td>
                    <td className="px-3 py-3.5">
                      <span className="font-mono text-xs font-medium text-ui-primary">
                        {row.inquiryNumber}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-text-secondary">{row.category}</td>
                    <td className="px-3 py-3.5">
                      <span className={inquiryStatusPillClass(row.status)}>
                        {inquiryStatusShortLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          to={`/inquiry/inquiries/${row._id}`}
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                            action?.className ?? themeClasses.btnGhost
                          }`}
                        >
                          {action?.label ?? "Open"}
                          <ArrowRight className="h-3 w-3 opacity-70" />
                        </Link>
                        {showBoq && row.status === "Site Report Attached" ? (
                          <Link
                            to={`/inquiry/inquiries/${row._id}`}
                            className="inline-flex rounded-md border border-surface-border-light bg-surface-card px-2.5 py-1 text-[11px] font-semibold text-text-secondary transition hover:bg-surface-muted"
                          >
                            Quotation
                          </Link>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <Link
                        to={`/inquiry/inquiries/${row._id}`}
                        className="inline-flex rounded-md p-1.5 text-text-muted transition hover:bg-surface-muted hover:text-text-primary"
                        aria-label="Open inquiry"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </DataTableBody>
      </DataTable>
    </section>
  );
}
