import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../../../components/layout/AppShell";
import { themeClasses } from "../../../theme/classes";
import TeamForm from "../components/TeamForm";
import { getTeamMemberById, updateTeamMember } from "../services/teamApi";
import type { TeamMember, TeamMemberPayload } from "../services/teamTypes";

function EditTeamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void getTeamMemberById(id)
      .then(setMember)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleUpdate(payload: TeamMemberPayload) {
    if (!id) throw new Error("Missing team member id");
    const result = await updateTeamMember(id, payload);
    if (!result.generatedPassword) navigate("/team");
    return { ...payload, generatedPassword: result.generatedPassword };
  }

  const initial = member
    ? { name: member.name, phone: member.phone, email: member.email, role: member.role, status: member.status }
    : null;

  return (
    <AppShell activeNav="settings" pageTitle="Edit Team Member" pageSubtitle={member?.name ?? ""}>
      <div className="max-w-3xl space-y-4">
        <Link to="/team" className="text-sm text-ui-primary hover:underline">
          Back to team
        </Link>
        <section className={themeClasses.cardPadding}>
          {loading ? <p className="text-sm text-text-muted">Loading...</p> : null}
          {!loading && initial ? <TeamForm mode="edit" initialValues={initial} onSubmit={handleUpdate} /> : null}
        </section>
      </div>
    </AppShell>
  );
}

export default EditTeamPage;

