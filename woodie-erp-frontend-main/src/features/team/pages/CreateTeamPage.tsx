import { useNavigate } from "react-router-dom";
import AppShell from "../../../components/layout/AppShell";
import { themeClasses } from "../../../theme/classes";
import TeamForm from "../components/TeamForm";
import { createTeamMember } from "../services/teamApi";
import type { TeamMemberPayload } from "../services/teamTypes";

function CreateTeamPage() {
  const navigate = useNavigate();

  async function handleCreate(payload: TeamMemberPayload) {
    const result = await createTeamMember(payload);
    if (!result.generatedPassword) navigate("/team");
    return result;
  }

  return (
    <AppShell activeNav="settings" pageTitle="Add Team Member" pageSubtitle="Create login credentials">
      <section className={`${themeClasses.cardPadding} max-w-3xl`}>
        <TeamForm mode="create" onSubmit={handleCreate} />
      </section>
    </AppShell>
  );
}

export default CreateTeamPage;

