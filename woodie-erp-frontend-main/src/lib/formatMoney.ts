/** UAE Dirham — use for all monetary display (never USD / $). */
export function formatAed(amount: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 2,
  }).format(amount);
}

export const formatMoney = formatAed;
