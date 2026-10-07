import { visitDateToInputValue } from "./mapUtils";

export type SiteVisitCalendarParams = {
  title: string;
  scheduleVisitDate: string;
  scheduleVisitTime?: string;
  location?: string;
  details?: string;
  durationMinutes?: number;
};

function formatGoogleCalDateTime(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}${mo}${day}T${h}${mi}${s}`;
}

function formatGoogleCalDateOnly(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${mo}${day}`;
}

/** Google Calendar “create event” URL for a scheduled site visit. */
export function googleCalendarEventUrl(params: SiteVisitCalendarParams): string | null {
  const datePart = visitDateToInputValue(params.scheduleVisitDate);
  if (!datePart) return null;

  const [y, mo, d] = datePart.split("-").map(Number);
  if (!y || !mo || !d) return null;

  const time = String(params.scheduleVisitTime ?? "").trim();
  const duration = params.durationMinutes ?? 120;
  let dates: string;

  if (/^\d{1,2}:\d{2}$/.test(time)) {
    const [h, mi] = time.split(":").map(Number);
    const start = new Date(y, mo - 1, d, h, mi, 0);
    const end = new Date(start.getTime() + duration * 60 * 1000);
    dates = `${formatGoogleCalDateTime(start)}/${formatGoogleCalDateTime(end)}`;
  } else {
    const start = new Date(y, mo - 1, d);
    const end = new Date(y, mo - 1, d);
    end.setDate(end.getDate() + 1);
    dates = `${formatGoogleCalDateOnly(start)}/${formatGoogleCalDateOnly(end)}`;
  }

  const qs = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates,
  });
  if (params.details?.trim()) qs.set("details", params.details.trim());
  if (params.location?.trim()) qs.set("location", params.location.trim());

  return `https://calendar.google.com/calendar/render?${qs.toString()}`;
}

export function siteVisitCalendarParamsFromInquiry(inquiry: {
  inquiryNumber: string;
  clientName: string;
  scheduleVisitDate: string;
  scheduleVisitTime: string;
  fullAddress: string;
  scopeOfWork?: string;
  siteDetails?: string;
  phone?: string;
}): SiteVisitCalendarParams {
  const lines = [
    `Inquiry: ${inquiry.inquiryNumber}`,
    inquiry.phone ? `Client phone: ${inquiry.phone}` : "",
    inquiry.scopeOfWork ? `Scope of Work: ${inquiry.scopeOfWork}` : "",
    inquiry.siteDetails ? `Site: ${inquiry.siteDetails}` : "",
  ].filter(Boolean);

  return {
    title: `Site visit — ${inquiry.clientName} (${inquiry.inquiryNumber})`,
    scheduleVisitDate: inquiry.scheduleVisitDate,
    scheduleVisitTime: inquiry.scheduleVisitTime,
    location: inquiry.fullAddress,
    details: lines.join("\n"),
  };
}
