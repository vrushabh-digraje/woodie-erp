function formatCount(count, singular, plural) {
  const pl = plural ?? `${singular}s`;
  if (count === 1) return `1 ${singular}`;
  return `${count} ${pl}`;
}

function formatMemberCount(count, zeroLabel = "Unassigned") {
  if (count === 0) return zeroLabel;
  if (count === 1) return "1 Member";
  return `${count} Members`;
}

module.exports = { formatCount, formatMemberCount };
