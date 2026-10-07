import { useMemo, useState, type ComponentType } from "react";
import { FolderKanban, Search, ShieldCheck, Wallet, Wrench } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import { formatAed } from "../../lib/formatMoney";
import {
  DataTable,
  DataTableBody,
  DataTableHeadRow,
  DataTableHeader,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "../../components/list/DataTable";
import { AppStatCard } from "../../components/ui/AppStatCard";
import { themeClasses } from "../../theme/classes";

type ProjectStatus = "Pending" | "Approved" | "In Progress" | "On Hold" | "Completed";
type Priority = "Low" | "Medium" | "High" | "Critical";

type Project = {
  id: string;
  clientName: string;
  projectName: string;
  status: ProjectStatus;
  priority: Priority;
  budgetAed: number;
  progress: number;
  deadline: string;
  assignedManager: string;
};

const projects: Project[] = [
  { id: "PRJ-1021", clientName: "Metro Realty", projectName: "Downtown Office Tower", status: "In Progress", priority: "Critical", budgetAed: 1240000, progress: 68, deadline: "24 Jul 2026", assignedManager: "Aisha Rahman" },
  { id: "PRJ-1022", clientName: "Westline Logistics", projectName: "Warehouse Expansion Block B", status: "Approved", priority: "High", budgetAed: 860000, progress: 22, deadline: "18 Aug 2026", assignedManager: "Vikram Singh" },
  { id: "PRJ-1023", clientName: "Greenfield Healthcare", projectName: "Utility Upgrade Program", status: "Pending", priority: "Medium", budgetAed: 390000, progress: 10, deadline: "01 Sep 2026", assignedManager: "Sarah Khan" },
  { id: "PRJ-1024", clientName: "Harbor Group", projectName: "Terminal Renovation Phase 2", status: "On Hold", priority: "High", budgetAed: 730000, progress: 41, deadline: "10 Oct 2026", assignedManager: "David Kim" },
  { id: "PRJ-1025", clientName: "City Development Board", projectName: "Public Housing Site Works", status: "Completed", priority: "Low", budgetAed: 1980000, progress: 100, deadline: "14 Apr 2026", assignedManager: "Noor Elahi" },
];

const statusBadge: Record<ProjectStatus, string> = {
  Pending: themeClasses.badgeNeutral,
  Approved: themeClasses.badgeGold,
  "In Progress": "bg-ui-primary-light text-ui-primary",
  "On Hold": "bg-amber-100 text-amber-800",
  Completed: "bg-emerald-100 text-emerald-800",
};

const priorityBadge: Record<Priority, string> = {
  Low: themeClasses.badgeNeutral,
  Medium: "bg-slate-200 text-slate-800",
  High: themeClasses.badgeGold,
  Critical: "bg-rose-100 text-rose-800",
};

function StatCard({ title, value, detail, icon, iconIndex = 0 }: { title: string; value: string; detail: string; icon: ComponentType<{ className?: string }>; iconIndex?: number }) {
  return <AppStatCard title={title} value={value} subtitle={detail} icon={icon} iconIndex={iconIndex} />;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full min-w-36">
      <div className="mb-1 flex justify-between text-xs text-text-muted">
        <span>Progress</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-ui-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export default function ProjectWorkOrderPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "All">("All");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const okStatus = statusFilter === "All" || p.status === statusFilter;
      if (!q) return okStatus;
      return (
        okStatus &&
        (p.id.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q) ||
          p.projectName.toLowerCase().includes(q) ||
          p.assignedManager.toLowerCase().includes(q))
      );
    });
  }, [search, statusFilter]);

  return (
    <AppShell activeNav="inquiries" pageTitle="Projects & Work Orders" pageSubtitle="Portfolio overview">
      <div className="space-y-6">
          <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Active Projects" value="34" detail="Across 6 business units" icon={FolderKanban} iconIndex={0} />
            <StatCard title="Open Work Orders" value="89" detail="22 due this week" icon={Wrench} iconIndex={1} />
            <StatCard title="Budget Utilization" value="72%" detail="Within approved threshold" icon={Wallet} iconIndex={2} />
            <StatCard title="Compliance Score" value="96%" detail="HSE and QA checkpoints" icon={ShieldCheck} iconIndex={3} />
          </section>

          <section className={themeClasses.cardPadding}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className={themeClasses.sectionTitle}>Projects</h2>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className={`${themeClasses.searchBar} sm:w-64`}>
                  <Search className="h-4 w-4 shrink-0 text-text-muted" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search projects"
                    className={themeClasses.searchInput}
                  />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | "All")} className={themeClasses.select}>
                  <option value="All">All</option>
                  {(["Pending", "Approved", "In Progress", "On Hold", "Completed"] as const).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DataTable minWidth="1100px">
              <DataTableHeader>
                <DataTableHeadRow>
                  <DataTableTh>Project ID</DataTableTh>
                  <DataTableTh>Client Name</DataTableTh>
                  <DataTableTh>Project Name</DataTableTh>
                  <DataTableTh>Status</DataTableTh>
                  <DataTableTh>Priority</DataTableTh>
                  <DataTableTh>Budget</DataTableTh>
                  <DataTableTh>Progress %</DataTableTh>
                  <DataTableTh>Deadline</DataTableTh>
                  <DataTableTh>Assigned Manager</DataTableTh>
                </DataTableHeadRow>
              </DataTableHeader>
              <DataTableBody>
                {filtered.map((p) => (
                  <DataTableRow key={p.id}>
                    <DataTableTd className="font-medium">{p.id}</DataTableTd>
                    <DataTableTd className="text-text-muted">{p.clientName}</DataTableTd>
                    <DataTableTd className="font-medium">{p.projectName}</DataTableTd>
                    <DataTableTd>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge[p.status]}`}>{p.status}</span>
                    </DataTableTd>
                    <DataTableTd>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${priorityBadge[p.priority]}`}>{p.priority}</span>
                    </DataTableTd>
                    <DataTableTd>{formatAed(p.budgetAed)}</DataTableTd>
                    <DataTableTd>
                      <ProgressBar value={p.progress} />
                    </DataTableTd>
                    <DataTableTd className="text-text-muted">{p.deadline}</DataTableTd>
                    <DataTableTd className="text-text-muted">{p.assignedManager}</DataTableTd>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </section>
      </div>
    </AppShell>
  );
}









