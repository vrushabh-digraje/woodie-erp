import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarClock, Clock, ExternalLink, FileText, MapPin, Navigation, Phone, Tag, UserRound } from "lucide-react";
import { ImagePreviewThumb } from "../../../components/ImagePreview";
import { getMediaUrl } from "../../../lib/apiClient";
import type { Inquiry } from "../services/inquiryTypes";
import { formatVisitDateDisplay, formatVisitTimeDisplay, googleMapsNavigateUrl, googleMapsViewUrl } from "../mapUtils";
import { StatusBadge, displayOrEmpty } from "./inquiryShared";
import InquiryWorkflowPanel from "./InquiryWorkflowPanel";

function isImageAttachment(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext || "");
}

function MetaChip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-white/80 px-2 py-1 text-xs ring-1 ring-surface-border-light">
      <Icon className="h-3.5 w-3.5 shrink-0 text-brand-gold-muted" strokeWidth={1.75} />
      <span className="truncate font-medium text-text-primary">{children}</span>
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const empty = !String(value ?? "").trim() || value === "-";
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <p className={`mt-0.5 whitespace-pre-line break-words text-sm leading-snug ${empty ? "italic text-text-muted" : "text-text-primary"}`}>
        {empty ? "—" : value}
      </p>
    </div>
  );
}

function parsePointsList(raw: string): string[] {
  if (!raw || !raw.trim() || raw === "-") return [];
  let text = raw.trim();

  // If text already has newlines, split by line
  if (text.includes("\n")) {
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  // If single line, strip table header if present
  text = text.replace(/^SL\.?\s*No\.?\s*(?:Description)?\s*(?:Qty)?\s*/i, "");

  // Break on: Qty Unit followed by next item number
  text = text.replace(
    /(\d+(?:\.\d+)?\s*(?:Job|Mtr|Lot|Nos?|Pcs?|sqm|sq\.m|m2|m|set|ls|each))\s+(\d+)\s+/gi,
    "$1\n• ",
  );

  // Break on numbered items with dot or paren: " 1. " or " 2) "
  text = text.replace(/(?:^|\s+)(\d+)[\.\)]\s+/g, "\n• ");

  // If started with "1 Removal"
  text = text.replace(/^(\d+)\s+/g, "• ");

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return lines;
}

function parseLineItem(line: string): { description: string; qty: string } {
  const clean = line.replace(/^[\s*•\-+\d\.\)]+\s*/, "").trim();
  const match =
    /(.*?)(?:\s+[-—–:]\s*|\s+)(\d+(?:\.\d+)?\s*(?:Job|Mtr|Meter|Lot|Nos?|Pcs?|sqm|sq\.m|m2|m|set|ls|each|kg|bags?|rolls?))\s*$/i.exec(
      clean,
    );
  if (match) {
    return { description: match[1].trim(), qty: match[2].trim() };
  }
  return { description: clean, qty: "" };
}

