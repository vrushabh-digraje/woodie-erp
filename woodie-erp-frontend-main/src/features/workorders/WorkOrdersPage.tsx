import { useCallback, useEffect, useState } from "react";
import { Eye, Search, Trash2 } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal";
import {
  DataTable,
  DataTableBody,
  DataTableHeadRow,
  DataTableHeader,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "../../components/list/DataTable";
import PaginationBar from "../../components/list/PaginationBar";
import { ListActionRow, ListIconButton, ListIconLink } from "../../components/list/ListActionButtons";
import { TruncatedText } from "../../components/TruncatedText";
import { canDeleteWorkOrder } from "../../lib/deleteRules";
import { formatMemberCount } from "../../lib/formatCount";
import { formatMoney } from "../../lib/formatMoney";
import { themeClasses } from "../../theme/classes";
import { useAuth } from "../auth/AuthContext";
import { canManageWorkOrders } from "../auth/permissions";
import { BoqFeedbackPopup, useBoqFeedback } from "../boq/boqFeedback";
import { deleteWorkOrder, getWorkOrdersPage } from "./workOrderApi";
import { statusBadge, WORK_ORDER_STATUS_OPTIONS } from "./workOrderShared";
import type { WorkOrder, WorkOrderStatus } from "./workOrderTypes";
import { isFieldRole } from "../auth/permissions";

const STATUS_OPTIONS: Array<WorkOrderStatus | "All"> = ["All", ...WORK_ORDER_STATUS_OPTIONS];

function WorkOrdersPage() {
  const { user } = useAuth();
  const role = user?.role ?? "sales";
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | "All">("All");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<WorkOrder | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const { msg, notifyOk, notifyErr, dismiss } = useBoqFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWorkOrdersPage(search, statusFilter, page, 20);
      setOrders(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmDeleteWorkOrder() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    dismiss();
    try {
      await deleteWorkOrder(deleteTarget._id);
      const label = deleteTarget.workOrderNumber;
      setDeleteTarget(null);
      notifyOk(`Work order ${label} deleted.`);
      await load();
    } catch (err) {
      notifyErr(err, "Could not delete work order.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <AppShell
      activeNav="workorders"
      pageTitle={isFieldRole(role) ? "My jobs" : "Work Orders"}
      pageSubtitle={isFieldRole(role) ? "Work orders assigned to you" : "Jobs created from won quotations"}
    >
      <BoqFeedbackPopup msg={msg} onDismiss={dismiss} />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete work order?"
        description="Only unused scheduled work orders can be removed. The won quotation stays — you can create a new work order later."
        itemLabel={deleteTarget ? `${deleteTarget.workOrderNumber} · ${deleteTarget.projectName}` : ""}
        loading={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDeleteWorkOrder()}
      />
      <div className="space-y-4">
        <section className={themeClasses.cardPadding}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className={themeClasses.sectionTitle}>All work orders</h2>
              {canManageWorkOrders(role) ? (
                <p className="mt-1 text-sm text-text-muted">
                  Create a work order from a won quotation on the BOQ detail page.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className={`${themeClasses.searchBar} sm:w-64`}>
                <Search className="h-4 w-4 shrink-0 text-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search work orders"
                  className={themeClasses.searchInput}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as WorkOrderStatus | "All");
                  setPage(1);
                }}
                className={themeClasses.select}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-border bg-surface-muted/50 px-6 py-12 text-center">
              <p className="text-sm font-medium text-text-primary">No work orders yet</p>
              <p className="mt-1 text-xs text-text-muted">
                Mark a quotation as Won, then create a work order from its detail page.
              </p>
            </div>
          ) : (
            <>
              <ul className="space-y-3 md:hidden">
                {orders.map((wo) => (
                  <li key={wo._id} className="rounded-xl border border-surface-border bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-ui-primary">{wo.workOrderNumber}</p>
                        <p className="truncate font-semibold">{wo.projectName}</p>
                        <p className="truncate text-sm text-text-muted">{wo.clientName}</p>
                        <p className="mt-1 text-sm font-medium">{formatMoney(wo.approvedAmount)}</p>
                        <span
                          className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[wo.status]}`}
                        >
                          {wo.status}
                        </span>
                      </div>
                      <ListActionRow>
                        {canManageWorkOrders(role) && canDeleteWorkOrder(wo, role) ? (
                          <ListIconButton label="Delete" onClick={() => setDeleteTarget(wo)}>
                            <Trash2 className="h-4 w-4" />
                          </ListIconButton>
                        ) : null}
                        <ListIconLink to={`/workorders/${wo._id}`} label="Open">
                          <Eye className="h-4 w-4" />
                        </ListIconLink>
                      </ListActionRow>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
                <DataTable>
                  <DataTableHeader>
                    <DataTableHeadRow>
                      <DataTableTh>Number</DataTableTh>
                      <DataTableTh>Project</DataTableTh>
                      <DataTableTh>Client</DataTableTh>
                      <DataTableTh>Status</DataTableTh>
                      <DataTableTh>Amount</DataTableTh>
                      <DataTableTh>Team</DataTableTh>
                      <DataTableTh align="right">Action</DataTableTh>
                    </DataTableHeadRow>
                  </DataTableHeader>
                  <DataTableBody>
                    {orders.map((wo) => (
                      <DataTableRow key={wo._id}>
                        <DataTableTd className="max-w-[5rem] font-medium">
                          <TruncatedText text={wo.workOrderNumber} maxClass="max-w-[5rem]" />
                        </DataTableTd>
                        <DataTableTd className="max-w-[9rem]">
                          <TruncatedText text={wo.projectName} maxClass="max-w-[9rem]" />
                        </DataTableTd>
                        <DataTableTd className="max-w-[8rem]">
                          <TruncatedText text={wo.clientName} maxClass="max-w-[8rem]" />
                        </DataTableTd>
                        <DataTableTd className="max-w-[7rem]">
                          <span
                            className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge[wo.status]}`}
                          >
                            <TruncatedText text={wo.status} maxClass="max-w-[6rem]" />
                          </span>
                        </DataTableTd>
                        <DataTableTd className="font-medium">{formatMoney(wo.approvedAmount)}</DataTableTd>
                        <DataTableTd className="text-text-muted">
                          {formatMemberCount(wo.assignedTeam.length)}
                        </DataTableTd>
                        <DataTableTd align="right">
                          <ListActionRow>
                            {canManageWorkOrders(role) && canDeleteWorkOrder(wo, role) ? (
                              <ListIconButton label="Delete" onClick={() => setDeleteTarget(wo)}>
                                <Trash2 className="h-4 w-4" />
                              </ListIconButton>
                            ) : null}
                            <ListIconLink to={`/workorders/${wo._id}`} label="Open">
                              <Eye className="h-4 w-4" />
                            </ListIconLink>
                          </ListActionRow>
                        </DataTableTd>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              </div>
            </>
          )}
          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={20}
            onPageChange={setPage}
          />
        </section>
      </div>
    </AppShell>
  );
}

export default WorkOrdersPage;
