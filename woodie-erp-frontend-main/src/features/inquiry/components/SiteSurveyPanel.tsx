import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import {
  AlertTriangle,
  Briefcase,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Hammer,
  ImageIcon,
  Layers,
  Loader2,
  MapPin,
  Paperclip,
  Plus,
  Ruler,
  Save,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { ConfirmActionModal } from "../../../components/ConfirmActionModal";
import { ImagePreviewThumb } from "../../../components/ImagePreview";
import { getMediaUrl } from "../../../lib/apiClient";
import InquiryBoqCta from "./InquiryBoqCta";
import SiteSurveyReadonlyView from "./SiteSurveyReadonlyView";
import { submitSiteReport, updateSiteReport, uploadSiteReportMedia } from "../services/inquiryApi";
import type { Inquiry, SiteReportAttachment } from "../services/inquiryTypes";
import {
  LOCATION_CATEGORIES,
  SCOPE_PRESETS,
  COMMON_DIMENSION_PRESETS,
  TRADE_MATERIALS,
  type ScopePreset,
} from "../siteSurveyPresets";
import {
  draftFromInquiry,
  emptySiteBlock,
  hasSiteSurveyContent,
  patchPayloadFromDraft,
  type SiteBlockDraft,
  type SiteSurveyDraft,
} from "../siteSurveyDraft";

const RISK_OPTIONS = ["", "None", "Low", "Medium", "High", "N/A"] as const;
const DEMO_OPTIONS = ["", "Yes", "No", "Partial", "Unknown"] as const;

const labelClass = "mb-0.5 block text-[10px] font-medium uppercase tracking-[0.05em] text-[#888780]";
const inputClass =
  "w-full rounded-md border border-[#d4d0c8] bg-white px-2.5 py-1.5 text-[13px] text-[#2c2c2a] outline-none transition placeholder:text-[#888780]/80 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 disabled:bg-brand-primary-light/60";

/** Allow digits and at most one decimal point (quotation calc fields only). */
function sanitizeDecimal(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}

type Props = {
  inquiry: Inquiry;
  setInquiry: (i: Inquiry) => void;
  canEdit: boolean;
  canSubmit: boolean;
  onMessage: (msg: { type: "ok" | "err"; text: string } | null) => void;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function LabeledInput({
  label,
  className,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label}>
      <input className={className ?? inputClass} {...props} />
    </Field>
  );
}

function LabeledTextarea({
  label,
  minHeight,
  ...props
}: { label: string; minHeight?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label}>
      <textarea className={`${inputClass} ${minHeight ?? "min-h-[52px]"} resize-y`} {...props} />
    </Field>
  );
}

function LabeledSelect({
  label,
  options,
  ...props
}: { label: string; options: readonly string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label}>
      <select className={inputClass} {...props}>
        {options.map((o) => (
          <option key={o || "empty"} value={o}>
            {o || "Select…"}
          </option>
        ))}
      </select>
    </Field>
  );
}

