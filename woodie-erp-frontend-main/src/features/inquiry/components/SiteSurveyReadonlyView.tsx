import {
  AlertTriangle,
  Briefcase,
  Calendar,
  Check,
  FileText,
  Hammer,
  Layers,
  Lock,
  MapPin,
  Paperclip,
  Ruler,
} from "lucide-react";
import { ImagePreviewThumb } from "../../../components/ImagePreview";
import { getMediaUrl } from "../../../lib/apiClient";
import InquiryBoqCta from "./InquiryBoqCta";
import type { Inquiry, SiteReportAttachment } from "../services/inquiryTypes";
import { draftFromInquiry, type SiteBlockDraft, type SiteSurveyDraft } from "../siteSurveyDraft";

function hasValue(v: string | undefined | null) {
  return Boolean(String(v ?? "").trim());
}

function SubCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Briefcase;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-brand-primary/80" strokeWidth={2} />
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function workItemFilled(w: SiteBlockDraft["workItem"]) {
  return (
    hasValue(w.workType) ||
    hasValue(w.description) ||
    hasValue(w.quantity) ||
    hasValue(w.unit) ||
    hasValue(w.finishMaterial) ||
    hasValue(w.notes)
  );
}

function measurementFilled(m: SiteBlockDraft["measurement"]) {
  return (
    hasValue(m.areaRoom) || hasValue(m.measurementItem) || hasValue(m.value) || hasValue(m.unit)
  );
}

function materialFilled(m: SiteBlockDraft["materialFinish"]) {
  return hasValue(m.category) || hasValue(m.specification) || hasValue(m.notes);
}

function BlockCard({ block }: { block: SiteBlockDraft }) {
  const showWork = workItemFilled(block.workItem);
  const showMeas = measurementFilled(block.measurement);
  const showMat = materialFilled(block.materialFinish);
  if (!showWork && !showMeas && !showMat) return null;

  const loc = block.measurement.areaRoom || block.title || "";
  const scope = block.workItem.workType || "";
  const dim = block.measurement.measurementItem || "";
  const qty = block.workItem.quantity || "";
  const unit = block.workItem.unit || "";
  const material = [block.workItem.finishMaterial, block.materialFinish.specification].filter(Boolean).join(" · ");
  const details = block.workItem.description || "";

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-2.5">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
            <MapPin className="h-3 w-3 text-brand-primary" /> Location :
          </span>
          <p className="mt-1 text-[13px] font-semibold text-slate-900">{loc || "—"}</p>
        </div>

        <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/40 p-2.5">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
            <Briefcase className="h-3 w-3 text-emerald-600" /> Scope of Work :
          </span>
          <p className="mt-1 text-[13px] font-semibold text-emerald-950">{scope || "—"}</p>
        </div>

        <div className="rounded-lg border border-blue-200/80 bg-blue-50/40 p-2.5">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1">
            <Ruler className="h-3 w-3 text-blue-600" /> Measurement :
          </span>
          <p className="mt-1 text-[13px] font-semibold text-blue-950">
            {dim ? `${dim} ${qty ? `(${qty} ${unit})` : ""}` : qty ? `${qty} ${unit}` : "—"}
          </p>
        </div>

        <div className="rounded-lg border border-amber-200/80 bg-amber-50/40 p-2.5">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
            <Hammer className="h-3 w-3 text-amber-600" /> Material :
          </span>
          <p className="mt-1 text-[13px] font-semibold text-amber-950">{material || "—"}</p>
        </div>
      </div>

      {details ? (
        <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-3">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
            <FileText className="h-3 w-3 text-slate-600" /> Details :
          </span>
          <p className="mt-1.5 whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-slate-700">{details}</p>
        </div>
      ) : null}
    </article>
  );
}

function SummaryFields({ pairs }: { pairs: [string, string][] }) {
  const rows = pairs.filter(([, v]) => hasValue(v));
  if (!rows.length) return null;
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-text-muted">{label}</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-[13px] leading-snug text-text-primary">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function MediaStrip({ label, items }: { label: string; items: SiteReportAttachment[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
        {label} · {items.length}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => (
          <ImagePreviewThumb key={p.filename} src={getMediaUrl(p.url)} alt={p.filename || "Site photo"} />
        ))}
      </div>
    </div>
  );
}

