import type { UserRole } from "../../config/rbac";

export type { UserRole };

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  employeeId: string;
  status: "Active" | "Inactive";
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};