function SectionChrome({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Briefcase;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-brand-primary" />
        <h4 className="text-[12px] font-semibold text-text-primary">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function blockSummaryLine(block: SiteBlockDraft): string {
  const loc = block.measurement.areaRoom.trim();
  const work = block.workItem.workType.trim();
  const qty = block.workItem.quantity.trim();
  const unit = block.workItem.unit.trim();
  const dim = block.measurement.measurementItem.trim();
  const mat = block.workItem.finishMaterial.trim();

  const bits: string[] = [];
  if (loc) bits.push(`📍 ${loc}`);
  if (work) bits.push(`💼 ${work}`);
  if (dim) bits.push(`📏 ${dim}`);
  else if (qty) bits.push(`📏 ${qty} ${unit || "Nos"}`);
  if (mat) bits.push(`🔨 ${mat}`);

  return bits.join(" · ") || "Empty block (tap to fill details)";
}

export default function SiteSurveyPanel({ inquiry, setInquiry, canEdit, canSubmit, onMessage }: Props) {
  const [draft, setDraft] = useState<SiteSurveyDraft>(() => draftFromInquiry(inquiry));
  const [openBlockId, setOpenBlockId] = useState<string | null>(
    () => draftFromInquiry(inquiry).blocks[0]?.id ?? null,
  );
  const [measurementErrors, setMeasurementErrors] = useState<string[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const handleBoqStatus = useCallback(
    (prepared: boolean) => {
      if (prepared === Boolean(inquiry.boqPrepared)) return;
      setInquiry({ ...inquiry, boqPrepared: prepared });
    },
    [inquiry, setInquiry],
  );

  useEffect(() => {
    const next = draftFromInquiry(inquiry);
    setDraft(next);
    setOpenBlockId(next.blocks[next.blocks.length - 1]?.id ?? null);
    setMeasurementErrors([]);
    setPendingPhotos([]);
  }, [inquiry._id, inquiry.status, inquiry.siteReport?.updatedAt, inquiry.updatedAt]);

  const sr = inquiry.siteReport;
  const photos = sr?.photos ?? [];
  const submitted = Boolean(sr?.reportSubmittedAt) || inquiry.status === "Site Report Attached";
  const show =
    inquiry.status === "Visit Approved" ||
    inquiry.status === "Site Report Attached" ||
    hasSiteSurveyContent(sr);

  if (!show) return null;
  if (!canEdit) {
    return <SiteSurveyReadonlyView inquiry={inquiry} onBoqStatus={handleBoqStatus} />;
  }

  function updateBlock(index: number, updater: (b: SiteBlockDraft) => SiteBlockDraft) {
    setDraft((d) => ({
      ...d,
      blocks: d.blocks.map((b, i) => (i === index ? updater(b) : b)),
    }));
  }

  function handleAddBlock() {
    const block = emptySiteBlock();
    setDraft((d) => ({ ...d, blocks: [...d.blocks, block] }));
    // Collapse previous blocks; open only the new one (data kept)
    setOpenBlockId(block.id);
  }

  function handleRemoveBlock(index: number) {
    if (draft.blocks.length <= 1) return;
    const removedId = draft.blocks[index]?.id;
    const remaining = draft.blocks.filter((_, i) => i !== index);
    setDraft((d) => ({ ...d, blocks: remaining }));
    if (openBlockId === removedId) {
      const nextOpen = remaining[Math.min(index, remaining.length - 1)]?.id ?? null;
      setOpenBlockId(nextOpen);
    }
  }

  async function flushUploads(): Promise<Inquiry | null> {
    if (!pendingPhotos.length) return inquiry;
    try {
      const updated = await uploadSiteReportMedia(inquiry._id, { photos: pendingPhotos });
      setPendingPhotos([]);
      setInquiry(updated);
      return updated;
    } catch {
      onMessage({ type: "err", text: "Could not upload photos. Use image files only." });
      return null;
    }
  }

  async function handleSaveDraftClick() {
    setBusy(true);
    onMessage(null);
    try {
      const afterUpload = await flushUploads();
      if (afterUpload === null) return;
      const errs: string[] = [];
      const body = patchPayloadFromDraft(draft, errs);
      if (errs.length) {
        setMeasurementErrors(errs);
        onMessage({ type: "err", text: errs[0] });
        return;
      }
      setMeasurementErrors([]);
      const updated = await updateSiteReport(afterUpload._id, body);
      setInquiry(updated);
      onMessage({ type: "ok", text: "Site details saved." });
    } catch {
      onMessage({ type: "err", text: "Could not save site survey." });
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitFinal() {
    setBusy(true);
    onMessage(null);
    try {
      const errs: string[] = [];
      patchPayloadFromDraft(draft, errs);
      if (errs.length) {
        setMeasurementErrors(errs);
        onMessage({ type: "err", text: errs[0] });
        return;
      }
      setMeasurementErrors([]);
      const afterUpload = await flushUploads();
      if (afterUpload === null) return;
      const body = patchPayloadFromDraft(draft, []);
      let cur = await updateSiteReport(afterUpload._id, body);
      setInquiry(cur);
      cur = await submitSiteReport(cur._id);
      setInquiry(cur);
      onMessage({ type: "ok", text: "Site details submitted successfully." });
    } catch (err: unknown) {
      const text =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Submit failed.";
      onMessage({ type: "err", text: text || "Submit failed." });
    } finally {
      setBusy(false);
    }
  }

  const disabled = !canEdit || busy;

  return (
    <article className="site-survey-panel overflow-hidden font-sans">
      <header className="site-survey-header !pb-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary">
              <Layers className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-text-primary">Site Information</h3>
              <p className="mt-0.5 text-[11px] text-text-secondary">
                Work item, measurements &amp; material per block · summary shared below
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => void handleSaveDraftClick()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save draft
            </button>
            {canSubmit && !submitted ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => setSubmitConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-site-green px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" />
                Submit final
              </button>
            ) : null}
          </div>
        </div>
        {submitted && inquiry.status === "Site Report Attached" ? (
          <div className="mt-2">
            <InquiryBoqCta inquiry={inquiry} onBoqStatus={handleBoqStatus} />
          </div>
        ) : null}
      </header>

      <div className="space-y-3 bg-site-page p-2.5 sm:p-3">
        {measurementErrors.length > 0 ? (
          <div className="space-y-0.5">
            {measurementErrors.map((e) => (
              <p key={e} className="text-xs text-rose-600">
                {e}
              </p>
            ))}
          </div>
        ) : null}

        {draft.blocks.map((block, blockIndex) => (
          <SiteBlockCard
            key={block.id}
            block={block}
            index={blockIndex}
            total={draft.blocks.length}
            expanded={openBlockId === block.id}
            disabled={disabled}
            onToggle={() =>
              setOpenBlockId((id) => (id === block.id ? null : block.id))
            }
            onChange={(next) => updateBlock(blockIndex, () => next)}
            onRemove={draft.blocks.length > 1 ? () => handleRemoveBlock(blockIndex) : undefined}
            onAddBlock={handleAddBlock}
          />
        ))}

        {openBlockId === null ? (
          <div className="flex justify-end">
            <AddBlockButton disabled={disabled} onClick={handleAddBlock} />
          </div>
        ) : null}

        <div className="space-y-3 border-t border-site-border pt-3">
          <h3 className="text-[13px] font-bold text-text-primary">Site summary</h3>

          <SectionChrome title="Site Condition" icon={MapPin}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <LabeledTextarea
                label="Existing condition"
                disabled={disabled}
                value={draft.siteCondition.existingCondition}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    siteCondition: { ...d.siteCondition, existingCondition: e.target.value },
                  }))
                }
              />
              <LabeledSelect
                label="Demolition required"
                disabled={disabled}
                options={DEMO_OPTIONS}
                value={draft.siteCondition.demolitionRequired}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    siteCondition: { ...d.siteCondition, demolitionRequired: e.target.value },
                  }))
                }
              />
              <LabeledTextarea
                label="Access limitations"
                disabled={disabled}
                value={draft.siteCondition.accessLimitations}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    siteCondition: { ...d.siteCondition, accessLimitations: e.target.value },
                  }))
                }
              />
              <LabeledTextarea
                label="Ceiling / wall / floor"
                disabled={disabled}
                value={draft.siteCondition.ceilingWallFloorCondition}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    siteCondition: { ...d.siteCondition, ceilingWallFloorCondition: e.target.value },
                  }))
                }
              />
            </div>
          </SectionChrome>

          <SectionChrome title="Risk Assessment" icon={AlertTriangle}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["electricalRisk", "Electrical"],
                  ["heightWork", "Height work"],
                  ["waterLeakage", "Water / moisture"],
                  ["restrictedAccess", "Restricted access"],
                ] as const
              ).map(([key, label]) => (
                <LabeledSelect
                  key={key}
                  label={label}
                  disabled={disabled}
                  options={RISK_OPTIONS}
                  value={draft.riskAssessment[key]}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      riskAssessment: { ...d.riskAssessment, [key]: e.target.value },
                    }))
                  }
                />
              ))}
            </div>
            <div className="mt-2">
              <LabeledTextarea
                label="Other risks"
                disabled={disabled}
                value={draft.riskAssessment.otherRisks}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    riskAssessment: { ...d.riskAssessment, otherRisks: e.target.value },
                  }))
                }
              />
            </div>
          </SectionChrome>

          <SectionChrome title="Site Visit Notes" icon={FileText}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(
                [
                  ["clientRequirements", "Client requirements"],
                  ["installationDetails", "Installation details"],
                  ["materialSuggestions", "Material suggestions"],
                  ["recommendedSolution", "Recommended solution"],
                  ["executionComplexity", "Execution complexity"],
                  ["specialInstructions", "Special instructions"],
                ] as const
              ).map(([key, label]) => (
                <LabeledTextarea
                  key={key}
                  label={label}
                  disabled={disabled}
                  value={draft.siteVisitNotes[key]}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      siteVisitNotes: { ...d.siteVisitNotes, [key]: e.target.value },
                    }))
                  }
                />
              ))}
            </div>
          </SectionChrome>

          <SectionChrome title="Attachments (Optional)" icon={Paperclip}>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) setPendingPhotos((p) => [...p, ...files]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => photoRef.current?.click()}
              className="mb-2 flex w-full flex-col items-center justify-center rounded-md border border-dashed border-site-border bg-white px-3 py-3 text-center hover:border-brand-primary/40 disabled:opacity-50"
            >
              <UploadCloud className="mb-0.5 h-4 w-4 text-brand-primary" />
              <span className="text-[13px] font-semibold text-brand-primary-muted">Add site photos</span>
              <span className="text-[10px] text-[#888780]">Shared for all blocks · images only</span>
            </button>
            <MediaStrip label="Uploaded" items={photos} />
            {pendingPhotos.length ? (
              <p className="mt-1.5 text-xs text-text-muted">
                <ImageIcon className="mr-1 inline h-3.5 w-3.5" />
                {pendingPhotos.length} pending — saved on Save draft / Submit
              </p>
            ) : null}
          </SectionChrome>
        </div>
      </div>

      <ConfirmActionModal
        open={submitConfirmOpen}
        title="Submit site report?"
        description="Status becomes Site Report Attached. You can still correct site details until BOQ preparation starts."
        confirmLabel="Submit"
        loading={busy}
        onCancel={() => setSubmitConfirmOpen(false)}
        onConfirm={() => {
          setSubmitConfirmOpen(false);
          void handleSubmitFinal();
        }}
      />
    </article>
  );
}

function AddBlockButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-site-green/50 bg-site-green px-2 py-1 text-[11px] font-semibold text-white  disabled:opacity-50"
    >
      <Plus className="h-3 w-3" />
      Add block
    </button>
  );
}

function SiteBlockCard({
  block,
  index,
  total,
  expanded,
  disabled,
  onToggle,
  onChange,
  onRemove,
  onAddBlock,
}: {
  block: SiteBlockDraft;
  index: number;
  total: number;
  expanded: boolean;
  disabled: boolean;
  onToggle: () => void;
  onChange: (b: SiteBlockDraft) => void;
  onRemove?: () => void;
  onAddBlock: () => void;
}) {
  const [locTab, setLocTab] = useState<string>("all");
  const summary = blockSummaryLine(block);
  const showNumber = total > 1;

  const currentLoc = block.measurement.areaRoom.trim();
  const currentWork = block.workItem.workType.trim();

  function handleSelectLocation(loc: string) {
    onChange({
      ...block,
      measurement: { ...block.measurement, areaRoom: loc },
    });
  }

  function handleSelectScope(preset: ScopePreset) {
    const nextWorkItem = { ...block.workItem, workType: preset.label };
    if (!nextWorkItem.unit.trim() && preset.defaultUnit) {
      nextWorkItem.unit = preset.defaultUnit;
    }
    if (!nextWorkItem.finishMaterial.trim() && preset.defaultMaterial) {
      nextWorkItem.finishMaterial = preset.defaultMaterial;
    }
    if (!nextWorkItem.description.trim() && preset.preparationSteps.length) {
      nextWorkItem.description = preset.preparationSteps.join("\n");
    }
    onChange({
      ...block,
      workItem: nextWorkItem,
    });
  }

  function handleSelectDimension(dim: string) {
    onChange({
      ...block,
      measurement: {
        ...block.measurement,
        measurementItem: dim,
      },
    });
  }

  function handleSelectMaterial(mat: string) {
    onChange({
      ...block,
      workItem: {
        ...block.workItem,
        finishMaterial: mat,
      },
    });
  }

  function handleClearSteps() {
    onChange({
      ...block,
      workItem: {
        ...block.workItem,
        description: "",
      },
    });
  }

  // Material suggestions for current work
  const matchedScopeKey =
    SCOPE_PRESETS.find((p) => p.label.toLowerCase() === currentWork.toLowerCase())?.id ||
    Object.keys(TRADE_MATERIALS).find((k) => currentWork.toLowerCase().includes(k)) ||
    "joinery";
  const materialSuggestions = TRADE_MATERIALS[matchedScopeKey] || TRADE_MATERIALS.joinery;

  const activeLocations =
    locTab === "all"
      ? LOCATION_CATEGORIES.flatMap((c) => c.locations)
      : LOCATION_CATEGORIES.find((c) => c.id === locTab)?.locations || [];

  return (
    <div className="overflow-hidden rounded-xl border border-site-border bg-white shadow-sm transition-all hover:border-slate-300">
      {/* Block Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50/70">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          aria-expanded={expanded}
        >
          {showNumber ? (
            <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-brand-primary px-1.5 text-[12px] font-bold text-white shadow-xs">
              {index + 1}
            </span>
          ) : (
            <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-brand-primary-light text-[11px] font-bold text-brand-primary">
              1
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-text-primary">{summary}</p>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" />
          )}
        </button>
        {onRemove ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="space-y-4 border-t border-site-border p-3.5 sm:p-4">
          {/* 1. Location : */}
          <div className="rounded-lg border border-slate-200/90 bg-slate-50/50 p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-brand-primary" />
                Location :
              </span>
              {/* Category tabs */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setLocTab("all")}
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                    locTab === "all" ? "bg-slate-700 text-white" : "text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  All
                </button>
                {LOCATION_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setLocTab(cat.id)}
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                      locTab === cat.id ? "bg-slate-700 text-white" : "text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {cat.name.split(" / ")[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick-Pick Pills */}
            <div className="flex flex-wrap gap-1.5">
              {activeLocations.map((loc) => {
                const isSelected = currentLoc.toLowerCase() === loc.toLowerCase();
                return (
                  <button
                    key={loc}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelectLocation(loc)}
                    className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-all ${
                      isSelected
                        ? "bg-brand-primary text-white shadow-xs ring-2 ring-brand-primary/20"
                        : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>

            {/* Custom Location Text Box */}
            <div>
              <input
                type="text"
                disabled={disabled}
                placeholder="Or type custom location / room name (e.g. VIP Room, CEO Office, Majlis)..."
                value={block.measurement.areaRoom}
                onChange={(e) =>
                  onChange({
                    ...block,
                    measurement: { ...block.measurement, areaRoom: e.target.value },
                  })
                }
                className={inputClass}
              />
            </div>
          </div>

          {/* 2. Scope of Work : */}
          <div className="rounded-lg border border-emerald-200/90 bg-emerald-50/30 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-emerald-700" />
                Scope of Work :
              </span>
              <span className="text-[10px] font-medium text-emerald-700/80">Tap to auto-fill details</span>
            </div>

            {/* Scope Chips */}
            <div className="flex flex-wrap gap-1.5">
              {SCOPE_PRESETS.map((p) => {
                const isSelected = currentWork.toLowerCase() === p.label.toLowerCase();
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelectScope(p)}
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                      isSelected
                        ? "bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500/20"
                        : "bg-white text-emerald-900 hover:bg-emerald-100/70 border border-emerald-200"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Scope Title */}
            <div>
              <input
                type="text"
                disabled={disabled}
                placeholder="Or enter custom scope of work title (e.g. Bronze Mirror Panels, Reception Desk)..."
                value={block.workItem.workType}
                onChange={(e) =>
                  onChange({
                    ...block,
                    workItem: { ...block.workItem, workType: e.target.value },
                  })
                }
                className={inputClass}
              />
            </div>
          </div>

          {/* 3. Measurement : & 4. Material : */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* 3. Measurement : */}
            <div className="rounded-lg border border-blue-200/80 bg-blue-50/30 p-3 space-y-2.5">
              <div className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-blue-950">
                <Ruler className="h-3.5 w-3.5 text-blue-600" />
                Measurement :
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <LabeledInput
                    label="Quantity"
                    disabled={disabled}
                    inputMode="decimal"
                    placeholder="e.g. 1, 2, 3"
                    value={block.workItem.quantity}
                    onChange={(e) => {
                      const qty = sanitizeDecimal(e.target.value);
                      onChange({
                        ...block,
                        workItem: { ...block.workItem, quantity: qty },
                        measurement: { ...block.measurement, value: qty },
                      });
                    }}
                  />
                </div>
                <div>
                  <LabeledInput
                    label="Unit"
                    disabled={disabled}
                    placeholder="Nos, SQM, LS"
                    value={block.workItem.unit}
                    onChange={(e) => {
                      const u = e.target.value;
                      onChange({
                        ...block,
                        workItem: { ...block.workItem, unit: u },
                        measurement: { ...block.measurement, unit: u },
                      });
                    }}
                  />
                </div>
                <div className="col-span-3">
                  <LabeledInput
                    label="Dimensions / Size details"
                    disabled={disabled}
                    placeholder="e.g. 2.5m L × 1.0m H or 60 × 280cm (2 Nos)"
                    value={block.measurement.measurementItem}
                    onChange={(e) =>
                      onChange({
                        ...block,
                        measurement: {
                          ...block.measurement,
                          measurementItem: e.target.value,
                          value: block.measurement.value || block.workItem.quantity,
                          unit: block.measurement.unit || block.workItem.unit,
                        },
                      })
                    }
                  />
                </div>
              </div>

              {/* Quick Dimension Chips */}
              <div className="space-y-1 pt-0.5">
                <span className="text-[10px] font-medium text-blue-900/80">Quick Size Pick:</span>
                <div className="flex flex-wrap gap-1">
                  {COMMON_DIMENSION_PRESETS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleSelectDimension(d)}
                      className={`rounded px-2 py-0.5 text-[10.5px] font-medium transition-all ${
                        block.measurement.measurementItem === d
                          ? "bg-blue-700 text-white shadow-xs"
                          : "bg-white text-blue-900 hover:bg-blue-100 border border-blue-200"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Material : */}
            <div className="rounded-lg border border-amber-200/80 bg-amber-50/30 p-3 space-y-2.5">
              <div className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-amber-950">
                <Hammer className="h-3.5 w-3.5 text-amber-700" />
                Material :
              </div>

              {/* Quick Material Chips */}
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-amber-900/80">Quick Material Selection:</span>
                <div className="flex flex-wrap gap-1">
                  {materialSuggestions.slice(0, 4).map((mat) => (
                    <button
                      key={mat}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleSelectMaterial(mat)}
                      className={`rounded px-2 py-0.5 text-[10.5px] font-medium transition-all ${
                        block.workItem.finishMaterial === mat
                          ? "bg-amber-700 text-white shadow-xs"
                          : "bg-white text-amber-950 hover:bg-amber-100 border border-amber-200"
                      }`}
                    >
                      {mat}
                    </button>
                  ))}
                </div>
              </div>

              <LabeledInput
                label="Material Specification & Finish"
                disabled={disabled}
                placeholder="e.g. Bronze tinted mirror with 1cm bevel / Antique Gold PU finish"
                value={block.workItem.finishMaterial}
                onChange={(e) =>
                  onChange({
                    ...block,
                    workItem: { ...block.workItem, finishMaterial: e.target.value },
                  })
                }
              />
            </div>
          </div>

          {/* 5. Details : */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-700" />
                Details :
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={handleClearSteps}
                  className="rounded px-2 py-0.5 text-[10.5px] font-medium text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            <textarea
              rows={5}
              disabled={disabled}
              className={`${inputClass} font-mono text-[12px] leading-relaxed resize-y bg-white`}
              placeholder="Enter work details, preparation steps, or special execution requirements..."
              value={block.workItem.description}
              onChange={(e) =>
                onChange({
                  ...block,
                  workItem: { ...block.workItem, description: e.target.value },
                })
              }
            />
          </div>

          {/* 6. Interactive Live Quotation Preview (Matching Reference) */}
          <div className="rounded-xl border-2 border-dashed border-amber-300/80 bg-gradient-to-br from-amber-50/40 via-white to-slate-50/60 p-3.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-amber-200/60 pb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-amber-700" />
                Live Quotation Preview (As prints in PDF)
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 border border-amber-300">
                Interactive Block Output
              </span>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 font-sans space-y-1.5 shadow-2xs">
              <div className="font-extrabold text-[13px] text-black tracking-tight uppercase">
                {currentLoc && currentWork
                  ? `${currentLoc} — ${currentWork}:`
                  : currentLoc
                  ? `${currentLoc}:`
                  : currentWork
                  ? `${currentWork}:`
                  : "ROOM / LOCATION — SCOPE TITLE:"}
              </div>

              {block.measurement.measurementItem.trim() ? (
                <div className="text-[12px] font-semibold text-slate-900">
                  {block.measurement.measurementItem.trim()}
                </div>
              ) : null}

              {block.workItem.finishMaterial.trim() ? (
                <div className="text-[12px] text-slate-800">
                  • {block.workItem.finishMaterial.trim()}
                </div>
              ) : null}

              {block.materialFinish.specification.trim() ? (
                <div
                  className={`text-[12px] ${
                    block.materialFinish.specification.toLowerCase().includes("client")
                      ? "font-semibold text-rose-600"
                      : "text-slate-800"
                  }`}
                >
                  • {block.materialFinish.specification.trim()}
                </div>
              ) : null}

              {block.workItem.description.trim() ? (
                <div className="mt-2 text-[12px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {block.workItem.description.trim()}
                </div>
              ) : (
                <div className="mt-2 text-[11px] italic text-slate-400">
                  • Enter details above to preview here.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {expanded ? (
        <div className="flex justify-end border-t border-site-border px-3 py-2 bg-slate-50/50">
          <AddBlockButton disabled={disabled} onClick={onAddBlock} />
        </div>
      ) : null}
    </div>
  );
}

function MediaStrip({ label, items }: { label: string; items: SiteReportAttachment[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={`mb-1 ${labelClass}`}>
        {label} ({items.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => (
          <ImagePreviewThumb key={p.filename} src={getMediaUrl(p.url)} alt={p.filename || "Site photo"} />
        ))}
      </div>
    </div>
  );
}
