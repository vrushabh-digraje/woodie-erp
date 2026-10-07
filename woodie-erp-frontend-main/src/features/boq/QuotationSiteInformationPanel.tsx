import {
  AlertTriangle,
  Briefcase,
  Calculator,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Hammer,
  Layers,
  MapPin,
  Paperclip,
  Ruler,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ImagePreviewThumb } from "../../components/ImagePreview";
import { getMediaUrl } from "../../lib/apiClient";
import { formatAed } from "../../lib/formatMoney";
import type {
  BoqItem,
  QuotationSiteInformation,
  QuotationSiteBlock,
  SiteInformationAttachment,
  SiteInformationWorkItem,
  SiteInformationMeasurement,
  SiteInformationMaterialFinish,
} from "./boqTypes";

function filled(v: unknown): boolean {
  return Boolean(String(v ?? "").trim());
}

function text(v: unknown): string {
  return String(v ?? "").trim();
}

function resolveBlocks(si: QuotationSiteInformation | null | undefined): QuotationSiteBlock[] {
  if (!si) return [];
  if (Array.isArray(si.blocks) && si.blocks.length) return si.blocks;
  const legacy: QuotationSiteBlock = {
    title: "1",
    workItems: si.workItems,
    measurements: si.measurements,
    materialFinishDetails: si.materialFinishDetails,
  };
  const has =
    (legacy.workItems?.length ?? 0) > 0 ||
    (legacy.measurements?.length ?? 0) > 0 ||
    (legacy.materialFinishDetails?.length ?? 0) > 0;
  return has ? [legacy] : [];
}

function findMatchingBoqItem(
  block: QuotationSiteBlock,
  index: number,
  items?: BoqItem[],
): BoqItem | undefined {
  if (!items || items.length === 0) return undefined;

  const workType = text(block.workItems?.[0]?.workType).toLowerCase();
  const areaRoom = text(block.measurements?.[0]?.areaRoom).toLowerCase();

  // 1. Try matching by workType in item description
  if (workType) {
    const matched = items.find((it) =>
      it.description?.toLowerCase().includes(workType),
    );
    if (matched) return matched;
  }

  // 2. Try matching by areaRoom in item description
  if (areaRoom) {
    const matched = items.find((it) =>
      it.description?.toLowerCase().includes(areaRoom),
    );
    if (matched) return matched;
  }

  // 3. Fallback to direct 1:1 index match
  if (items[index]) {
    return items[index];
  }

  return undefined;
}

