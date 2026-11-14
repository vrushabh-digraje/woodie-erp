import { COLORS } from "../../constants/colors";
import type { InquiryStatus } from "../inquiry/services/inquiryTypes";

export function inquiryStatusBadgeColors(status: InquiryStatus | string) {
  if (status === "Won") return COLORS.badge.won;
  if (status === "Visit Approved" || status === "Accepted") {
    return { bg: "#ecfdf5", color: "#047857" };
  }
  if (status === "Site Report Attached" || status === "Done") {
    return { bg: "#eff6ff", color: "#1d4ed8" };
  }
  if (status === "Visit Pending Approval" || status === "Site visit acceptance pending") {
    return { bg: "#fffbeb", color: "#b45309" };
  }
  if (status === "Visit Rejected" || status === "Rejected" || status === "Lost") {
    return { bg: "#fef2f2", color: "#b91c1c" };
  }
  return COLORS.badge.pending;
}