function PointsRow({ label, value }: { label: string; value: string }) {
  const empty = !String(value ?? "").trim() || value === "-";
  if (empty) {
    return <DetailRow label={label} value="—" />;
  }

  const lines = parsePointsList(value);

  if (lines.length > 1 || (lines.length === 1 && /^[\s*•\-+\d]/.test(lines[0]))) {
    const items = lines.map(parseLineItem);
    const hasAnyQty = items.some((it) => it.qty !== "");

    return (
      <div className="min-w-0">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          {label}
        </p>
        <div className="overflow-hidden rounded-lg border border-surface-border bg-surface-card/60 shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-surface-border bg-surface-muted/60 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              <tr>
                <th className="px-3 py-2 w-10 text-center">#</th>
                <th className="px-3 py-2">Description</th>
                {hasAnyQty && <th className="px-3 py-2 w-28 text-right">Qty / Unit</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border-light">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-surface-muted/30 transition-colors">
                  <td className="px-3 py-2 text-center font-mono text-[11px] font-semibold text-brand-gold">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 text-text-primary leading-snug">
                    {item.description}
                  </td>
                  {hasAnyQty && (
                    <td className="px-3 py-2 text-right font-medium text-text-secondary whitespace-nowrap">
                      {item.qty ? (
                        <span className="rounded bg-brand-gold/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brand-gold">
                          {item.qty}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-0.5 whitespace-pre-line break-words text-sm leading-snug text-text-primary">
        {value}
      </p>
    </div>
  );
}

type InquiryOverviewPanelProps = {
  inquiry: Inquiry;
};

export default function InquiryOverviewPanel({ inquiry }: InquiryOverviewPanelProps) {
  const visitDate = formatVisitDateDisplay(inquiry.scheduleVisitDate);
  const visitTime = formatVisitTimeDisplay(inquiry.scheduleVisitTime);
  const hasAttachments = (inquiry.attachments?.length ?? 0) > 0;

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(200px,260px)]">
      <article className="site-survey-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-site-border bg-white px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary">
              <UserRound className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-brand-gold-muted">
                  {inquiry.inquiryNumber}
                </span>
                <h2 className="truncate text-base font-semibold text-text-primary sm:text-lg">{inquiry.clientName}</h2>
                {inquiry.contactPersonName ? (
                  <span className="text-xs font-normal text-text-muted">
                    · Attn: <strong className="font-medium text-text-primary">{inquiry.contactPersonName}</strong>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <StatusBadge status={inquiry.status} />
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-site-border bg-surface-muted/60 px-4 py-2.5 sm:px-5">
          {inquiry.contactPersonName ? (
            <MetaChip icon={UserRound}>{inquiry.contactPersonName}</MetaChip>
          ) : null}
          <MetaChip icon={Phone}>{inquiry.phone}</MetaChip>
          <MetaChip icon={Tag}>{inquiry.category}</MetaChip>
          <MetaChip icon={UserRound}>{inquiry.assignedPersonName || "—"}</MetaChip>
          <MetaChip icon={CalendarClock}>{visitDate}</MetaChip>
          <MetaChip icon={Clock}>{visitTime}</MetaChip>
        </div>

        <div className="grid gap-3 px-4 py-3 sm:grid-cols-2 sm:px-5 sm:py-4">
          <PointsRow label="Scope of Work" value={inquiry.scopeOfWork} />
          <PointsRow label="Site details" value={displayOrEmpty(inquiry.siteDetails)} />
          <div className="sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Address</p>
              {inquiry.fullAddress || inquiry.googleMapsUrl ? (
                <div className="flex items-center gap-2">
                  <a
                    href={googleMapsViewUrl(inquiry.fullAddress, inquiry.googleMapsUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-[#EA4335]/10 px-2.5 py-1 text-xs font-semibold text-[#EA4335] hover:bg-[#EA4335]/20 transition-colors"
                    title="Open site location on Google Maps"
                  >
                    <MapPin className="h-3 w-3" />
                    <span>Open Map</span>
                  </a>
                  <a
                    href={googleMapsNavigateUrl(inquiry.fullAddress, inquiry.googleMapsUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-[#34A853]/10 px-2.5 py-1 text-xs font-semibold text-[#34A853] hover:bg-[#34A853]/20 transition-colors"
                    title="Start 1-click turn-by-turn navigation in Google Maps"
                  >
                    <Navigation className="h-3 w-3" />
                    <span>Navigate</span>
                  </a>
                </div>
              ) : null}
            </div>
            <p className="mt-0.5 break-words text-sm leading-snug text-text-primary">
              {inquiry.fullAddress || "—"}
            </p>
          </div>
          {(inquiry.notes ?? "").trim() ? (
            <div className="sm:col-span-2">
              <DetailRow label="Notes" value={displayOrEmpty(inquiry.notes)} />
            </div>
          ) : null}
        </div>

        {hasAttachments ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-site-border px-4 py-2.5 sm:px-5">
            {inquiry.attachments.map((a) => {
              const isImg = isImageAttachment(a.filename);
              if (isImg) {
                return (
                  <ImagePreviewThumb
                    key={a.filename}
                    src={getMediaUrl(a.url)}
                    alt={a.filename}
                    className="ring-1 ring-surface-border-light hover:ring-brand-primary/40 rounded-lg overflow-hidden"
                    imgClassName="h-14 w-14 object-cover"
                  />
                );
              }
              return (
                <a
                  key={a.filename}
                  href={getMediaUrl(a.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-white px-3 py-2 text-xs font-medium text-text-primary shadow-xs hover:border-brand-primary/40 hover:bg-surface-muted/50 transition-colors"
                  title={a.filename}
                >
                  <FileText className="h-4 w-4 text-brand-gold shrink-0" />
                  <span className="max-w-[200px] truncate">{a.filename}</span>
                  <ExternalLink className="h-3 w-3 text-text-muted shrink-0" />
                </a>
              );
            })}
          </div>
        ) : null}
      </article>

      <InquiryWorkflowPanel status={inquiry.status} />
    </section>
  );
}
