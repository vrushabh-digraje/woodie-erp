/**
 * Composed Woodie ERP palette — built from `theme/tokens/*`.
 * Import named tokens for new code; `colors` remains for chart/Recharts inline styles.
 */
import {
  brandColors,
  chartColors,
  navColors,
  statCardAccents,
  statCardColors,
  surfaceColors,
  textColors,
} from "./tokens";

export {
  brandColors,
  surfaceColors,
  textColors,
  navColors,
  chartColors,
  statCardColors,
  statCardAccents,
  statCardThemes,
  INQUIRY_CHART_COLORS,
} from "./tokens";

export const colors = {
  brand: {
    navy: brandColors.navy,
    matteBlack: brandColors.matteBlack,
    darkGray: brandColors.darkGray,
    amber: brandColors.amber,
    blue: brandColors.blue,
    amberDark: brandColors.amberDark,
    primary: brandColors.amber,
    primaryHover: brandColors.amberHover,
    primaryMuted: brandColors.amberDark,
    primaryLight: "rgba(232,160,32,0.12)",
  },
  ui: {
    primary: brandColors.blue,
    primaryHover: brandColors.navyLight,
    primaryMuted: "#5a7aaa",
    primaryLight: "rgba(42,74,122,0.12)",
  },
  site: {
    gold: brandColors.amber,
    goldHover: brandColors.amberHover,
    pillBg: "rgba(232,160,32,0.12)",
    pillHover: "rgba(232,160,32,0.18)",
    green: "#10b981",
    greenLight: "#ecfdf5",
    pageBg: surfaceColors.page,
    border: surfaceColors.border,
    label: textColors.muted,
    text: textColors.primary,
  },
  surface: { ...surfaceColors },
  text: { ...textColors },
  nav: { ...navColors },
  section: {
    work: brandColors.amber,
    measurements: "#1d9e75",
    materials: brandColors.amberDark,
    condition: brandColors.blue,
    risk: "#d85a30",
    notes: "#534ab7",
    attachments: "#5f5e5a",
  },
  status: {
    new: { bg: "rgba(232,160,32,0.12)", text: brandColors.amber },
    estimated: { bg: "rgba(42,74,122,0.12)", text: brandColors.blue },
    approved: { bg: "#ecfdf5", text: "#10b981" },
    rejected: { bg: "#fef2f2", text: "#b91c1c" },
  },
  accent: {
    statTotal: statCardAccents.card1,
    statEstimated: statCardAccents.card2,
    statApproved: statCardAccents.card3,
    statValue: statCardAccents.card4,
    chart1: chartColors.primary,
    chart2: chartColors.secondary,
    chart3: chartColors.tertiary,
    chart4: chartColors.quaternary,
  },
  chart: { ...chartColors },
  stat: { ...statCardAccents, palette: statCardColors },
} as const;