function BlockCard({
  block,
  index,
  items,
  quotationId,
}: {
  block: QuotationSiteBlock;
  index: number;
  items?: BoqItem[];
  quotationId?: string;
}) {
  const workItems = block.workItems ?? [];
  const measurements = block.measurements ?? [];
  const materials = block.materialFinishDetails ?? [];

  if (!workItems.length && !measurements.length && !materials.length) return null;

  const primaryWork: SiteInformationWorkItem | undefined = workItems[0];
  const primaryMeas: SiteInformationMeasurement | undefined = measurements[0];
  const primaryMat: SiteInformationMaterialFinish | undefined = materials[0];

  const location = text(primaryMeas?.areaRoom) || text(block.title) || "";
  const scope = text(primaryWork?.workType) || "";
  const dim = text(primaryMeas?.measurementItem) || text(primaryMeas?.label) || "";
  const qty =
    primaryWork?.quantity != null && String(primaryWork.quantity).trim() !== ""
      ? String(primaryWork.quantity)
      : primaryMeas?.value != null && String(primaryMeas.value).trim() !== ""
      ? String(primaryMeas.value)
      : "";
  const unit = text(primaryWork?.unit) || text(primaryMeas?.unit) || "";
  const finishMaterial = text(primaryWork?.finishMaterial) || "";
  const supplyNote = text(primaryMat?.specification) || text(primaryMat?.category) || "";
  const details = text(primaryWork?.description) || "";
  const notes = [text(primaryWork?.notes), text(primaryMat?.notes)].filter(Boolean).join(" · ");

  // Matching BOQ Item amounts
  const matchedItem = findMatchingBoqItem(block, index, items);
  const unitPrice = Number(matchedItem?.unitPrice ?? 0);
  const itemQty = Number(matchedItem?.quantity ?? (qty ? Number(qty) : 1));
  const lineTotal = itemQty * unitPrice;
  const hasAmount = unitPrice > 0;

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs">
      {/* Block Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/75 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-brand-primary px-2 text-[11px] font-bold text-white shadow-2xs">
            Block {index + 1}
          </span>
          <h3 className="text-[13.5px] font-bold text-slate-900">
            {location && scope
              ? `${location} — ${scope}`
              : location || scope || block.title || `Site Block ${index + 1}`}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasAmount ? (
            quotationId ? (
              <Link
                to={`/boq/${quotationId}/costing?block=${index}`}
                title="Click to open Costing & Rate Analysis Breakdown"
                className="group flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-emerald-950 shadow-2xs hover:bg-emerald-100 hover:border-emerald-400 hover:shadow-xs transition-all"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 group-hover:text-emerald-800">
                  Amount:
                </span>
                <span className="text-[12.5px] font-bold tabular-nums text-emerald-800 group-hover:text-emerald-900">
                  {formatAed(lineTotal)}
                </span>
                <ExternalLink className="h-3 w-3 text-emerald-600 opacity-70 group-hover:opacity-100 transition-opacity ml-0.5" />
              </Link>
            ) : (
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-emerald-950 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Amount:</span>
                <span className="text-[12.5px] font-bold tabular-nums text-emerald-800">
                  {formatAed(lineTotal)}
                </span>
              </div>
            )
          ) : quotationId ? (
            <Link
              to={`/boq/${quotationId}/costing?block=${index}`}
              title="Click to estimate rate"
              className="flex items-center gap-1 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100/60 hover:border-emerald-400 transition-all"
            >
              <Calculator className="h-3 w-3" />
              <span>Estimate Rate</span>
            </Link>
          ) : null}
          {qty ? (
            <span className="rounded-md bg-brand-primary-light px-2.5 py-0.5 text-[11.5px] font-bold text-brand-primary">
              {qty} {unit || "Nos"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-3.5 p-4">
        {/* 5 Core Information Badges */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {/* 1. Location : */}
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3">
            <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-brand-primary" /> Location :
            </span>
            <p className="mt-1 text-[13px] font-semibold text-slate-900">{location || "—"}</p>
          </div>

          {/* 2. Scope of Work : */}
          <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/40 p-3">
            <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-emerald-800">
              <Briefcase className="h-3.5 w-3.5 text-emerald-600" /> Scope of Work :
            </span>
            <p className="mt-1 text-[13px] font-semibold text-emerald-950">{scope || "—"}</p>
          </div>

          {/* 3. Measurement : */}
          <div className="rounded-lg border border-blue-200/80 bg-blue-50/40 p-3">
            <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-blue-800">
              <Ruler className="h-3.5 w-3.5 text-blue-600" /> Measurement :
            </span>
            <p className="mt-1 text-[13px] font-semibold text-blue-950">
              {dim
                ? `${dim} ${qty && !dim.includes(qty) ? `(${qty} ${unit})` : ""}`
                : qty
                ? `${qty} ${unit || "Nos"}`
                : "—"}
            </p>
          </div>

          {/* 4. Material : */}
          <div className="rounded-lg border border-amber-200/80 bg-amber-50/40 p-3">
            <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-amber-800">
              <Hammer className="h-3.5 w-3.5 text-amber-600" /> Material :
            </span>
            <div className="mt-1 space-y-0.5">
              <p className="text-[13px] font-semibold text-amber-950">{finishMaterial || "—"}</p>
              {supplyNote ? (
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${
                    supplyNote.toLowerCase().includes("client")
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-amber-100/70 text-amber-900 border border-amber-200/80"
                  }`}
                >
                  {supplyNote}
                </span>
              ) : null}
            </div>
          </div>

          {/* 5. BOQ Amount : */}
          {quotationId ? (
            <Link
              to={`/boq/${quotationId}/costing?block=${index}`}
              title="Click to open full Costing & Rate Analysis Sheet"
              className="group block rounded-lg border border-emerald-200/90 bg-emerald-50/50 p-3 hover:bg-emerald-50 hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-emerald-800 group-hover:text-emerald-900">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> BOQ Amount :
                </span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-800 border border-emerald-300 group-hover:bg-emerald-200 transition-colors">
                  Edit Rate ↗
                </span>
              </div>
              {hasAmount ? (
                <div className="mt-1 space-y-0.5">
                  <p className="text-[13.5px] font-bold tabular-nums text-emerald-950 group-hover:underline">
                    {formatAed(lineTotal)}
                  </p>
                  <p className="text-[11px] font-medium tabular-nums text-emerald-700/90">
                    Rate: {formatAed(unitPrice)} / {unit || matchedItem?.unit || "Nos"}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-[11.5px] font-medium text-emerald-700 group-hover:underline flex items-center gap-1">
                  <Calculator className="h-3 w-3 inline" /> Open Costing Sheet
                </p>
              )}
            </Link>
          ) : (
            <div className="rounded-lg border border-emerald-200/90 bg-emerald-50/50 p-3">
              <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-emerald-800">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> BOQ Amount :
              </span>
              {hasAmount ? (
                <div className="mt-1 space-y-0.5">
                  <p className="text-[13.5px] font-bold tabular-nums text-emerald-950">
                    {formatAed(lineTotal)}
                  </p>
                  <p className="text-[11px] font-medium tabular-nums text-emerald-700/90">
                    Rate: {formatAed(unitPrice)} / {unit || matchedItem?.unit || "Nos"}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-[11.5px] font-medium text-slate-400 italic">
                  Pending BOQ rate
                </p>
              )}
            </div>
          )}
        </div>

        {/* 5. Details : */}
        {details ? (
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-3">
            <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-700">
              <FileText className="h-3.5 w-3.5 text-slate-600" /> Details & Specifications :
            </span>
            <div className="mt-1.5 whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-slate-700">
              {details}
            </div>
          </div>
        ) : null}

        {notes ? (
          <div className="text-[11.5px] text-slate-500 italic">
            Note: {notes}
          </div>
        ) : null}

        {/* 6. Formatted Quotation Scope of Work (Matching Official PDF Output) */}
        <div className="rounded-xl border-2 border-dashed border-amber-300/80 bg-gradient-to-br from-amber-50/35 via-white to-slate-50/50 p-3.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-amber-200/70 pb-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-950">
              <FileSpreadsheet className="h-3.5 w-3.5 text-amber-700" />
              Formatted Quotation Scope of Work (As prints in PDF)
            </span>
            <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
              Quotation Block
            </span>
          </div>

          <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-3 font-sans shadow-2xs">
            <div className="text-[13px] font-extrabold uppercase tracking-tight text-black">
              {location && scope
                ? `${location} — ${scope}:`
                : location
                ? `${location}:`
                : scope
                ? `${scope}:`
                : "SCOPE / WORK ITEM:"}
            </div>

            {dim ? (
              <div className="text-[12px] font-semibold text-slate-900">
                {dim} {qty && !dim.includes(qty) ? `(${qty} ${unit})` : ""}
              </div>
            ) : qty ? (
              <div className="text-[12px] font-semibold text-slate-900">
                • {qty} {unit || "Nos"}
              </div>
            ) : null}

            {hasAmount ? (
              <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[12px] font-semibold text-emerald-900">
                <span>• Unit Rate: {formatAed(unitPrice)} / {unit || matchedItem?.unit || "Nos"}</span>
                <span className="rounded bg-emerald-100/90 px-1.5 py-0.5 text-[11.5px] font-bold text-emerald-950">
                  • Total: {formatAed(lineTotal)}
                </span>
              </div>
            ) : null}

            {finishMaterial ? (
              <div className="text-[12px] text-slate-800">
                • {finishMaterial}
              </div>
            ) : null}

            {supplyNote ? (
              <div
                className={`text-[12px] ${
                  supplyNote.toLowerCase().includes("client")
                    ? "font-semibold text-rose-600"
                    : "text-slate-800"
                }`}
              >
                • {supplyNote}
              </div>
            ) : null}

            {details ? (
              <div className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-800">
                {details}
              </div>
            ) : null}
          </div>
        </div>

        {/* Additional items fallback (for legacy data with multiple items in 1 block) */}
        {workItems.length > 1 || measurements.length > 1 || materials.length > 1 ? (
          <details className="mt-2 text-xs text-slate-500">
            <summary className="cursor-pointer font-semibold hover:text-slate-800">
              Additional entries ({workItems.length + measurements.length + materials.length - 3})
            </summary>
            <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
              {workItems.slice(1).map((w, idx) => (
                <div key={idx} className="rounded bg-slate-50 p-2">
                  <span className="font-semibold">{w.workType}</span> — {w.finishMaterial}
                </div>
              ))}
              {measurements.slice(1).map((m, idx) => (
                <div key={idx} className="rounded bg-slate-50 p-2">
                  <span className="font-semibold">{m.areaRoom}</span>: {m.measurementItem || m.label}
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
}

function SummaryFields({ pairs }: { pairs: [string, string][] }) {
  const rows = pairs.filter(([, v]) => filled(v));
  if (!rows.length) return null;
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-md border border-slate-200/70 bg-white p-2.5 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-0.5 whitespace-pre-wrap text-[12.5px] font-medium text-slate-800 [overflow-wrap:anywhere]">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

function AttachmentList({ label, items }: { label: string; items: SiteInformationAttachment[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
        {label} ({items.length})
      </p>
      <div className="flex flex-wrap gap-2.5">
        {items.map((att, i) => {
          const src = getMediaUrl(att.url);
          const isImage = /\.(png|jpe?g|gif|webp)$/i.test(att.filename || att.url);
          return isImage ? (
            <ImagePreviewThumb
              key={`${att.url}-${i}`}
              src={src}
              alt={att.filename || "Site photo"}
              imgClassName="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200 shadow-2xs"
            />
          ) : (
            <a
              key={`${att.url}-${i}`}
              href={src}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-700 hover:border-brand-primary"
            >
              <Paperclip className="h-4 w-4 text-slate-400" />
              <span className="max-w-[140px] truncate font-medium">{att.filename}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

type Props = {
  siteInformation?: QuotationSiteInformation | null;
  items?: BoqItem[];
  quotationId?: string;
};

export default function QuotationSiteInformationPanel({ siteInformation, items, quotationId }: Props) {
  const blocks = resolveBlocks(siteInformation);
  const sc = siteInformation?.siteCondition;
  const ra = siteInformation?.riskAssessment;
  const vn = siteInformation?.siteVisitNotes;
  const photos = siteInformation?.photos ?? [];
  const videos = siteInformation?.videos ?? [];
  const refs = siteInformation?.referenceImages ?? [];
  const mediaCount = photos.length + videos.length + refs.length;

  const totalBoqAmount = (items ?? []).reduce(
    (sum, it) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0),
    0,
  );

  const conditionPairs: [string, string][] = [
    ["Existing condition", String(sc?.existingCondition ?? "")],
    ["Demolition required", String(sc?.demolitionRequired ?? "")],
    ["Access limitations", String(sc?.accessLimitations ?? "")],
    ["Ceiling / wall / floor", String(sc?.ceilingWallFloorCondition ?? "")],
  ];
  const riskPairs: [string, string][] = [
    ["Electrical risk", String(ra?.electricalRisk ?? "")],
    ["Height work", String(ra?.heightWork ?? "")],
    ["Water / moisture", String(ra?.waterLeakage ?? "")],
    ["Restricted access", String(ra?.restrictedAccess ?? "")],
    ["Other risks", String(ra?.otherRisks ?? "")],
  ];
  const notePairs: [string, string][] = [
    ["Client requirements", String(vn?.clientRequirements ?? "")],
    ["Installation details", String(vn?.installationDetails ?? "")],
    ["Material suggestions", String(vn?.materialSuggestions ?? "")],
    ["Recommended solution", String(vn?.recommendedSolution ?? "")],
    ["Execution complexity", String(vn?.executionComplexity ?? "")],
    ["Special instructions", String(vn?.specialInstructions ?? "")],
  ];

  const hasCondition = conditionPairs.some(([, v]) => filled(v));
  const hasRisk = riskPairs.some(([, v]) => filled(v));
  const hasNotes = notePairs.some(([, v]) => filled(v));
  const hasShared = hasCondition || hasRisk || hasNotes || mediaCount > 0;

  if (!blocks.length && !hasShared) {
    return (
      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-brand-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Site Information</h2>
        </div>
        <p className="mt-2 text-xs text-slate-500">No site visit details attached to this quotation yet.</p>
      </article>
    );
  }

  return (
    <article className="space-y-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xs font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary shadow-2xs">
            <Layers className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[14.5px] font-bold text-slate-900">Site Information</h2>
            <p className="text-[11.5px] text-slate-500">
              Site survey measurements, trade scopes, specifications, and approved BOQ amounts
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {totalBoqAmount > 0 ? (
            quotationId ? (
              <Link
                to={`/boq/${quotationId}/costing?block=0`}
                title="Open Costing & Rate Analysis Sheet"
                className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11.5px] font-bold text-emerald-900 shadow-2xs hover:bg-emerald-100 hover:shadow-xs transition-all"
              >
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                Total BOQ: {formatAed(totalBoqAmount)}
                <ExternalLink className="h-3 w-3 text-emerald-600 ml-0.5" />
              </Link>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11.5px] font-bold text-emerald-900 shadow-2xs">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                Total BOQ: {formatAed(totalBoqAmount)}
              </span>
            )
          ) : null}
          {blocks.length ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              {blocks.length} {blocks.length === 1 ? "Block" : "Blocks"}
            </span>
          ) : null}
        </div>
      </div>

      {/* Structured Blocks */}
      {blocks.length ? (
        <div className="space-y-3.5">
          {blocks.map((block, i) => (
            <BlockCard
              key={`${block.title ?? "block"}-${i}`}
              block={block}
              index={i}
              items={items}
              quotationId={quotationId}
            />
          ))}
        </div>
      ) : null}

      {/* Site Summary Section */}
      {hasShared ? (
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-3.5">
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
            <CheckCircle2 className="h-4 w-4 text-slate-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Site Summary & Condition
            </h3>
          </div>

          {hasCondition ? (
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <MapPin className="h-3.5 w-3.5 text-brand-primary" /> Site Condition
              </span>
              <SummaryFields pairs={conditionPairs} />
            </div>
          ) : null}

          {hasRisk ? (
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Risk Assessment
              </span>
              <SummaryFields pairs={riskPairs} />
            </div>
          ) : null}

          {hasNotes ? (
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <FileText className="h-3.5 w-3.5 text-slate-600" /> Site Visit Notes
              </span>
              <SummaryFields pairs={notePairs} />
            </div>
          ) : null}

          {mediaCount ? (
            <div className="space-y-2 pt-1 border-t border-slate-200/60">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                <Paperclip className="h-3.5 w-3.5 text-slate-600" /> Site Attachments & Photos
              </span>
              <div className="space-y-3">
                <AttachmentList label="Site Photos" items={photos} />
                <AttachmentList label="Videos" items={videos} />
                <AttachmentList label="Reference Images" items={refs} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
