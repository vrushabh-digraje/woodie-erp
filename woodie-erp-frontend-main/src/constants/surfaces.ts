import { COLORS } from "./colors";

export const RADIUS = {
  card: 10,
  button: 8,
  icon: 8,
} as const;

export function panelSurface() {
  return {
    backgroundColor: COLORS.page.cardBg,
    border: `1px solid ${COLORS.page.cardBorder}`,
    borderRadius: RADIUS.card,
  } as const;
}

export function statCardSurface() {
  return {
    ...panelSurface(),
    borderTop: `3px solid ${COLORS.sidebar.bg}`,
  } as const;
}

export function tableHeadSurface() {
  return {
    backgroundColor: COLORS.sidebar.bg,
    borderBottom: `1px solid ${COLORS.sidebar.border}`,
  } as const;
}

export function viewAllLinkStyle() {
  return {
    borderRadius: RADIUS.button,
    border: `1px solid ${COLORS.brand}`,
    backgroundColor: "rgba(232, 160, 32, 0.1)",
    color: COLORS.brand,
  } as const;
}
