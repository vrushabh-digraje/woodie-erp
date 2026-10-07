/** "1 Member" | "3 Members" | zeroLabel when count is 0 (default "Unassigned"). */
export function formatMemberCount(count: number, zeroLabel = "Unassigned"): string {
  if (count === 0) return zeroLabel;
  if (count === 1) return "1 Member";
  return `${count} Members`;
}

/** "1 line" | "3 lines" — pass capitalized singular/plural when needed. */
export function formatCount(count: number, singular: string, plural: string): string {
  if (count === 1) return `1 ${singular}`;
  return `${count} ${plural}`;
}
