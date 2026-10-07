export function googleMapsViewUrl(address: string, googleMapsUrl?: string): string {
  const url = String(googleMapsUrl ?? "").trim();
  if (url) {
    if (/^https?:\/\//i.test(url)) return url;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(url)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function googleMapsNavigateUrl(address: string, googleMapsUrl?: string): string {
  const url = String(googleMapsUrl ?? "").trim();
  if (url) {
    const coordMatch = /(?:q=|@)(-?\d+\.\d+),(-?\d+\.\d+)/.exec(url);
    if (coordMatch) {
      return `https://www.google.com/maps/dir/?api=1&destination=${coordMatch[1]},${coordMatch[2]}`;
    }
    if (/^https?:\/\//i.test(url)) return url;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export function visitDateToInputValue(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function formatVisitDateDisplay(value?: string): string {
  const iso = visitDateToInputValue(value);
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatVisitTimeDisplay(value?: string): string {
  const t = String(value ?? "").trim();
  if (!t) return "—";
  const match = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!match) return t;
  const d = new Date();
  d.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
