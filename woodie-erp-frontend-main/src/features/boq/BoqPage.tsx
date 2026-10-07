import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ClipboardList, Eye, Search, Trash2 } from "lucide-react";
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
import { canDeleteQuotation } from "../../lib/deleteRules";
import { themeClasses } from "../../theme/classes";
import { useAuth } from "../auth/AuthContext";
import { canManageBoq } from "../auth/permissions";
import { deleteQuotation, getQuotationsPage } from "./boqApi";
import { BoqFeedbackPopup, useBoqFeedback } from "./boqFeedback";
import { formatMoney, PricingCard, StatusBadge } from "./boqShared";
import type { BoqQuotation, QuotationStatus } from "./boqTypes";

const STATUS_OPTIONS: Array<QuotationStatus | "All"> = [
  "All",
  "BOQ In Progress",
  "Quotation Draft",
  "Pending Approval",
  "Approved",
  "Rejected",
  "Revision Requested",
];

function BoqPage() {
  const { user } = useAuth();
  const role = user?.role ?? "sales";
  const [searchParams] = useSearchParams();
  const initialStatus = (searchParams.get("status") as QuotationStatus | "All");

  const [quotations, setQuotations] = useState<BoqQuotation[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | "All">(initialStatus);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<BoqQuotation | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const { msg, notifyOk, notifyErr, dismiss } = useBoqFeedback();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getQuotationsPage(search, statusFilter, page, 20);
      setQuotations(data.items);
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
    void loadData();
  }, [loadData]);

  const pendingCount = useMemo(
    () => quotations.filter((q) => q.status === "Pending Approval").length,
    [quotations],
  );

  const totals = useMemo(() => {
    const pipeline = quotations.filter((q) =>
      ["BOQ In Progress", "Quotation Draft", "Revision Requested"].includes(q.status),
    ).length;
    const approved = quotations.filter((q) => q.status === "Approved").length;
    const value = quotations.reduce((s, q) => s + (q.grandTotal || 0), 0);
    return { pipeline, approved, value };
  }, [quotations]);

  const title = role === "manager" ? "Quotation Approvals" : "BOQ & Quotations";

  async function confirmDeleteQuotation() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    dismiss();
    try {
      await deleteQuotation(deleteTarget._id);
      setDeleteTarget(null);
      notifyOk(`Quotation ${deleteTarget.quotationNumber} deleted.`);
      await loadData();
    } catch (err) {
      notifyErr(err, "Could not delete quotation.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <AppShell activeNav="tools" pageTitle={title} pageSubtitle="BOQ pipeline and quotations">
      <BoqFeedbackPopup msg={msg} onDismiss={dismiss} />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete quotation?"
        description="Only early-stage quotations without a work order can be removed."
        itemLabel={deleteTarget ? `${deleteTarget.quotationNumber} · ${deleteTarget.projectName || "BOQ"}` : ""}
        loading={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDeleteQuotation()}
      />
      <div className="space-y-4">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PricingCard title="Pipeline" value={String(totals.pipeline)} detail="BOQ / draft / revision" icon={ClipboardList} />
            <PricingCard title="Pending approval" value={String(pendingCount)} detail="Awaiting manager" icon={ClipboardList} />
            <PricingCard title="Total value" value={formatMoney(totals.value)} detail="All quotations listed" icon={ClipboardList} />
          </section>

          {/* {canApproveBoq(role) ? (
            <section className="rounded-xl border border-[#D9A15B]/30 bg-[#D9A15B]/10 p-4 text-sm text-[#8a5d1c]">
              Manager view: open a <strong>Pending Approval</strong> quotation to approve, reject, or request revision with remarks.
            </section>
          ) : null} */}

          <section className={themeClasses.cardPadding}>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h2 className={themeClasses.sectionTitle}>Quotations</h2>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className={`${themeClasses.searchBar} min-w-[200px]`}>
                  <Search className="h-4 w-4 shrink-0 text-text-muted" />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search #, project, client"
                    className={themeClasses.searchInput}
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as QuotationStatus | "All");
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
                {canManageBoq(role) ? (
                  <p className="text-xs text-text-muted sm:max-w-xs sm:text-right">
                    Start BOQ from an inquiry after site report is submitted (one BOQ per inquiry).
                  </p>
                ) : null}
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-text-muted">Loading...</p>
            ) : quotations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-border bg-surface-muted/50 px-6 py-12 text-center">
                <p className="text-sm font-medium text-text-primary">No quotations yet</p>
                <p className="mt-1 text-xs text-text-muted">
                  Quotations appear here after a site report is attached and BOQ is created for an inquiry.
                </p>
              </div>
            ) : (
              <>
                <ul className="space-y-3 md:hidden">
                  {quotations.map((q) => (
                    <li key={q._id} className="rounded-xl border border-surface-border bg-white p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-semibold text-ui-primary">{q.quotationNumber}</p>
                          <p className="truncate font-semibold">{q.projectName || "—"}</p>
                          <p className="truncate text-sm text-text-muted">{q.clientName || "—"}</p>
                          <p className="mt-1 font-medium">{formatMoney(q.grandTotal)}</p>
                          <div className="mt-2">
                            <StatusBadge status={q.status} />
                          </div>
                        </div>
                        <ListActionRow>
                          {canDeleteQuotation(q.status, role, {
                            isOwner: !user?.id || String(q.createdBy) === String(user.id),
                          }) ? (
                            <ListIconButton label="Delete" onClick={() => setDeleteTarget(q)}>
                              <Trash2 className="h-4 w-4" />
                            </ListIconButton>
                          ) : null}
                          <ListIconLink to={`/boq/${q._id}`} label="Open">
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
                        <DataTableTh>Total</DataTableTh>
                        <DataTableTh align="right">Action</DataTableTh>
                      </DataTableHeadRow>
                    </DataTableHeader>
                    <DataTableBody>
                      {quotations.map((q) => (
                        <DataTableRow key={q._id}>
                          <DataTableTd className="max-w-[5rem] font-medium">
                            <TruncatedText text={q.quotationNumber} maxClass="max-w-[5rem]" />
                          </DataTableTd>
                          <DataTableTd className="max-w-[9rem]">
                            <TruncatedText text={q.projectName || "—"} maxClass="max-w-[9rem]" />
                          </DataTableTd>
                          <DataTableTd className="max-w-[8rem]">
                            <TruncatedText text={q.clientName || "—"} maxClass="max-w-[8rem]" />
                          </DataTableTd>
                          <DataTableTd className="max-w-[8rem]">
                            <StatusBadge status={q.status} />
                          </DataTableTd>
                          <DataTableTd className="font-medium">{formatMoney(q.grandTotal)}</DataTableTd>
                          <DataTableTd align="right">
                            <ListActionRow>
                              {canDeleteQuotation(q.status, role, {
                                isOwner: !user?.id || String(q.createdBy) === String(user.id),
                              }) ? (
                                <ListIconButton label="Delete" onClick={() => setDeleteTarget(q)}>
                                  <Trash2 className="h-4 w-4" />
                                </ListIconButton>
                              ) : null}
                              <ListIconLink to={`/boq/${q._id}`} label="Open">
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

export default BoqPage;









