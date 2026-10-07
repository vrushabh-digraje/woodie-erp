import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Plus, Search } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
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
import { BoqFeedbackPopup, useBoqFeedback } from "../boq/boqFeedback";
import { AppStatCard } from "../../components/ui/AppStatCard";
import { themeClasses } from "../../theme/classes";
import { formatMoney } from "../../lib/formatMoney";
import { getFinanceStats, getInvoicesPage } from "./invoiceApi";
import { InvoiceStatusBadge, InvoiceTypeBadge, isInvoiceOverdue } from "./invoiceShared";
import { INVOICE_STATUSES, INVOICE_TYPES, type Invoice, type InvoiceStatus, type InvoiceType } from "./invoiceTypes";

const STATUS_CHIPS: Array<InvoiceStatus | "All"> = ["All", ...INVOICE_STATUSES];
const TYPE_OPTIONS: Array<InvoiceType | "All"> = ["All", ...INVOICE_TYPES];

function InvoiceListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "All">("All");
  const [typeFilter, setTypeFilter] = useState<InvoiceType | "All">("All");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ awaitingPayment: 0, escalatedInvoices: 0, totalOutstanding: 0 });
  const [loading, setLoading] = useState(true);
  const { msg, notifyErr, dismiss } = useBoqFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, fin] = await Promise.all([
        getInvoicesPage(statusFilter, typeFilter, search, page, 20),
        getFinanceStats(),
      ]);
      setInvoices(rows.items);
      setTotal(rows.total);
      setTotalPages(rows.totalPages);
      setStats(fin);
    } catch (err) {
      notifyErr(err, "Could not load invoices.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search, page, notifyErr]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter, search]);

  return (
    <AppShell activeNav="finance" pageTitle="Invoices" pageSubtitle="Billing & collections">
      <BoqFeedbackPopup msg={msg} onDismiss={dismiss} />
      <div className="space-y-4">
        <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <AppStatCard title="Awaiting payment" value={String(stats.awaitingPayment)} iconIndex={1} />
          <AppStatCard
            title="Escalated"
            value={String(stats.escalatedInvoices)}
            iconIndex={2}
            valueClassName="text-rose-600"
          />
          <AppStatCard title="Outstanding" value={formatMoney(stats.totalOutstanding)} iconIndex={0} />
        </section>

        <section className={themeClasses.cardPadding}>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className={themeClasses.sectionTitle}>Invoice list</h2>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-stretch">
              <div className={`${themeClasses.searchBar} min-h-[42px] w-full sm:min-w-[200px] sm:flex-1`}>
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search..."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                className={`${themeClasses.select} min-h-[42px] w-full sm:w-auto`}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t === "All" ? "All types" : t}
                  </option>
                ))}
              </select>
              <Link
                to="/finance/invoices/new"
                className={`${themeClasses.btnNavy} min-h-[42px] w-full justify-center sm:w-auto sm:min-w-[160px]`}
              >
                <Plus className="h-4 w-4 shrink-0" />
                Create invoice
              </Link>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {STATUS_CHIPS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  statusFilter === s
                    ? "bg-ui-primary text-white"
                    : "border border-surface-border bg-white text-text-secondary hover:bg-surface-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-text-muted">Loading...</p>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-text-muted">No invoices found.</p>
          ) : (
            <>
            <DataTable>
              <DataTableHeader>
                <DataTableHeadRow>
                  <DataTableTh>INV#</DataTableTh>
                  <DataTableTh>WO#</DataTableTh>
                  <DataTableTh>Client</DataTableTh>
                  <DataTableTh>Type</DataTableTh>
                  <DataTableTh>Total</DataTableTh>
                  <DataTableTh>Status</DataTableTh>
                  <DataTableTh>Due</DataTableTh>
                  <DataTableTh>Outstanding</DataTableTh>
                  <DataTableTh align="right">Action</DataTableTh>
                </DataTableHeadRow>
              </DataTableHeader>
              <DataTableBody>
                {invoices.map((inv) => {
                  const overdue = isInvoiceOverdue(inv.dueDate, inv.status);
                  return (
                    <DataTableRow key={inv._id} className={overdue ? "bg-rose-50/60" : undefined}>
                      <DataTableTd className="font-mono text-xs font-medium">{inv.invoiceNumber}</DataTableTd>
                      <DataTableTd>{inv.workOrderNumber}</DataTableTd>
                      <DataTableTd>{inv.clientName}</DataTableTd>
                      <DataTableTd>
                        <InvoiceTypeBadge type={inv.type} />
                      </DataTableTd>
                      <DataTableTd>{formatMoney(inv.totalAmount)}</DataTableTd>
                      <DataTableTd className="w-0 whitespace-nowrap">
                        <div className="inline-flex flex-col items-start gap-1">
                          <InvoiceStatusBadge status={inv.status} />
                          {inv.status === "Escalated" ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-600">
                              <AlertTriangle className="h-3 w-3" />
                              Manager
                            </span>
                          ) : null}
                        </div>
                      </DataTableTd>
                      <DataTableTd className={overdue ? "font-medium text-rose-700" : ""}>
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                      </DataTableTd>
                      <DataTableTd className={inv.outstandingBalance > 0 ? "font-semibold text-rose-700" : ""}>
                        {formatMoney(inv.outstandingBalance)}
                      </DataTableTd>
                      <DataTableTd align="right">
                        <Link to={`/finance/invoices/${inv._id}`} className="text-sm font-medium text-ui-primary hover:underline">
                          Open
                        </Link>
                      </DataTableTd>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
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
      </div>
    </AppShell>
  );
}

export default InvoiceListPage;
