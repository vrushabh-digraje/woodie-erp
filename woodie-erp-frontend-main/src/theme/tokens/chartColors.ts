import { brandColors } from "./brandColors";

export const chartColors = {
  primary: brandColors.amber,
  secondary: brandColors.navy,
  tertiary: brandColors.blue,
  quaternary: brandColors.amberDark,
  muted: "#d8e2ef",
  inquiryBar: [brandColors.amber, brandColors.navy, brandColors.amber, brandColors.navy] as const,
  invoiceDonut: [brandColors.navy, brandColors.amber, brandColors.blue, brandColors.amberDark] as const,
} as const;

export const INQUIRY_CHART_COLORS = {
  "Visit Pending Approval": brandColors.amber,
  "Visit Approved": brandColors.navy,
  "Site Report Attached": brandColors.blue,
  "Visit Rejected": brandColors.amberDark,
} as const;
