import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ClipboardList, FileText, LoaderCircle, MapPin, Paperclip, Sparkles, Upload, UserRound, X } from "lucide-react";
import { AppFeedbackPopup, useAppFeedback } from "../../../components/AppFeedback";
import { INQUIRY_CATEGORIES, type InquiryCategory } from "../../../config/rbac";
import { formatCount } from "../../../lib/formatCount";
import { themeClasses } from "../../../theme/classes";
import { getAssignableTeamMembers } from "../../team/services/teamApi";
import type { TeamMember } from "../../team/services/teamTypes";
import { visitDateToInputValue } from "../mapUtils";
import type { CreateInquiryPayload } from "../services/inquiryTypes";
import LocationMapPickerModal from "./LocationMapPickerModal";

/**
 * Standardizes pasted scope of work text from WhatsApp, email, or documents
 * into clean, uniform bullet points with proper capitalization.
 */
function standardizeScopeText(raw: string): string {
  if (!raw) return "";

  // 1. Clean chat timestamps and headers
  let cleaned = raw
    .replace(/^\[\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?(?:,\s*[\d/.-]+)?\]\s*[^:\n]+:\s*/gm, "")
    .replace(/^\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\s*-\s*[^:\n]+:\s*/gm, "")
    .replace(/^(?:Client|Scope|Requirements?):\s*/gim, "");

  // 2. If single-line table copy (e.g. "SL. No. Description Qty 1 ... 1 Job 2 ..."), split by row
  if (!cleaned.includes("\n")) {
    cleaned = cleaned.replace(/^SL\.?\s*No\.?\s*(?:Description)?\s*(?:Qty)?\s*/i, "");
    cleaned = cleaned.replace(
      /(\d+(?:\.\d+)?\s*(?:Job|Mtr|Lot|Nos?|Pcs?|sqm|sq\.m|m2|m|set|ls|each))\s+(\d+)\s+/gi,
      "$1\n• ",
    );
    cleaned = cleaned.replace(/(?:^|\s+)(\d+)[\.\)]\s+/g, "\n• ");
    cleaned = cleaned.replace(/^(\d+)\s+/g, "• ");
  }

  const lines = cleaned.split(/\r?\n/);
  const result: string[] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Preserve section headers ending with colon (e.g. "Living Room:", "Kitchen Scope:")
    if (/^[A-Za-z0-9\s/&-]+:$/.test(line)) {
      if (result.length > 0) result.push("");
      result.push(line);
      continue;
    }

    // Strip existing bullet markers (*, -, •, +, >, ~, or numbering like 1., 1), (1))
    line = line
      .replace(/^[\s*•\-+>~–—]+\s*/, "")
      .replace(/^\(?\d+\s*[\.\)]\s*/, "")
      .trim();

    if (!line) continue;

    // Capitalize the first letter
    line = line.charAt(0).toUpperCase() + line.slice(1);

    result.push(`• ${line}`);
  }

  return result.join("\n").trim();
}

const PHONE_DIGITS = 10;
const phonePattern = /^\d{10}$/;

type InquiryFormProps = {
  mode?: "create" | "edit";
  initialValues?: CreateInquiryPayload | null;
  onSubmit: (payload: CreateInquiryPayload) => Promise<void>;
};

type FormState = {
  clientName: string;
  contactPersonName: string;
  phone: string;
  category: InquiryCategory;
  scopeOfWork: string;
  siteDetails: string;
  fullAddress: string;
  googleMapsUrl: string;
  scheduleVisitDate: string;
  scheduleVisitTime: string;
  assignedPersonId: string;
  notes: string;
};

const emptyState: FormState = {
  clientName: "",
  contactPersonName: "",
  phone: "",
  category: INQUIRY_CATEGORIES[0],
  scopeOfWork: "",
  siteDetails: "",
  fullAddress: "",
  googleMapsUrl: "",
  scheduleVisitDate: "",
  scheduleVisitTime: "",
  assignedPersonId: "",
  notes: "",
};

