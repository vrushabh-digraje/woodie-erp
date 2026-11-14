import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, FolderSearch, Pencil, Plus, Search, Trash2, UserCheck } from "lucide-react";
import AppShell from "../../../components/layout/AppShell";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import {
  DataTable,
  DataTableBody,
  DataTableHeadRow,
  DataTableHeader,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "../../../components/list/DataTable";
import PaginationBar from "../../../components/list/PaginationBar";
import { ListActionRow, ListIconButton, ListIconLink } from "../../../components/list/ListActionButtons";
import { TruncatedText } from "../../../components/TruncatedText";
import { themeClasses } from "../../../theme/classes";
import { deleteInquiry, getInquiriesPage } from "../services/inquiryApi";
import type { Inquiry, InquiryStatus } from "../services/inquiryTypes";
import { AppFeedbackPopup, useAppFeedback } from "../../../components/AppFeedback";
import { useAuth } from "../../auth/AuthContext";
import { BoqStatusBadge, EmptyState, InquiryStatCard, SiteVisitBadge, StatusBadge } from "../components/inquiryShared";
import { visitDateToInputValue } from "../mapUtils";

const STATUS_OPTIONS: (InquiryStatus | "All")[] = [
  "All",
  "Visit Pending Approval",
  "Visit Approved",
  "Visit Rejected",
  "Site Report Attached",
  "Won",
  "Lost",
];

function InquiryListingPage() {
  const { activeCompany } = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | "All">("All");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Inquiry | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const { msg, notifyOk, notifyErrText, dismiss } = useAppFeedback();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getInquiriesPage(search, statusFilter, page, 20);
      setInquiries(rows.items);
      setTotal(rows.total);
      setTotalPages(rows.totalPages);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, activeCompany]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, activeCompany]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pendingCount = useMemo(
    () => inquiries.filter((i) => i.status === "Visit Pending Approval").length,
    [inquiries],
  );
  const rejectedCount = useMemo(() => inquiries.filter((i) => i.status === "Visit Rejected" || i.status === "Lost").length, [inquiries]);
  const acceptedCount = useMemo(
    () => inquiries.filter((i) => i.status === "Visit Approved" || i.status === "Site Report Attached" || i.status === "Won").length,
    [inquiries],
  );

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    dismiss();
    try {
      await deleteInquiry(deleteTarget._id);
      notifyOk(`Inquiry ${deleteTarget.inquiryNumber} deleted.`);
      setDeleteTarget(null);
      await loadData();
    } catch {
      notifyErrText("Could not delete inquiry.");
    } finally {
      setDeleteBusy(false);
    }
  }

  function InquiryActions({ item }: { item: Inquiry }) {
    return (
      <ListActionRow>
        <ListIconLink to={`/inquiry/inquiries/${item._id}`} label="View">
          <Eye className="h-4 w-4" />
        </ListIconLink>
        <ListIconLink to={`/inquiry/inquiries/${item._id}/edit`} label="Edit">
          <Pencil className="h-4 w-4" />
        </ListIconLink>
        <ListIconButton label="Delete" onClick={() => setDeleteTarget(item)}>
          <Trash2 className="h-4 w-4" />
        </ListIconButton>
      </ListActionRow>
    );
  }

  return (
    <AppShell activeNav="inquiries" pageTitle="Inquiries" pageSubtitle="Sales and visit pipeline">
      <AppFeedbackPopup msg={msg} onDismiss={dismiss} />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete inquiry?"
        itemLabel={deleteTarget ? `${deleteTarget.inquiryNumber} · ${deleteTarget.clientName}` : ""}
        loading={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
      <div className="space-y-4">
        <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          <InquiryStatCard title="Total" value={String(total)} detail="All inquiries" icon={FolderSearch} iconIndex={0} />
          <InquiryStatCard title="Acceptance Pending" value={String(pendingCount)} detail="Awaiting decision" icon={UserCheck} iconIndex={1} />
          <InquiryStatCard title="Accepted" value={String(acceptedCount)} detail={`${rejectedCount} rejected`} icon={FolderSearch} iconIndex={2} />
        </section>

        <section className={themeClasses.cardPadding}>
          <div className="mb-3 flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <h2 className={themeClasses.sectionTitle}>Inquiry listing</h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className={`${themeClasses.searchBar} w-full sm:min-w-[200px] sm:w-auto`}>
                <Search className="h-4 w-4 shrink-0 text-text-muted" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search client, category, assignee..."
                  className={themeClasses.searchInput}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as InquiryStatus | "All");
                  setPage(1);
                }}
                className={`${themeClasses.select} w-full sm:w-auto`}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "Visit Approved"
                      ? "Accepted"
                      : s === "Visit Rejected"
                        ? "Rejected"
                        : s === "Visit Pending Approval"
                          ? "Site visit acceptance pending"
                          : s === "Site Report Attached"
                            ? "Done"
                            : s === "All"
                              ? "All statuses"
                              : s}
                  </option>
                ))}
              </select>
              <Link to="/inquiry/inquiries/new" className={`${themeClasses.btnPrimary} w-full justify-center sm:w-auto`}>
                <Plus className="h-4 w-4" /> Create Inquiry
              </Link>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-text-muted">Loading...</p>
          ) : inquiries.length === 0 ? (
            <EmptyState message="No inquiries found." />
          ) : (
            <>
              {/* Mobile: cards */}
              <ul className="space-y-3 md:hidden">
                {inquiries.map((item) => (
                  <li key={item._id} className="app-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold border ${
                              item.companyId === "woodie-2"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : item.companyId === "woodie-3"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-blue-50 text-blue-800 border-blue-200"
                            }`}
                          >
                            {item.companyId === "woodie-2" ? "Woodie 2" : item.companyId === "woodie-3" ? "Woodie 3" : "Woodie 1"}
                          </span>
                          <p className="font-mono text-xs font-semibold text-ui-primary">{item.inquiryNumber}</p>
                        </div>
                        <p className="truncate font-semibold text-text-primary">{item.clientName}</p>
                        <p className="mt-1 truncate text-xs text-text-muted">
                          {item.category} · {item.assignedPersonName}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          {visitDateToInputValue(item.scheduleVisitDate)} {item.scheduleVisitTime}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={item.status} short />
                          <SiteVisitBadge item={item} />
                          <BoqStatusBadge item={item} />
                        </div>
                      </div>
                      <InquiryActions item={item} />
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hidden md:block">
                <DataTable>
                  <DataTableHeader>
                    <DataTableHeadRow>
                      <DataTableTh>Company</DataTableTh>
                      <DataTableTh>Inquiry</DataTableTh>
                      <DataTableTh>Client</DataTableTh>
                      <DataTableTh>Category</DataTableTh>
                      <DataTableTh>Assignee</DataTableTh>
                      <DataTableTh>Visit</DataTableTh>
                      <DataTableTh>Status</DataTableTh>
                      <DataTableTh>Site Visit</DataTableTh>
                      <DataTableTh>BOQ Status</DataTableTh>
                      <DataTableTh align="right">Action</DataTableTh>
                    </DataTableHeadRow>
                  </DataTableHeader>
                  <DataTableBody>
                    {inquiries.map((item) => (
                      <DataTableRow key={item._id}>
                        <DataTableTd className="whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold border ${
                              item.companyId === "woodie-2"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : item.companyId === "woodie-3"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-blue-50 text-blue-800 border-blue-200"
                            }`}
                          >
                            {item.companyId === "woodie-2" ? "Woodie 2" : item.companyId === "woodie-3" ? "Woodie 3" : "Woodie 1"}
                          </span>
                        </DataTableTd>
                        <DataTableTd className="max-w-[5.5rem] font-medium font-mono text-ui-primary">
                          <TruncatedText text={item.inquiryNumber} maxClass="max-w-[5.5rem]" />
                        </DataTableTd>
                        <DataTableTd className="max-w-[8rem] font-medium">
                          <TruncatedText text={item.clientName} maxClass="max-w-[8rem]" />
                        </DataTableTd>
                        <DataTableTd className="max-w-[7rem]">
                          <TruncatedText text={item.category} maxClass="max-w-[7rem]" />
                        </DataTableTd>
                        <DataTableTd className="max-w-[8rem]">
                          <TruncatedText text={item.assignedPersonName} maxClass="max-w-[8rem]" />
                        </DataTableTd>
                        <DataTableTd className="max-w-[8rem] text-xs text-text-muted">
                          <TruncatedText
                            text={`${visitDateToInputValue(item.scheduleVisitDate)} ${item.scheduleVisitTime}`}
                            maxClass="max-w-[8rem]"
                          />
                        </DataTableTd>
                        <DataTableTd className="max-w-[7rem]">
                          <StatusBadge status={item.status} short />
                        </DataTableTd>
                        <DataTableTd className="max-w-[8.5rem]">
                          <SiteVisitBadge item={item} />
                        </DataTableTd>
                        <DataTableTd className="max-w-[8.5rem]">
                          <BoqStatusBadge item={item} />
                        </DataTableTd>
                        <DataTableTd align="right">
                          <InquiryActions item={item} />
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

export default InquiryListingPage;
