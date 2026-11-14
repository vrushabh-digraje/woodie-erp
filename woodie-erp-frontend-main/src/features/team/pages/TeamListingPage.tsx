import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { roleLabel } from "../../../config/rbac";
import { AppFeedbackPopup, useAppFeedback } from "../../../components/AppFeedback";
import { ConfirmDeleteModal } from "../../../components/ConfirmDeleteModal";
import AppShell from "../../../components/layout/AppShell";
import { useAuth } from "../../auth/AuthContext";
import {
  DataTable,
  DataTableBody,
  DataTableHeadRow,
  DataTableHeader,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "../../../components/list/DataTable";
import { themeClasses } from "../../../theme/classes";
import { deleteTeamMember, getTeamMembers } from "../services/teamApi";
import type { TeamMember, TeamMemberStatus } from "../services/teamTypes";

function TeamListingPage() {
  const { activeCompany } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TeamMemberStatus | "All">("All");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const { msg, notifyOk, notifyErrText, dismiss } = useAppFeedback();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(await getTeamMembers(search, statusFilter));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, activeCompany]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (activeCompany && activeCompany !== "all") {
        if (m.role === "master_admin" || m.companyId === "global") {
          return false;
        }
      }
      return true;
    });
  }, [members, activeCompany]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    dismiss();
    try {
      await deleteTeamMember(deleteTarget._id);
      notifyOk(`${deleteTarget.name} removed from team.`);
      setDeleteTarget(null);
      await loadData();
    } catch {
      notifyErrText("Could not delete team member.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <AppShell activeNav="settings" pageTitle="Team" pageSubtitle="Members and access">
      <AppFeedbackPopup msg={msg} onDismiss={dismiss} />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete team member?"
        itemLabel={deleteTarget ? `${deleteTarget.name} · ${deleteTarget.employeeId}` : ""}
        loading={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
      <section className={themeClasses.cardPadding}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Users className="h-5 w-5" /> Team members
              </h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="min-w-[160px] bg-transparent text-sm outline-none"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TeamMemberStatus | "All")}
                  className="rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="All">All</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <Link to="/team/new" className={themeClasses.btnNavy}>
                  <Plus className="h-4 w-4" /> Add member
                </Link>
              </div>
            </div>
            {loading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : filteredMembers.length === 0 ? (
              <p className="text-sm text-slate-500">No team members yet.</p>
            ) : (
              <DataTable>
                <DataTableHeader>
                  <DataTableHeadRow>
                    <DataTableTh>Company</DataTableTh>
                    <DataTableTh>Employee ID</DataTableTh>
                    <DataTableTh>Name</DataTableTh>
                    <DataTableTh>Role</DataTableTh>
                    <DataTableTh>Email</DataTableTh>
                    <DataTableTh>Status</DataTableTh>
                    <DataTableTh align="right">Action</DataTableTh>
                  </DataTableHeadRow>
                </DataTableHeader>
                <DataTableBody>
                  {filteredMembers.map((m) => (
                    <DataTableRow key={m._id}>
                      <DataTableTd className="whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold border ${
                            m.role === "master_admin" || m.companyId === "global"
                              ? "bg-purple-50 text-purple-800 border-purple-200"
                              : m.companyId === "woodie-2"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : m.companyId === "woodie-3"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-blue-50 text-blue-800 border-blue-200"
                          }`}
                        >
                          {m.role === "master_admin" || m.companyId === "global"
                            ? "Master Admin"
                            : m.companyId === "woodie-2"
                            ? "Woodie 2"
                            : m.companyId === "woodie-3"
                            ? "Woodie 3"
                            : "Woodie 1"}
                        </span>
                      </DataTableTd>
                      <DataTableTd className="font-mono text-xs">{m.employeeId}</DataTableTd>
                      <DataTableTd className="font-medium">{m.name}</DataTableTd>
                      <DataTableTd>{roleLabel(m.role)}</DataTableTd>
                      <DataTableTd className="text-text-muted">{m.email}</DataTableTd>
                      <DataTableTd>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            m.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {m.status}
                        </span>
                      </DataTableTd>
                      <DataTableTd align="right">
                        <Link to={`/team/${m._id}/edit`} className="inline-flex rounded-lg p-2 hover:bg-slate-100">
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button type="button" onClick={() => setDeleteTarget(m)} className="inline-flex rounded-lg p-2 hover:bg-rose-50">
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </button>
                      </DataTableTd>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
      </section>
    </AppShell>
  );
}

export default TeamListingPage;