function payloadToState(values: CreateInquiryPayload): FormState {
  return {
    clientName: values.clientName,
    contactPersonName: values.contactPersonName ?? "",
    phone: values.phone,
    category: values.category,
    scopeOfWork: values.scopeOfWork,
    siteDetails: values.siteDetails ?? "",
    fullAddress: values.fullAddress,
    googleMapsUrl: values.googleMapsUrl ?? "",
    scheduleVisitDate: visitDateToInputValue(values.scheduleVisitDate),
    scheduleVisitTime: values.scheduleVisitTime,
    assignedPersonId: values.assignedPersonId,
    notes: values.notes ?? "",
  };
}

function InquiryForm({ mode = "create", initialValues = null, onSubmit }: InquiryFormProps) {
  const [form, setForm] = useState<FormState>(emptyState);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [scopeFiles, setScopeFiles] = useState<File[]>([]);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const { msg, notifyOk, notifyErrText, dismiss } = useAppFeedback();

  useEffect(() => {
    void getAssignableTeamMembers().then(setTeam).catch(() => setTeam([]));
  }, []);

  useEffect(() => {
    if (mode === "edit" && initialValues) setForm(payloadToState(initialValues));
    if (mode === "create" && !initialValues) setForm(emptyState);
  }, [mode, initialValues]);

  const isValid = useMemo(
    () =>
      form.clientName.trim() &&
      phonePattern.test(form.phone) &&
      form.scopeOfWork.trim() &&
      form.fullAddress.trim() &&
      form.assignedPersonId &&
      form.scheduleVisitDate &&
      form.scheduleVisitTime.trim(),
    [form],
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleScopeFilesAdded(incoming: FileList | null) {
    if (!incoming || incoming.length === 0) return;
    const newFiles = Array.from(incoming);
    setScopeFiles((prev) => [...prev, ...newFiles]);

    // If scope of work is currently empty, autofill reference to attached document
    if (!form.scopeOfWork.trim()) {
      const filenames = newFiles.map((f) => f.name).join(", ");
      updateField("scopeOfWork", `• Scope of work as per attached document: ${filenames}`);
    }
  }

  function removeScopeFile(index: number) {
    setScopeFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleScopePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const text = e.clipboardData.getData("text");
    if (!text) return;
    // Standardize if multiline or formatted as bullet/numbered list
    if (text.includes("\n") || /^[\s*•\-+>~0-9]/.test(text.trim())) {
      e.preventDefault();
      const formatted = standardizeScopeText(text);
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const current = form.scopeOfWork;
      const next = current.substring(0, start) + formatted + current.substring(end);
      updateField("scopeOfWork", next);
    }
  }

  function handleStandardizeScope() {
    if (!form.scopeOfWork.trim()) return;
    const standardized = standardizeScopeText(form.scopeOfWork);
    updateField("scopeOfWork", standardized);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dismiss();
    if (!phonePattern.test(form.phone)) {
      notifyErrText(`Phone number must be exactly ${PHONE_DIGITS} digits.`);
      return;
    }
    if (!isValid) {
      notifyErrText("Please complete all required fields before submitting.");
      return;
    }
    if (team.length === 0) {
      notifyErrText("No active field staff available. Please add one from Team module.");
      return;
    }

    setLoading(true);
    try {
      const allFiles = [...scopeFiles, ...attachmentFiles];
      await onSubmit({
        clientName: form.clientName.trim(),
        contactPersonName: form.contactPersonName.trim(),
        phone: form.phone.trim(),
        category: form.category,
        scopeOfWork: form.scopeOfWork.trim(),
        siteDetails: form.siteDetails.trim(),
        fullAddress: form.fullAddress.trim(),
        googleMapsUrl: form.googleMapsUrl.trim(),
        scheduleVisitDate: form.scheduleVisitDate,
        scheduleVisitTime: form.scheduleVisitTime.trim(),
        assignedPersonId: form.assignedPersonId,
        notes: form.notes.trim(),
        attachmentFiles: allFiles,
      });
      if (mode === "create") {
        setForm(emptyState);
        setAttachmentFiles([]);
        setScopeFiles([]);
      }
      notifyOk(
        mode === "edit"
          ? "Inquiry updated successfully."
          : "Inquiry created successfully. Redirecting to details...",
      );
    } catch {
      notifyErrText(
        mode === "edit" ? "Unable to update inquiry. Please try again." : "Unable to create inquiry. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <AppFeedbackPopup msg={msg} onDismiss={dismiss} />

      <SectionCard
        icon={UserRound}
        title="Company Information"
        subtitle="Capture company basics, contact person and visit assignment."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Company Name"
            value={form.clientName}
            required
            onChange={(v) => updateField("clientName", v)}
            placeholder="e.g. Acme Fitouts / Client Co."
          />
          <Input
            label="Contact Person Name"
            value={form.contactPersonName}
            onChange={(v) => updateField("contactPersonName", v)}
            placeholder="e.g. John Doe / Project Manager"
          />
          <Input
            label="Phone"
            value={form.phone}
            required
            onChange={(v) => updateField("phone", v.replace(/\D/g, "").slice(0, 10))}
          />
          <Select
            label="Category"
            value={form.category}
            options={[...INQUIRY_CATEGORIES]}
            onChange={(v) => updateField("category", v as InquiryCategory)}
          />
          <div className="md:col-span-2">
            <Select
              label="Assign Person"
              value={form.assignedPersonId}
              options={team.map((m) => ({ value: m._id, label: `${m.name} (${m.employeeId})` }))}
              placeholder={team.length === 0 ? "No field staff available" : "Select field staff"}
              required
              onChange={(v) => updateField("assignedPersonId", v)}
            />
            {team.length === 0 ? (
              <p className="mt-1 text-xs text-amber-600">
                No active field staff found. Go to <strong>Team</strong> to add a Site Engineer or Supervisor.
              </p>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={ClipboardList}
        title="Scope of Work"
        subtitle="Describe the work and site requirements clearly."
      >
        <div className="space-y-4">
          <TextArea
            label="Scope of Work"
            value={form.scopeOfWork}
            required
            placeholder="Enter scope items or paste requirements (will auto-format into clean bullets)..."
            onChange={(v) => updateField("scopeOfWork", v)}
            onPaste={handleScopePaste}
            actionButton={
              form.scopeOfWork.trim() ? (
                <button
                  type="button"
                  onClick={handleStandardizeScope}
                  title="Format scope of work into clean standard bullet points"
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-gold hover:text-brand-gold-muted transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Standardize Bullets</span>
                </button>
              ) : null
            }
          />

          {/* Scope of Work Document Upload */}
          <div className="rounded-xl border border-dashed border-surface-border bg-surface-card/60 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Attach Scope of Work Document (Optional)
                </label>
                <p className="text-xs text-text-muted">
                  Upload RFP, PDF, Word doc, Excel, or specifications if already available.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-xs font-medium text-text-primary shadow-xs hover:bg-surface-border/40 transition-colors">
                <Upload className="h-3.5 w-3.5 text-brand-gold" />
                <span>Upload Document</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleScopeFilesAdded(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {scopeFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {scopeFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-border-light px-2.5 py-1 text-xs text-text-primary"
                  >
                    <FileText className="h-3.5 w-3.5 text-brand-gold shrink-0" />
                    <span className="max-w-[200px] truncate" title={file.name}>
                      {file.name}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => removeScopeFile(idx)}
                      className="rounded p-0.5 text-text-muted hover:bg-surface-border hover:text-text-primary transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <TextArea label="Site Details / Requirements" value={form.siteDetails} onChange={(v) => updateField("siteDetails", v)} />
          <TextArea label="Notes" value={form.notes} onChange={(v) => updateField("notes", v)} rows={2} />
        </div>
      </SectionCard>

      <SectionCard
        icon={MapPin}
        title="Location & Schedule"
        subtitle="Provide full address, Google Maps link, and planned visit time."
      >
        <div className="space-y-4">
          <TextArea
            label="Full Address"
            value={form.fullAddress}
            required
            onChange={(v) => updateField("fullAddress", v)}
            rows={2}
            placeholder="Enter street, building, flat/office, area, city..."
          />

          {/* Google Maps URL & Map Picker */}
          <div className="rounded-xl border border-surface-border bg-surface-muted/40 p-3.5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Google Maps Link / URL (Optional)
              </label>
              <button
                type="button"
                onClick={() => setShowMapPicker(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-gold/30 bg-brand-gold/10 px-2.5 py-1 text-xs font-semibold text-brand-gold shadow-xs hover:bg-brand-gold/20 transition-colors cursor-pointer"
                title="Pick exact location pin on interactive map"
              >
                <MapPin className="h-3.5 w-3.5 text-brand-gold" />
                <span>Select on Map</span>
              </button>
            </div>

            <Input
              label=""
              value={form.googleMapsUrl}
              onChange={(v) => updateField("googleMapsUrl", v)}
              placeholder="Paste Google Maps link (e.g. https://maps.app.goo.gl/... or https://maps.google.com/?q=...)"
            />
            <p className="mt-1.5 text-[11px] text-text-muted">
              Site engineers can tap this on their mobile phones to launch 1-click turn-by-turn driving navigation.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Schedule Visit Date" type="date" value={form.scheduleVisitDate} required onChange={(v) => updateField("scheduleVisitDate", v)} />
            <Input label="Schedule Visit Time" type="time" value={form.scheduleVisitTime} required onChange={(v) => updateField("scheduleVisitTime", v)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={Paperclip}
        title="Attachments"
        subtitle="Optional reference images from customer/site."
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">Attachments / reference images (optional)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setAttachmentFiles(Array.from(e.target.files ?? []))}
            className={`${themeClasses.input} file:mr-3 file:rounded-lg file:border-0 file:bg-ui-primary-light file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ui-primary hover:file:bg-ui-primary-light/80`}
          />
          {attachmentFiles.length > 0 ? (
            <p className="mt-2 rounded-lg bg-surface-border-light px-3 py-2 text-xs text-text-secondary">
              {formatCount(attachmentFiles.length, "file", "files")} selected
            </p>
          ) : null}
        </div>
      </SectionCard>

      <div className="bottom-2 z-10 rounded-lg border-[0.5px] border-surface-border bg-surface-card p-3">
        <div className="flex justify-end">
          <button type="submit" disabled={loading} className={`${themeClasses.btnPrimary} disabled:cursor-not-allowed`}>
            {loading ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {mode === "edit" ? "Updating…" : "Creating…"}
              </>
            ) : mode === "edit" ? (
              "Update Inquiry"
            ) : (
              "Create Inquiry"
            )}
          </button>
        </div>
      </div>

      <LocationMapPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        initialAddress={form.fullAddress}
        initialUrl={form.googleMapsUrl}
        onSelectLocation={({ googleMapsUrl, address }) => {
          updateField("googleMapsUrl", googleMapsUrl);
          if (address) {
            updateField("fullAddress", address);
          }
        }}
      />
    </form>
  );
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof ClipboardList;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className={themeClasses.cardPadding}>
      <div className="mb-4 flex items-start gap-3">
        <span className="rounded-lg bg-brand-gold/15 p-2 text-brand-gold-muted">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="text-xs text-text-muted">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      {label ? (
        <label className="mb-1 block text-sm font-medium text-text-secondary">
          {label} {required ? <span className="text-rose-500">*</span> : null}
        </label>
      ) : null}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={themeClasses.input}
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  required = false,
  rows = 3,
  placeholder,
  actionButton,
  onPaste,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
  placeholder?: string;
  actionButton?: ReactNode;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="block text-sm font-medium text-text-secondary">
          {label} {required ? <span className="text-rose-500">*</span> : null}
        </label>
        {actionButton}
      </div>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onPaste}
        className={themeClasses.input}
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  options: string[] | { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const normalized = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-text-secondary">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full ${themeClasses.select}`}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {normalized.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default InquiryForm;


