import { api } from "../../../lib/apiClient";
import type { TeamMember, TeamMemberCreateResponse, TeamMemberPayload } from "./teamTypes";

export async function getTeamMembers(search = "", status = "All"): Promise<TeamMember[]> {
  const response = await api.get<TeamMember[]>("/team", { params: { q: search, status } });
  return response.data;
}

export async function getAssignableTeamMembers(): Promise<TeamMember[]> {
  const response = await api.get<TeamMember[]>("/team", { params: { status: "Active", assignable: "true" } });
  return response.data;
}

export async function getTeamMemberById(id: string): Promise<TeamMember> {
  const response = await api.get<TeamMember>(`/team/${id}`);
  return response.data;
}

export async function createTeamMember(payload: TeamMemberPayload): Promise<TeamMemberCreateResponse> {
  const response = await api.post<TeamMemberCreateResponse>("/team", payload);
  return response.data;
}

export async function updateTeamMember(id: string, payload: TeamMemberPayload): Promise<TeamMemberCreateResponse> {
  const response = await api.patch<TeamMemberCreateResponse>(`/team/${id}`, payload);
  return response.data;
}

export async function deleteTeamMember(id: string): Promise<void> {
  await api.delete(`/team/${id}`);
}
