import { brandColors } from "./brandColors";
import { surfaceColors } from "./surfaceColors";
import { textColors } from "./textColors";

export const navColors = {
  background: surfaceColors.sidebar,
  inactiveText: textColors.sidebarIdle,
  activeText: "#ffffff",
  activeBg: brandColors.amber,
  hoverBg: "#e2e6ed",
  hoverText: brandColors.navy,
  activeBorder: brandColors.amber,
  border: "#e2e6ed",
} as const;
