/** Dashboard stat card accents — white cards with colored left border + pastel icon */
export const statCardThemes = [
  { border: "#1a2a4a", iconBg: "#e8eef8", iconColor: "#1a2a4a" },
  { border: "#e8a020", iconBg: "#fef3dc", iconColor: "#e8a020" },
  { border: "#2a7a4a", iconBg: "#dcf3e8", iconColor: "#2a7a4a" },
  { border: "#c03030", iconBg: "#fde8e8", iconColor: "#c03030" },
] as const;

/** @deprecated use statCardThemes */
export const statCardColors = statCardThemes.map((t) => t.border);

export const statCardAccents = {
  card1: statCardThemes[0].border,
  card2: statCardThemes[1].border,
  card3: statCardThemes[2].border,
  card4: statCardThemes[3].border,
} as const;
