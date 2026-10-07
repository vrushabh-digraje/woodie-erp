import type { UserRole } from "../../../config/rbac";

export type TeamMemberStatus = "Active" | "Inactive";

export type TeamMember = {
  _id: string;
  employeeId: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  status: TeamMemberStatus;
  createdAt: string;
  updatedAt: string;
};

export type TeamMemberPayload = {
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  status: TeamMemberStatus;
  password?: string;
  generatePassword?: boolean;
};

export type TeamMemberCreateResponse = TeamMember & {
  generatedPassword?: string;
};
