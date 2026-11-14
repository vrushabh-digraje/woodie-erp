import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  Loader2,
  FileText,
  Download,
  Plus,
  Trash2,
  RotateCcw,
  PenLine,
} from "lucide-react";
import {
  RAMS_PRESETS,
  detectPresetKey,
  type RamsPreset,
  type RamsPayload,
  type RamsRiskItem,
  type RamsMethodStep,
} from "./ramsPresets";
import { downloadRamsPdf } from "./boqApi";
import { getBoqApiErrorMessage } from "./boqFeedback";
import letterheadHeader from "../../assets/pdf/pdf_header.png";
import letterheadFooter from "../../assets/pdf/pdf_footer.png";
import signatureStamp from "../../assets/pdf/pdf_signature.png";
import watermarkImg from "../../assets/pdf/pdf_watermark.png";

interface RamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  projectName?: string;
  clientName?: string;
  defaultLocation?: string;
  defaultScope?: string;
  quoteDate?: string | Date | null;
  onSuccess?: (msg: string) => void;
  onError?: (err: unknown, fallback: string) => void;
}

export const RamsModal: React.FC<RamsModalProps> = ({
  isOpen,
  onClose,
  quotationId,
  projectName = "",
  clientName = "",
  defaultLocation = "",
  defaultScope = "",
  quoteDate = null,
  onSuccess,
  onError,
}) => {
  const initialPresetKey = detectPresetKey(defaultScope || projectName || defaultLocation);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>(initialPresetKey);
  const [locationName, setLocationName] = useState<string>(
    defaultLocation || "Dubai, UAE"
  );
  const [activeTab, setActiveTab] = useState<"ra" | "mos">("ra");
  const [downloadingType, setDownloadingType] = useState<
    "risk_assessment" | "mos" | "combined" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isManual = selectedPresetKey === "manual";

  // Manual editable state
  const [customSubject, setCustomSubject] = useState<string>(projectName || "");
  const [customScope, setCustomScope] = useState<string[]>([]);
  const [customMaterials, setCustomMaterials] = useState<string[]>([]);
  const [customTools, setCustomTools] = useState<string[]>([]);
  const [customMethodology, setCustomMethodology] = useState<RamsMethodStep[]>([]);
  const [customRisks, setCustomRisks] = useState<RamsRiskItem[]>([]);

  const preset: RamsPreset = RAMS_PRESETS[selectedPresetKey] || RAMS_PRESETS.water_heater;

  const populateFromPreset = (key: string) => {
    const p = RAMS_PRESETS[key] || RAMS_PRESETS.water_heater;
    setCustomScope([...p.defaultScope]);
    setCustomMaterials([...p.materials]);
    setCustomTools([...p.tools]);
    setCustomMethodology(p.methodology.map((m) => ({ ...m })));
    setCustomRisks(p.risks.map((r) => ({ ...r })));
  };

  // Sync preset if defaultScope or projectName changes
  useEffect(() => {
    const detected = detectPresetKey(defaultScope || projectName || defaultLocation);
    setSelectedPresetKey(detected);
    populateFromPreset(detected);
    if (projectName) {
      setCustomSubject(projectName);
    }
  }, [defaultScope, projectName, defaultLocation]);

  useEffect(() => {
    if (defaultLocation) {
      setLocationName(defaultLocation);
    }
  }, [defaultLocation]);

  const handlePresetChange = (newKey: string) => {
    setSelectedPresetKey(newKey);
    if (newKey !== "manual") {
      populateFromPreset(newKey);
    } else {
      // If switching to manual and custom state is empty, seed it with manual template
      if (customRisks.length === 0) {
        populateFromPreset("manual");
      }
    }
  };

  // Format date DD/MM/YYYY
  const displayDate = (() => {
    const d = quoteDate ? new Date(quoteDate) : new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()}`;
  })();

  const displayProject =
    isManual && customSubject.trim()
      ? customSubject.trim()
      : projectName.trim() || preset.title;
  const displayClient = clientName.trim() || "Valued Client";

  // Manual editing handlers
  const addRiskRow = () => {
    setCustomRisks((prev) => [
      ...prev,
      {
        no: prev.length + 1,
        activity: "",
        hazard: "",
        risk: "",
        controls: "",
        level: "Low",
      },
    ]);
  };

  const removeRiskRow = (index: number) => {
    setCustomRisks((prev) =>
      prev.filter((_, i) => i !== index).map((r, i) => ({ ...r, no: i + 1 }))
    );
  };

  const updateRiskRow = (
    index: number,
    field: keyof RamsRiskItem,
    value: string | number
  ) => {
    setCustomRisks((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const addScopeItem = () => {
    setCustomScope((prev) => [...prev, ""]);
  };

  const removeScopeItem = (index: number) => {
    setCustomScope((prev) => prev.filter((_, i) => i !== index));
  };

  const updateScopeItem = (index: number, value: string) => {
    setCustomScope((prev) => prev.map((s, i) => (i === index ? value : s)));
  };

  const addMaterialItem = () => {
    setCustomMaterials((prev) => [...prev, ""]);
  };

  const removeMaterialItem = (index: number) => {
    setCustomMaterials((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMaterialItem = (index: number, value: string) => {
    setCustomMaterials((prev) => prev.map((m, i) => (i === index ? value : m)));
  };

  const addToolItem = () => {
    setCustomTools((prev) => [...prev, ""]);
  };

  const removeToolItem = (index: number) => {
    setCustomTools((prev) => prev.filter((_, i) => i !== index));
  };

  const updateToolItem = (index: number, value: string) => {
    setCustomTools((prev) => prev.map((t, i) => (i === index ? value : t)));
  };

  const addMethodologyStep = () => {
    setCustomMethodology((prev) => [
      ...prev,
      { step: "New Step", text: "" },
    ]);
  };

  const removeMethodologyStep = (index: number) => {
    setCustomMethodology((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMethodologyStep = (
    index: number,
    field: "step" | "text",
    value: string
  ) => {
    setCustomMethodology((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  if (!isOpen) return null;

  async function handleDownload(docType: "risk_assessment" | "mos" | "combined") {
    if (!quotationId) return;
    setDownloadingType(docType);
    setErrorMessage(null);
    try {
      const payload: RamsPayload = {
        locationName: locationName.trim() || "Dubai, UAE",
        presetKey: selectedPresetKey,
        docType,
        projectName: displayProject,
        clientName: displayClient,
        ...(isManual
          ? {
              tradeTitle: customSubject.trim() || undefined,
              subject: customSubject.trim() || undefined,
              scopeOfWork: customScope.filter((s) => s.trim().length > 0),
              materials: customMaterials.filter((m) => m.trim().length > 0),
              tools: customTools.filter((t) => t.trim().length > 0),
              methodology: customMethodology.filter(
                (m) => m.step.trim().length > 0 || m.text.trim().length > 0
              ),
              risks: customRisks.filter(
                (r) =>
                  r.activity.trim().length > 0 ||
                  r.hazard.trim().length > 0 ||
                  r.risk.trim().length > 0
              ),
            }
          : {}),
      };

      const blob = await downloadRamsPdf(quotationId, payload, docType);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeLoc = (displayProject || "Project").replace(/[^\w.-]+/g, "_");

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
            : "Combined RAMS Package (PDF)";

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
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Risk Assessment &amp; Method of Statement (RAMS)
              </h2>
              <p className="text-xs text-slate-500">
                Official Woodie letterhead, stamp &amp; signature. Auto-filled directly from this quotation.
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              {errorMessage}
            </div>
          )}

          {/* Quotation Metadata Card */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 text-xs text-slate-700">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Project</span>
              <span className="font-semibold text-slate-900 truncate block" title={displayProject}>
                {displayProject}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Client</span>
              <span className="font-semibold text-slate-900 truncate block" title={displayClient}>
                {displayClient}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Location</span>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-900 shadow-2xs focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Trade Preset</span>
              <select
                value={selectedPresetKey}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-900 shadow-2xs focus:border-brand-primary focus:outline-none"
              >
                {Object.values(RAMS_PRESETS).map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* When Enter is selected, show Subject/Trade input banner */}
          {isManual && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-amber-50/90 border border-amber-200 px-4 py-2.5 rounded-xl text-xs text-amber-900 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
                <label className="text-[11px] font-bold text-amber-800 whitespace-nowrap flex items-center gap-1.5">
                  <PenLine className="h-4 w-4 text-amber-700" />
                  Enter Trade / Subject:
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="e.g. HVAC Duct Cleaning & Maintenance, Marble Polishing, etc."
                  className="flex-1 bg-white border border-amber-300 rounded px-2.5 py-1 text-xs font-semibold text-slate-900 shadow-2xs focus:border-amber-600 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => populateFromPreset("manual")}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:text-amber-950 bg-white hover:bg-amber-100/60 px-2.5 py-1 rounded-md border border-amber-300 transition-colors self-end sm:self-auto cursor-pointer"
                title="Reset fields to clean template"
              >
                <RotateCcw className="h-3 w-3" /> Reset Template
              </button>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("ra")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "ra"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              1. Risk Assessment (Table)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("mos")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "mos"
                  ? "bg-blue-700 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              2. Method of Statement (MOS)
            </button>
          </div>

          {/* TAB 1: Risk Assessment Table */}
          {activeTab === "ra" && (
            <div className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-xs font-sans overflow-hidden">
              {/* Background Watermark */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-0 overflow-hidden">
                <img
                  src={watermarkImg}
                  alt="Woodie Watermark"
                  className="w-72 sm:w-96 h-auto opacity-35 object-contain select-none"
                />
              </div>

              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                  Risk Assessment Table
                </span>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleDownload("risk_assessment")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200/80 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {downloadingType === "risk_assessment" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Download PDF
                </button>
              </div>

              {/* Official Woodie Letterhead Header Banner */}
              <div className="w-full rounded-lg overflow-hidden border border-slate-800/80 shadow-xs bg-[#111111]">
                <img
                  src={letterheadHeader}
                  alt="Woodie Technical Services Contracting LLC"
                  className="w-full h-auto object-cover max-h-24 sm:max-h-28 block"
                />
              </div>

              <div className="text-center font-bold text-lg text-black pt-1">
                Risk Assessment
              </div>
              <div className="font-bold text-xs text-black">
                {displayProject}
              </div>

              <div className="text-xs leading-relaxed text-slate-700 space-y-0.5">
                <div><strong>1. Project:</strong> {displayProject}</div>
                <div><strong>Location:</strong> {locationName}</div>
                <div><strong>Client:</strong> {displayClient}</div>
                <div><strong>Date:</strong> {displayDate}</div>
              </div>

              {/* Editable Table for Manual Entry */}
              {isManual ? (
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="bg-slate-50 text-slate-900 border-b border-slate-200 font-bold">
                        <tr>
                          <th className="py-2 px-2.5 w-10 text-center">No.</th>
                          <th className="py-2 px-2.5 w-40">Work Activity</th>
                          <th className="py-2 px-2.5 w-40">Hazard</th>
                          <th className="py-2 px-2.5 w-40">Potential Risk</th>
                          <th className="py-2 px-2.5">Control Measures</th>
                          <th className="py-2 px-2.5 w-24 text-center">Risk Level</th>
                          <th className="py-2 px-2 w-8 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {customRisks.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-2.5 text-center font-semibold text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-1 px-1.5">
                              <input
                                type="text"
                                value={r.activity}
                                onChange={(e) => updateRiskRow(idx, "activity", e.target.value)}
                                placeholder="Work Activity"
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                              />
                            </td>
                            <td className="py-1 px-1.5">
                              <input
                                type="text"
                                value={r.hazard}
                                onChange={(e) => updateRiskRow(idx, "hazard", e.target.value)}
                                placeholder="Hazard"
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                              />
                            </td>
                            <td className="py-1 px-1.5">
                              <input
                                type="text"
                                value={r.risk}
                                onChange={(e) => updateRiskRow(idx, "risk", e.target.value)}
                                placeholder="Potential Risk"
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                              />
                            </td>
                            <td className="py-1 px-1.5">
                              <input
                                type="text"
                                value={r.controls}
                                onChange={(e) => updateRiskRow(idx, "controls", e.target.value)}
                                placeholder="Control Measures"
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                              />
                            </td>
                            <td className="py-1 px-1.5 text-center">
                              <select
                                value={r.level}
                                onChange={(e) => updateRiskRow(idx, "level", e.target.value as "Low" | "Medium" | "High")}
                                className={`w-full text-xs font-bold rounded px-1.5 py-1 border ${
                                  r.level === "High"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : r.level === "Medium"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                              </select>
                            </td>
                            <td className="py-1 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => removeRiskRow(idx)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                                title="Remove row"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={addRiskRow}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Risk Row
                    </button>
                    <span className="text-[11px] text-slate-400">
                      {customRisks.length} hazard rows configured
                    </span>
                  </div>
                </div>
              ) : (
                /* Read-Only Table for Presets */
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-slate-50 text-slate-900 border-b border-slate-200 font-bold">
                      <tr>
                        <th className="py-2 px-2.5 w-10 text-center">No.</th>
                        <th className="py-2 px-2.5 w-36">Work Activity</th>
                        <th className="py-2 px-2.5 w-36">Hazard</th>
                        <th className="py-2 px-2.5 w-36">Potential Risk</th>
                        <th className="py-2 px-2.5">Control Measures</th>
                        <th className="py-2 px-2.5 w-20 text-center">Risk Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {preset.risks.map((r) => (
                        <tr key={r.no} className="hover:bg-slate-50/50">
                          <td className="py-2 px-2.5 text-center font-semibold text-slate-500">{r.no}</td>
                          <td className="py-2 px-2.5 font-semibold text-slate-900">{r.activity}</td>
                          <td className="py-2 px-2.5">{r.hazard}</td>
                          <td className="py-2 px-2.5">{r.risk}</td>
                          <td className="py-2 px-2.5">{r.controls}</td>
                          <td className="py-2 px-2.5 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.level === "High"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : r.level === "Medium"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {r.level}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Stamp & Signature + Official Woodie Letterhead Footer Banner */}
              <div className="pt-4 space-y-3">
                <div className="flex justify-end pr-2">
                  <div className="text-right">
                    <img
                      src={signatureStamp}
                      alt="Authorized Signature & Stamp"
                      className="w-36 sm:w-44 h-auto inline-block"
                    />
                  </div>
                </div>
                <div className="w-full rounded-lg overflow-hidden border border-slate-800/80 shadow-xs bg-[#111111]">
                  <img
                    src={letterheadFooter}
                    alt="Woodie Contact & Address"
                    className="w-full h-auto object-cover max-h-12 block"
                  />
                </div>
              </div>
              </div>
            </div>
          )}

          {/* TAB 2: Method of Statement (MOS) */}
          {activeTab === "mos" && (
            <div className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-xs font-sans overflow-hidden">
              {/* Background Watermark */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-0 overflow-hidden">
                <img
                  src={watermarkImg}
                  alt="Woodie Watermark"
                  className="w-72 sm:w-96 h-auto opacity-35 object-contain select-none"
                />
              </div>

              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-700" />
                  Method of Statement (MOS)
                </span>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleDownload("mos")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200/80 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {downloadingType === "mos" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Download PDF
                </button>
              </div>

              {/* Official Woodie Letterhead Header Banner */}
              <div className="w-full rounded-lg overflow-hidden border border-slate-800/80 shadow-xs bg-[#111111]">
                <img
                  src={letterheadHeader}
                  alt="Woodie Technical Services Contracting LLC"
                  className="w-full h-auto object-cover max-h-24 sm:max-h-28 block"
                />
              </div>

              <div className="text-center font-bold text-lg uppercase text-black tracking-wide pt-1">
                METHOD OF STATEMENT
              </div>
              <div className="font-bold text-xs text-black">
                {displayProject}
              </div>

              <div className="text-xs leading-relaxed text-slate-700 space-y-0.5">
                <div><strong>Project:</strong> {displayProject}</div>
                <div><strong>Location:</strong> {locationName}</div>
                <div><strong>Client:</strong> {displayClient}</div>
                <div><strong>Date:</strong> {displayDate}</div>
              </div>

              {/* Section 1: Scope of Work */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    1. Scope of Work
                  </div>
                  {isManual && (
                    <button
                      type="button"
                      onClick={addScopeItem}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Add Scope Item
                    </button>
                  )}
                </div>

                {isManual ? (
                  <div className="space-y-1.5">
                    {customScope.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs font-mono w-5 text-right">{idx + 1}.</span>
                        <input
                          type="text"
                          value={s}
                          onChange={(e) => updateScopeItem(idx, e.target.value)}
                          placeholder="Scope point..."
                          className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeScopeItem(idx)}
                          className="text-slate-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-slate-600 font-medium">The work includes:</div>
                    <ul className="list-disc pl-5 text-xs space-y-1 text-slate-700">
                      {preset.defaultScope.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* Section 2: Materials & Equipment */}
              <div className="space-y-2 pt-1">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  2. Materials and Equipment
                </div>

                {isManual ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Materials */}
                    <div className="space-y-2 bg-slate-50/70 p-3 rounded-lg border border-slate-200/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">Materials:</span>
                        <button
                          type="button"
                          onClick={addMaterialItem}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Plus className="h-2.5 w-2.5" /> Add
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {customMaterials.map((m, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={m}
                              onChange={(e) => updateMaterialItem(idx, e.target.value)}
                              placeholder="Material name / spec"
                              className="flex-1 bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => removeMaterialItem(idx)}
                              className="text-slate-400 hover:text-red-600 p-0.5 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tools */}
                    <div className="space-y-2 bg-slate-50/70 p-3 rounded-lg border border-slate-200/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">Tools &amp; Equipment:</span>
                        <button
                          type="button"
                          onClick={addToolItem}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Plus className="h-2.5 w-2.5" /> Add
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {customTools.map((t, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={t}
                              onChange={(e) => updateToolItem(idx, e.target.value)}
                              placeholder="Tool or equipment name"
                              className="flex-1 bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => removeToolItem(idx)}
                              className="text-slate-400 hover:text-red-600 p-0.5 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <ul className="list-disc pl-5 text-xs space-y-1 text-slate-700">
                    {preset.materials.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                    {preset.tools.map((t, idx) => (
                      <li key={`t-${idx}`}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Section 3: Methodology */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    3. Methodology / Work Procedure
                  </div>
                  {isManual && (
                    <button
                      type="button"
                      onClick={addMethodologyStep}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Add Step
                    </button>
                  )}
                </div>

                {isManual ? (
                  <div className="space-y-2.5">
                    {customMethodology.map((m, idx) => (
                      <div key={idx} className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/60 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 font-mono w-5">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            value={m.step}
                            onChange={(e) => updateMethodologyStep(idx, "step", e.target.value)}
                            placeholder="Step Title (e.g. Surface Preparation)"
                            className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => removeMethodologyStep(idx)}
                            className="text-slate-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                            title="Remove step"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <textarea
                          value={m.text}
                          rows={2}
                          onChange={(e) => updateMethodologyStep(idx, "text", e.target.value)}
                          placeholder="Detailed procedure instructions..."
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:border-blue-600 focus:outline-none resize-none"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5 pl-1">
                    {preset.methodology.map((m, idx) => (
                      <div key={idx} className="text-xs leading-relaxed text-slate-700">
                        <strong className="text-slate-900">{idx + 1}. {m.step}:</strong> {m.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 4-7 HSE & Quality */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-700">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                  <div className="font-bold text-slate-900 mb-1">4. HSE Requirements</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    <li>Mandatory PPE compliance at all times.</li>
                    <li>Edge protection and fall prevention.</li>
                    <li>Safety barricades and clear warning signage.</li>
                    <li>UAE heat-stress guidelines compliance.</li>
                  </ul>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                  <div className="font-bold text-slate-900 mb-1">5. Quality Control</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    <li>Only approved materials complying with specs.</li>
                    <li>Inspection prior to concealment.</li>
                    <li>Pressure / leak testing before handover.</li>
                    <li>Formal client inspection sign-off.</li>
                  </ul>
                </div>
              </div>

              {/* Stamp & Signature + Official Woodie Letterhead Footer Banner */}
              <div className="pt-4 space-y-3">
                <div className="flex justify-end pr-2">
                  <div className="text-right">
                    <img
                      src={signatureStamp}
                      alt="Authorized Signature & Stamp"
                      className="w-36 sm:w-44 h-auto inline-block"
                    />
                  </div>
                </div>
                <div className="w-full rounded-lg overflow-hidden border border-slate-800/80 shadow-xs bg-[#111111]">
                  <img
                    src={letterheadFooter}
                    alt="Woodie Contact & Address"
                    className="w-full h-auto object-cover max-h-12 block"
                  />
                </div>
              </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions with Separate Download Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs w-full sm:w-auto cursor-pointer"
          >
            Close
          </button>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            {/* Button 1: Download Risk Assessment */}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleDownload("risk_assessment")}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all disabled:opacity-50 cursor-pointer"
              title="Download Risk Assessment Table as PDF"
            >
              {downloadingType === "risk_assessment" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download Risk Assessment (PDF)
                </>
              )}
            </button>

            {/* Button 2: Download Method of Statement (MOS) */}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleDownload("mos")}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-all disabled:opacity-50 cursor-pointer"
              title="Download Method of Statement as PDF"
            >
              {downloadingType === "mos" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download Method Statement (MOS) (PDF)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
