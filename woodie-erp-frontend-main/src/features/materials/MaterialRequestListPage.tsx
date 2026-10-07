import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Plus, Search, X } from "lucide-react";
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
import { TruncatedText } from "../../components/TruncatedText";
import { BoqFeedbackPopup, useBoqFeedback } from "../boq/boqFeedback";
import { themeClasses } from "../../theme/classes";
import { useAuth } from "../auth/AuthContext";
import { canCreateMaterialRequest, canManageMaterialRequests } from "../auth/permissions";
import {
  getMaterialRequestById,
  getMaterialRequestsPage,
  issueMaterialRequestToWorkOrder,
  updateMaterialRequestStatus,
} from "./materialApi";
import {
  MaterialRequestFlowSteps,
  MaterialRequestStatusBadge,
  materialRequestStatusBadge,
} from "./materialShared";
import {
  MATERIAL_REQUEST_STATUSES,
  type MaterialRequest,
  type MaterialRequestStatus,
} from "./materialTypes";

const STATUS_OPTIONS: Array<MaterialRequestStatus | "All"> = ["All", ...MATERIAL_REQUEST_STATUSES];

export function MaterialRequestsSection() {
  const { user } = useAuth();
  const role = user?.role ?? "admin";
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MaterialRequestStatus | "All">("All");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<MaterialRequest | null>(null);
  const [rejectOpen, setRejectOpen] = useState<MaterialRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const { msg, notifyOk, notifyErr, dismiss } = useBoqFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getMaterialRequestsPage(undefined, statusFilter, search, page, 20);
      setRequests(rows.items);
      setTotal(rows.total);
      setTotalPages(rows.totalPages);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  async function openDetail(id: string) {
    try {
      setDetail(await getMaterialRequestById(id));
    } catch (err) {
      notifyErr(err, "Could not load request.");
    }
  }

  async function approve(req: MaterialRequest) {
    setActionBusy(true);
    dismiss();
    try {
      const updated = await updateMaterialRequestStatus(req._id, "Approved");
      if (updated.status === "Issued") {
        notifyOk(`${req.requestNumber}: stock available — issued to work order.`);
      } else if (updated.status === "Procurement Needed") {
        notifyOk(`${req.requestNumber}: approved — purchase request required (short stock).`);
      } else {
        notifyOk(`${req.requestNumber} approved.`);
      }
      setDetail(updated);
      await load();
    } catch (err) {
      notifyErr(err, "Could not approve request.");
    } finally {
      setActionBusy(false);
    }
  }

  async function issueAfterProcurement(req: MaterialRequest) {
    setActionBusy(true);
    dismiss();
    try {
      await issueMaterialRequestToWorkOrder(req._id);
      notifyOk(`${req.requestNumber} issued to work order.`);
      setDetail(null);
      await load();
    } catch (err) {
      notifyErr(err, "Could not issue — ensure stock is received and GRN is complete.");
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmReject() {
    if (!rejectOpen) return;
    const reason = rejectReason.trim();
    if (!reason) {
      notifyErr(null, "Rejection reason is required.");
      return;
    }
    setActionBusy(true);
    dismiss();
    try {
      await updateMaterialRequestStatus(rejectOpen._id, "Rejected", reason);
      notifyOk(`${rejectOpen.requestNumber} rejected.`);
      setRejectOpen(null);
      setRejectReason("");
      setDetail(null);
      await load();
    } catch (err) {
      notifyErr(err, "Could not reject request.");
    } finally {
      setActionBusy(false);
    }
  }

  if (!canManageMaterialRequests(role)) {
    return (
      <>
        <BoqFeedbackPopup msg={msg} onDismiss={dismiss} />
        <section className={themeClasses.cardPadding}>
          <p className="mb-4 text-sm text-text-muted">
            Submit material requests for your assigned work orders. Managers review and issue stock
            from inventory.
          </p>
          {canCreateMaterialRequest(role) ? (
            <Link to="/materials/requests/new" className={themeClasses.btnNavy}>
              <Plus className="h-4 w-4" /> New request
            </Link>
          ) : null}
        </section>
      </>
    );
  }

  return (
    <>
      <BoqFeedbackPopup msg={msg} onDismiss={dismiss} />
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        {canCreateMaterialRequest(role) ? (
          <Link to="/materials/requests/new" className={themeClasses.btnNavy}>
            <Plus className="h-4 w-4" /> New request
          </Link>
        ) : null}
      </div>

      <section className={themeClasses.cardPadding}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className={themeClasses.sectionTitle}>All requests</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className={`${themeClasses.searchBar} sm:w-64`}>
              <Search className="h-4 w-4 shrink-0 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search requests"
                className={themeClasses.searchInput}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as MaterialRequestStatus | "All");
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
        ) : requests.length === 0 ? (
          <p className="text-sm text-text-muted">No material requests found.</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {requests.map((r) => (
                <button
                  key={r._id}
                  type="button"
                  onClick={() => void openDetail(r._id)}
                  className="w-full rounded-xl border border-surface-border-light p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{r.requestNumber}</span>
                    <MaterialRequestStatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-sm">{r.workOrderNumber}</p>
                  <TruncatedText text={r.projectName} className="text-xs text-text-muted" />
                </button>
              ))}
            </div>
            <div className="hidden md:block">
              <DataTable>
                <DataTableHeader>
                  <DataTableHeadRow>
                    <DataTableTh>Request</DataTableTh>
                    <DataTableTh>Work order</DataTableTh>
                    <DataTableTh>Project</DataTableTh>
                    <DataTableTh>Requested by</DataTableTh>
                    <DataTableTh>Status</DataTableTh>
                    <DataTableTh align="right">Actions</DataTableTh>
                  </DataTableHeadRow>
                </DataTableHeader>
                <DataTableBody>
                  {requests.map((r) => (
                    <DataTableRow key={r._id}>
                      <DataTableTd className="font-mono text-xs font-semibold">{r.requestNumber}</DataTableTd>
                      <DataTableTd>{r.workOrderNumber}</DataTableTd>
                      <DataTableTd className="max-w-[200px]">
                        <TruncatedText text={r.projectName} maxClass="max-w-[200px]" />
                      </DataTableTd>
                      <DataTableTd>{r.requestedByName}</DataTableTd>
                      <DataTableTd>
                        <MaterialRequestStatusBadge status={r.status} />
                      </DataTableTd>
                      <DataTableTd align="right">
                        <button
                          type="button"
                          onClick={() => void openDetail(r._id)}
                          className={themeClasses.btnGhost}
                        >
                          View
                        </button>
                      </DataTableTd>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </div>
            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={20}
              onPageChange={setPage}
            />
          </>
        )}
      </section>

      {detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className={`${themeClasses.cardPadding} max-h-[90vh] w-full max-w-lg overflow-y-auto`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-mono text-lg font-semibold">{detail.requestNumber}</h3>
                <p className="text-sm text-text-muted">
                  {detail.workOrderNumber} · {detail.projectName}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${materialRequestStatusBadge[detail.status]}`}
              >
                {detail.status}
              </span>
            </div>
            <p className="mt-2 text-sm">
              Requested by <strong>{detail.requestedByName}</strong>
            </p>
            {detail.notes ? (
              <p className="mt-2 text-sm text-text-muted">{detail.notes}</p>
            ) : null}
            {detail.rejectionReason ? (
              <p className="mt-2 text-sm text-rose-700">Reason: {detail.rejectionReason}</p>
            ) : null}

            <div className="mt-4">
              <MaterialRequestFlowSteps status={detail.status} />
            </div>

            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b text-left text-text-muted">
                  <th className="pb-2">Material</th>
                  <th className="pb-2 text-right">Req.</th>
                  <th className="pb-2 text-right">Avail.</th>
                  <th className="pb-2 text-right">Issued</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item) => (
                  <tr key={item._id ?? item.materialId} className="border-b border-surface-border-light">
                    <td className="py-2">
                      {item.materialName}
                      <span className="text-xs text-text-muted"> ({item.unit})</span>
                    </td>
                    <td className="py-2 text-right">{item.requestedQty}</td>
                    <td className="py-2 text-right">{item.availableQty}</td>
                    <td className="py-2 text-right">{item.issuedQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {detail.activityTimeline && detail.activityTimeline.length > 0 ? (
              <div className="mt-4 border-t pt-3">
                <p className="text-xs font-semibold uppercase text-text-muted">Activity</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {[...detail.activityTimeline].reverse().map((a, i) => (
                    <li key={a._id ?? i}>
                      <span className="font-medium">{a.action}</span>
                      {a.note ? <span className="text-text-muted"> — {a.note}</span> : null}
                      <span className="block text-xs text-text-muted">
                        {a.byName} · {a.at ? new Date(a.at).toLocaleString() : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setDetail(null)} className={themeClasses.btnSecondary}>
                Close
              </button>
              {detail.status === "Pending" ? (
                <>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => {
                      setRejectOpen(detail);
                      setDetail(null);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    <X className="h-4 w-4" /> Reject
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void approve(detail)}
                    className={themeClasses.btnSuccess}
                  >
                    <Check className="h-4 w-4" /> Approve
                  </button>
                </>
              ) : null}
              {detail.status === "Procurement Needed" ? (
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void issueAfterProcurement(detail)}
                  className={themeClasses.btnSuccess}
                >
                  <Check className="h-4 w-4" /> Issue to work order
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {rejectOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${themeClasses.cardPadding} w-full max-w-md`}>
            <h3 className="font-semibold">Reject {rejectOpen.requestNumber}</h3>
            <textarea
              className={`${themeClasses.input} mt-3 min-h-[100px]`}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (required)"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectOpen(null);
                  setRejectReason("");
                }}
                className={themeClasses.btnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void confirmReject()}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default MaterialRequestsSection;
