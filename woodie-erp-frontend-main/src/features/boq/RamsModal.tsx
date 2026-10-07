import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  Download,
  Loader2,
  FileText,
  Building2,
  Layers,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";
import {
  RAMS_PRESETS,
  detectPresetKey,
  type RamsPreset,
  type RamsPayload,
} from "./ramsPresets";
import { downloadRamsPdf } from "./boqApi";
import { getBoqApiErrorMessage } from "./boqFeedback";

interface RamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  defaultLocation?: string;
  defaultScope?: string;
  onSuccess?: (msg: string) => void;
  onError?: (err: unknown, fallback: string) => void;
}

export const RamsModal: React.FC<RamsModalProps> = ({
  isOpen,
  onClose,
  quotationId,
  defaultLocation = "",
  defaultScope = "",
  onSuccess,
  onError,
}) => {
  const initialPresetKey = detectPresetKey(defaultScope || defaultLocation);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>(initialPresetKey);
  const [locationName, setLocationName] = useState<string>(
    defaultLocation || "Project Site"
  );
  const [activeTab, setActiveTab] = useState<"all" | "ra" | "mos" | "customize">("all");
  const [downloadingType, setDownloadingType] = useState<
    "risk_assessment" | "mos" | "combined" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editable fields initialized from preset
  const preset: RamsPreset = RAMS_PRESETS[selectedPresetKey] || RAMS_PRESETS.glass_film;
  const [workTypeLower, setWorkTypeLower] = useState(preset.workTypeLower);
  const [workTypeCap, setWorkTypeCap] = useState(preset.workTypeCap);
  const [mosScope, setMosScope] = useState(preset.mosScope);

  // Sync state when preset changes
  useEffect(() => {
    const p = RAMS_PRESETS[selectedPresetKey] || RAMS_PRESETS.glass_film;
    setWorkTypeLower(p.workTypeLower);
    setWorkTypeCap(p.workTypeCap);
    setMosScope(p.mosScope);
  }, [selectedPresetKey]);

  // Sync location from props
  useEffect(() => {
    if (defaultLocation) {
      setLocationName(defaultLocation);
    }
  }, [defaultLocation]);

  if (!isOpen) return null;

  async function handleDownload(docType: "risk_assessment" | "mos" | "combined") {
    if (!quotationId) return;
    setDownloadingType(docType);
    setErrorMessage(null);
    try {
      const payload: RamsPayload = {
        locationName: locationName.trim() || "Project Site",
        presetKey: selectedPresetKey,
        docType,
        workTypeLower: workTypeLower.trim(),
        workTypeCap: workTypeCap.trim(),
        mosScope: mosScope.trim(),
        hazards: preset.hazards,
        controlMeasures: preset.controlMeasures,
        methodology: preset.methodology,
        safetyPrecautions: preset.safetyPrecautions,
      };

      const blob = await downloadRamsPdf(quotationId, payload, docType);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeLoc = (locationName.trim() || "Project").replace(/[^\w.-]+/g, "_");

      let docLabel = "RAMS";
      if (docType === "risk_assessment") docLabel = "Risk_Assessment";
      else if (docType === "mos") docLabel = "Method_of_Statement";

      link.download = `${docLabel}-${safeLoc}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      const humanName =
        docType === "risk_assessment"
          ? "Risk Assessment PDF"
          : docType === "mos"
            ? "Method of Statement (MOS) PDF"
            : "Combined RAMS PDF";

      onSuccess?.(`${humanName} downloaded successfully.`);
    } catch (err) {
      const msg = getBoqApiErrorMessage(err, "Failed to download document.");
      setErrorMessage(msg);
      onError?.(err, "Failed to download document.");
    } finally {
      setDownloadingType(null);
    }
  }

  const isBusy = downloadingType !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Risk Assessment &amp; Method of Statement (MOS)
              </h2>
              <p className="text-xs text-slate-500">
                Generate compliant documents with Woodie letterhead, stamp &amp; signature. Download as separate PDFs or a combined package.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              {errorMessage}
            </div>
          )}

          {/* Top Controls Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Trade Preset Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-brand-primary" />
                Work Scope / Trade Preset
              </label>
              <select
                value={selectedPresetKey}
                onChange={(e) => setSelectedPresetKey(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-2xs focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                {Object.values(RAMS_PRESETS).map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Project / Site Location Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-brand-primary" />
                Project / Site Location
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Rolex Tower Office"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-2xs focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "all"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              All (Combined 3 Pages)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ra")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "ra"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              1. Risk Assessment (1 Page)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("mos")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "mos"
                  ? "bg-blue-700 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              2. Method of Statement (2 Pages)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("customize")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "customize"
                  ? "bg-brand-primary text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Customize Text &amp; Scope
            </button>
          </div>

          {/* TAB: Risk Assessment Preview (shown when "all" or "ra" is active) */}
          {(activeTab === "all" || activeTab === "ra") && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm font-sans space-y-4 text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                  PDF 1: Risk Assessment (Single Page)
                </span>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleDownload("risk_assessment")}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer disabled:opacity-50"
                >
                  {downloadingType === "risk_assessment" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Download This PDF (1 Page)
                </button>
              </div>

              <div className="text-center font-bold text-base tracking-wide text-black">
                Risk assessment
              </div>

              <p className="text-xs leading-relaxed text-slate-800 text-justify">
                We are writing to provide you with a risk assessment report for the upcoming{" "}
                <span className="font-semibold text-emerald-800">{workTypeLower}</span> in{" "}
                <span className="font-semibold text-black">{locationName || "Project Site"}</span>.
                This assessment has been carried out to identify potential hazards and risks associated
                with the installation process and to implement measures to mitigate them.
              </p>

              <div className="space-y-1.5">
                <div className="text-xs font-bold text-black">Hazard Identification:</div>
                <ul className="list-disc pl-5 text-xs space-y-1 text-slate-800">
                  {preset.hazards.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-bold text-black">Risk Control Measures:</div>
                <ul className="list-disc pl-5 text-xs space-y-1 text-slate-800">
                  {preset.controlMeasures.map((c, i) => (
                    <li key={i}>
                      <span className="font-bold text-black">{c.title}:</span> {c.desc}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-bold text-black">Conclusion:</div>
                <p className="text-xs leading-relaxed text-slate-800 text-justify">
                  We are confident that by implementing the risk control measures outlined in this assessment,
                  we can minimize the risks associated with the {workTypeLower} and ensure a safe and
                  efficient installation process.
                </p>
                <p className="text-xs leading-relaxed text-slate-800">
                  If you have any further questions or concerns regarding this risk assessment report, please
                  do not hesitate to contact us.
                </p>
              </div>

              <div className="pt-2 text-xs text-slate-800 leading-snug">
                <div>Yours Sincerely,</div>
                <div className="font-bold text-black mt-1">Muhammad Ayyan</div>
                <div>Woodie Technical Services Contracting LLC</div>
                <div className="mt-1 text-[11px] text-emerald-700 italic flex items-center gap-1">
                  ✓ Official Stamp &amp; Signature Included
                </div>
              </div>
            </div>
          )}

          {/* TAB: Method of Statement Preview (shown when "all" or "mos" is active) */}
          {(activeTab === "all" || activeTab === "mos") && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm font-sans space-y-4 text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-800 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-blue-700" />
                  PDF 2: Method of Statement (MOS - 2 Pages)
                </span>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleDownload("mos")}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer disabled:opacity-50"
                >
                  {downloadingType === "mos" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Download This PDF (2 Pages)
                </button>
              </div>

              <div className="text-center font-bold text-base tracking-wide text-black">
                Method of Statement
              </div>

              <p className="text-xs leading-relaxed text-slate-800 text-justify">
                We are pleased to provide you with a Method of Statement for the{" "}
                <span className="font-semibold text-blue-800">{workTypeCap}</span> work to be carried out at{" "}
                <span className="font-semibold text-black">{locationName || "Project Site"}</span>.
                This document outlines the methodology and procedures that will be followed during the
                installation of the {workTypeLower}.
              </p>

              <div className="space-y-1.5">
                <div className="text-xs font-bold text-black">Scope of Work:</div>
                <p className="text-xs leading-relaxed text-slate-800 text-justify">
                  {mosScope}
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-black">Methodology:</div>
                {preset.methodology.map((m, i) => (
                  <div key={i} className="space-y-1">
                    <div className="text-xs font-bold text-slate-900">{m.phase}:</div>
                    <ul className="list-disc pl-5 text-xs space-y-0.5 text-slate-800">
                      {m.steps.map((s, si) => (
                        <li key={si}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-bold text-black">Safety Precautions:</div>
                <ul className="list-disc pl-5 text-xs space-y-1 text-slate-800">
                  {preset.safetyPrecautions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-dashed border-slate-200 mt-3">
                <span className="text-[10px] uppercase font-bold text-slate-400">Page 2 of Method Statement</span>
                <p className="text-xs leading-relaxed text-slate-800 text-justify">
                  We assure you that our team of skilled professionals will carry out the {workTypeLower} in a
                  safe and efficient manner, adhering to all the required safety standards and procedures. We
                  will also ensure that all work is carried out with minimal disruption to your operations.
                </p>
                <p className="text-xs leading-relaxed text-slate-800">
                  Please do not hesitate to contact us if you require any further information or clarification.
                </p>
              </div>

              <div className="pt-2 text-xs text-slate-800 leading-snug">
                <div>Yours Sincerely,</div>
                <div className="font-bold text-black mt-1">Muhammad Ayyan</div>
                <div>Woodie Technical Services Contracting LLC.</div>
                <div className="mt-1 text-[11px] text-emerald-700 italic flex items-center gap-1">
                  ✓ Official Stamp &amp; Signature Included
                </div>
              </div>
            </div>
          )}

          {/* TAB: Customize Text & Scope */}
          {activeTab === "customize" && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Work Type (Lowercase, e.g. "glass film installation")
                </label>
                <input
                  type="text"
                  value={workTypeLower}
                  onChange={(e) => setWorkTypeLower(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Work Type (Capitalized, e.g. "Glass Film")
                </label>
                <input
                  type="text"
                  value={workTypeCap}
                  onChange={(e) => setWorkTypeCap(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Method of Statement — Scope of Work Paragraph
                </label>
                <textarea
                  rows={4}
                  value={mosScope}
                  onChange={(e) => setMosScope(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <strong>Tip:</strong> The hazard list, control measures, and step-by-step methodology are
                  automatically loaded from the selected Trade Preset to ensure full building management compliance.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions with Separate Download Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs w-full sm:w-auto"
          >
            Close
          </button>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Button 1: Download Risk Assessment (PDF 1) */}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleDownload("risk_assessment")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all disabled:opacity-50 cursor-pointer"
              title="Download only Risk Assessment as a single 1-page PDF"
            >
              {downloadingType === "risk_assessment" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Download Risk Assessment (PDF)
                </>
              )}
            </button>

            {/* Button 2: Download Method of Statement (PDF 2) */}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleDownload("mos")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-all disabled:opacity-50 cursor-pointer"
              title="Download only Method of Statement as a separate 2-page PDF"
            >
              {downloadingType === "mos" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5" />
                  Download Method Statement (MOS) (PDF)
                </>
              )}
            </button>

            {/* Button 3: Download Combined (RAMS) */}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleDownload("combined")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 hover:text-slate-900 transition-all disabled:opacity-50 cursor-pointer"
              title="Download both Risk Assessment & MOS combined in 1 PDF package"
            >
              {downloadingType === "combined" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Layers className="h-3.5 w-3.5 text-slate-500" />
                  Combined (Both in 1 PDF)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
