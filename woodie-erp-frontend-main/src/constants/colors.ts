export const COLORS = {
  sidebar: {
    bg: "#1c2a3a",
    activeItem: "#e8a020",
    activeText: "#ffffff",
    inactiveText: "#7a9ab0",
    hoverBg: "rgba(255,255,255,0.05)",
    hoverText: "#c0d8e8",
    border: "rgba(255,255,255,0.06)",
    sectionLabel: "#4a6a7a",
    footer: "#3a5a6a",
  },
  topbar: {
    bg: "#ffffff",
    border: "#e8ecf0",
    accent: "#e8a020",
    title: "#1c2a3a",
  },
  page: {
    bg: "#f5f7fa",
    cardBg: "#ffffff",
    cardBorder: "#e8ecf2",
  },
  card: {
    icon1: { bg: "#e8f0fe", color: "#1c2a3a" },
    icon2: { bg: "#fff3dc", color: "#1c2a3a" },
    icon3: { bg: "#fde8e8", color: "#1c2a3a" },
    icon4: { bg: "#e0f0e8", color: "#1c2a3a" },
  },
  text: {
    primary: "#1c2a3a",
    secondary: "#8a9ab0",
    muted: "#a0b0c0",
  },
  badge: {
    new: { bg: "#e8f0fe", color: "#1c4a8a" },
    won: { bg: "#fff3dc", color: "#b07010" },
    pending: { bg: "#f0f4f8", color: "#6a7a8a" },
  },
  brand: "#e8a020",
} as const;

export const CARD_ICONS = [
  COLORS.card.icon1,
  COLORS.card.icon2,
  COLORS.card.icon3,
  COLORS.card.icon4,
] as const;

export const PIPELINE_BAR_COLORS = [COLORS.brand, COLORS.sidebar.bg] as const;
