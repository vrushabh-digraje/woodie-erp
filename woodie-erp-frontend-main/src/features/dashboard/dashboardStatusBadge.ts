import { COLORS } from "../../constants/colors";
import type { InquiryStatus } from "../inquiry/services/inquiryTypes";

export function inquiryStatusBadgeColors(status: InquiryStatus | string) {
  if (status === "Won") return COLORS.badge.won;
  if (status === "Visit Pending Approval") return COLORS.badge.new;
  return COLORS.badge.pending;
}
