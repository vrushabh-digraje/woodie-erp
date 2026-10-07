import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  ChevronDown,
  ClipboardCheck,
  Clock,
  FileCheck2,
  Loader2,
  Search,
} from "lucide-react";
import AppShell from "../../../components/layout/AppShell";
import { formatCount } from "../../../lib/formatCount";
import { themeClasses } from "../../../theme/classes";
import VisitListTable from "../components/VisitListTable";
import { EmptyState, InquiryStatCard } from "../components/inquiryShared";
import { getInquiries } from "../services/inquiryApi";
import type { Inquiry, InquiryStatus } from "../services/inquiryTypes";

const STATUS_FILTERS: { value: InquiryStatus | "All"; label: string }[] = [
  { value: "All", label: "All statuses" },
  { value: "Visit Pending Approval", label: "Pending approval" },
  { value: "Visit Approved", label: "Approved" },
  { value: "Visit Rejected", label: "Rejected" },
  { value: "Site Report Attached", label: "Report attached" },
];

const filterSelectClass =
  "w-full appearance-none rounded-lg border-[0.5px] border-surface-border bg-surface-input py-2 pl-3 pr-9 text-sm font-medium text-text-primary outline-none transition focus:border-ui-primary sm:w-auto sm:min-w-[180px]";

function EngineerVisitsPage() {
  const [visits, setVisits] = useState<Inquiry[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | "All">("All");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setVisits(await getInquiries(search, statusFilter));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pendingCount = useMemo(
    () => visits.filter((v) => v.status === "Visit Pending Approval").length,
    [visits],
  );
  const approvedCount = useMemo(() => visits.filter((v) => v.status === "Visit Approved").length, [visits]);
  const completedCount = useMemo(
    () => visits.filter((v) => v.status === "Site Report Attached").length,
    [visits],
  );

  return (
    <AppShell activeNav="inquiries" pageTitle="My Site Visits" pageSubtitle="Assigned field visits">
      <div className="space-y-6">
          <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <InquiryStatCard title="Pending" value={String(pendingCount)} detail="Needs your decision" icon={Clock} />
            <InquiryStatCard title="Approved" value={String(approvedCount)} detail="Ready for survey" icon={CalendarCheck} />
            <InquiryStatCard title="Completed" value={String(completedCount)} detail="Report submitted" icon={FileCheck2} />
            <InquiryStatCard title="Total" value={String(visits.length)} detail="Assigned to you" icon={ClipboardCheck} />
          </section>

          <section className={themeClasses.cardPadding}>
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className={themeClasses.sectionTitle}>Assigned visits</h2>
                <p className="mt-1 text-xs text-text-muted">
                  {loading ? "Loading…" : `${formatCount(visits.length, "visit", "visits")} shown`}
                </p>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <div className={`${themeClasses.searchBar} w-full sm:max-w-xs`}>
                  <Search className="h-4 w-4 shrink-0 text-text-muted" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search client, ID, category..."
                    className={themeClasses.searchInput}
                  />
                </div>

                <div className="relative w-full sm:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as InquiryStatus | "All")}
                    className={filterSelectClass}
                    aria-label="Filter by status"
                  >
                    {STATUS_FILTERS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                    aria-hidden
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-muted">
                <Loader2 className="h-5 w-5 animate-spin text-ui-primary" />
                Loading your visits…
              </div>
            ) : visits.length === 0 ? (
              <EmptyState message="No visits match your filters. Check back when Sales assigns a new site visit." />
            ) : (
              <VisitListTable visits={visits} />
            )}
          </section>
      </div>
    </AppShell>
  );
}

export default EngineerVisitsPage;