type Props = {
  inquiry: Inquiry;
  onBoqStatus?: (prepared: boolean) => void;
};

export default function SiteSurveyReadonlyView({ inquiry, onBoqStatus }: Props) {
  const draft: SiteSurveyDraft = draftFromInquiry(inquiry);
  const sr = inquiry.siteReport;
  const submittedAt = sr?.reportSubmittedAt
    ? new Date(sr.reportSubmittedAt).toLocaleString()
    : null;
  const blocks = draft.blocks ?? [];
  const photos = sr?.photos ?? [];
  const videos = sr?.videos ?? [];
  const refs = sr?.referenceImages ?? [];
  const mediaCount = photos.length + videos.length + refs.length;

  const conditionPairs: [string, string][] = [
    ["Existing condition", draft.siteCondition.existingCondition],
    ["Demolition required", draft.siteCondition.demolitionRequired],
    ["Access limitations", draft.siteCondition.accessLimitations],
    ["Ceiling / wall / floor", draft.siteCondition.ceilingWallFloorCondition],
  ];
  const riskPairs: [string, string][] = [
    ["Electrical", draft.riskAssessment.electricalRisk],
    ["Height work", draft.riskAssessment.heightWork],
    ["Water / moisture", draft.riskAssessment.waterLeakage],
    ["Restricted access", draft.riskAssessment.restrictedAccess],
    ["Other risks", draft.riskAssessment.otherRisks],
  ];
  const notePairs: [string, string][] = [
    ["Client requirements", draft.siteVisitNotes.clientRequirements],
    ["Installation details", draft.siteVisitNotes.installationDetails],
    ["Material suggestions", draft.siteVisitNotes.materialSuggestions],
    ["Recommended solution", draft.siteVisitNotes.recommendedSolution],
    ["Execution complexity", draft.siteVisitNotes.executionComplexity],
    ["Special instructions", draft.siteVisitNotes.specialInstructions],
  ];

  const hasShared =
    conditionPairs.some(([, v]) => hasValue(v)) ||
    riskPairs.some(([, v]) => hasValue(v)) ||
    notePairs.some(([, v]) => hasValue(v)) ||
    mediaCount > 0;

  return (
    <article className="site-survey-panel overflow-hidden font-sans">
      <header className="site-survey-header !pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary">
              <Layers className="h-4 w-4" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-text-primary">Site Information</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-text-secondary">
                  <Lock className="h-3 w-3" />
                  {inquiry.boqPrepared ? "Locked" : "View only"}
                </span>
              </div>
              {submittedAt ? (
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-text-muted">
                  <Calendar className="h-3 w-3" />
                  Submitted {submittedAt}
                </p>
              ) : null}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-site-green px-2.5 py-1 text-[11px] font-bold text-white">
            <Check className="h-3 w-3" />
            Submitted
          </span>
        </div>
        {inquiry.status === "Site Report Attached" ? (
          <div className="mt-2">
            <InquiryBoqCta inquiry={inquiry} onBoqStatus={onBoqStatus} />
          </div>
        ) : null}
      </header>

      <div className="space-y-2.5 bg-site-page p-3">
        {blocks.map((block) => (
          <BlockCard key={block.id} block={block} />
        ))}

        {hasShared ? (
          <section className="space-y-2.5 rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-text-secondary">Site summary</h3>
            {conditionPairs.some(([, v]) => hasValue(v)) ? (
              <SubCard title="Site Condition" icon={MapPin}>
                <SummaryFields pairs={conditionPairs} />
              </SubCard>
            ) : null}
            {riskPairs.some(([, v]) => hasValue(v)) ? (
              <SubCard title="Risk Assessment" icon={AlertTriangle}>
                <SummaryFields pairs={riskPairs} />
              </SubCard>
            ) : null}
            {notePairs.some(([, v]) => hasValue(v)) ? (
              <SubCard title="Site Visit Notes" icon={FileText}>
                <SummaryFields pairs={notePairs} />
              </SubCard>
            ) : null}
            {mediaCount ? (
              <SubCard title="Attachments" icon={Paperclip}>
                <div className="space-y-2">
                  <MediaStrip label="Site photos" items={photos} />
                  <MediaStrip label="Videos" items={videos} />
                  <MediaStrip label="Reference images" items={refs} />
                </div>
              </SubCard>
            ) : null}
          </section>
        ) : null}
      </div>
    </article>
  );
}
