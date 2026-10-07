import { CalendarClock, CalendarPlus, Clock, ExternalLink, MapPin, Navigation } from "lucide-react";
import { googleMapsNavigateUrl, googleMapsViewUrl, formatVisitDateDisplay, formatVisitTimeDisplay } from "../mapUtils";

type AssigneeVisitCardProps = {
  scheduleVisitDate: string;
  scheduleVisitTime: string;
  fullAddress: string;
  googleMapsUrl?: string;
  visitScheduled: boolean;
  calendarUrl: string | null;
};

const actionBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const btnGoogleCal =
  `${actionBtn} bg-[#4285F4] hover:bg-[#3367d6] focus-visible:outline-[#4285F4]`;
const btnGoogleMaps =
  `${actionBtn} bg-[#EA4335] hover:bg-[#d33426] focus-visible:outline-[#EA4335]`;
const btnNavigate =
  `${actionBtn} bg-[#34A853] hover:bg-[#2d9249] focus-visible:outline-[#34A853]`;

function ScheduleStat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="min-w-[140px] flex-1 rounded-xl border border-surface-border-light bg-surface-muted/60 px-4 py-3">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
        <Icon className="h-3.5 w-3.5 text-brand-gold-muted" />
        {label}
      </div>
      <p className="text-[15px] font-semibold leading-snug text-text-primary">{value}</p>
    </div>
  );
}

export default function AssigneeVisitCard({
  scheduleVisitDate,
  scheduleVisitTime,
  fullAddress,
  googleMapsUrl,
  visitScheduled,
  calendarUrl,
}: AssigneeVisitCardProps) {
  const hasLocation = Boolean(fullAddress?.trim() || googleMapsUrl?.trim());

  return (
    <article className="overflow-hidden rounded-xl border border-surface-border-light bg-surface-card shadow-[0_1px_2px_rgba(26,29,33,0.04)]">
      <div className="border-b border-site-border bg-white px-5 py-5 sm:px-6 sm:py-5">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary-light text-brand-primary">
            <CalendarClock className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold tracking-tight text-text-primary sm:text-xl">
              {visitScheduled ? "Your scheduled visit" : "Visit location"}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {visitScheduled ? "Confirmed — add to calendar or open maps below" : "Site address for this inquiry"}
            </p>
          </div>
        </div>
      </div>

      <div className={`grid gap-6 p-5 ${visitScheduled && hasLocation ? "md:grid-cols-2" : ""}`}>
        {visitScheduled ? (
          <div className="space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">When</p>
            <div className="flex flex-wrap gap-3">
              <ScheduleStat
                icon={CalendarClock}
                label="Date"
                value={formatVisitDateDisplay(scheduleVisitDate)}
              />
              <ScheduleStat icon={Clock} label="Time" value={formatVisitTimeDisplay(scheduleVisitTime)} />
            </div>
            {calendarUrl ? (
              <a
                href={calendarUrl}
                target="_blank"
                rel="noreferrer"
                className={`${btnGoogleCal} w-full sm:w-auto`}
              >
                <CalendarPlus className="h-4 w-4" />
                Add to Google Calendar
              </a>
            ) : null}
          </div>
        ) : null}

        {hasLocation ? (
          <div className={`space-y-4 ${visitScheduled ? "md:border-l md:border-surface-border-light md:pl-6" : ""}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">Where</p>
            <div className="rounded-xl border border-surface-border-light bg-white px-4 py-3">
              <div className="mb-2 flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#EA4335]" />
                <p className="text-sm leading-relaxed text-text-primary">{fullAddress}</p>
              </div>
            </div>
            <div className="flex flex-row gap-2">
              <a
                href={googleMapsViewUrl(fullAddress, googleMapsUrl)}
                target="_blank"
                rel="noreferrer"
                className={`${btnGoogleMaps} min-w-0 flex-1 sm:flex-none sm:w-auto`}
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                <span className="truncate">View on map</span>
              </a>
              <a
                href={googleMapsNavigateUrl(fullAddress, googleMapsUrl)}
                target="_blank"
                rel="noreferrer"
                className={`${btnNavigate} min-w-0 flex-1 sm:flex-none sm:w-auto`}
              >
                <Navigation className="h-4 w-4 shrink-0" />
                <span className="truncate">Navigate</span>
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
