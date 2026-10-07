import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import { AppFeedbackPopup, useAppFeedback } from "../../components/AppFeedback";
import { formatAed } from "../../lib/formatMoney";
import { getMaterials } from "../materials/materialApi";
import type { Material } from "../materials/materialTypes";
import { getQuotationById, updateQuotation } from "./boqApi";
import { buildDefaultCostingSheet, DEFAULT_RAW_MATERIALS } from "./costingPresets";
import type {
  BoqItem,
  BoqQuotation,
  CostingSheetData,
  QuotationSiteBlock,
} from "./boqTypes";

export default function BoqCostingPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [quotation, setQuotation] = useState<BoqQuotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { msg, notifyOk, notifyErr, dismiss } = useAppFeedback();

  // Active block index
  const activeBlockIndex = useMemo(() => {
    const p = searchParams.get("block");
    return p !== null && !isNaN(Number(p)) ? Math.max(0, Number(p)) : 0;
  }, [searchParams]);

  // Sheets data mapped by block index
  const [costingSheets, setCostingSheets] = useState<Record<number, CostingSheetData>>({});

  // Filter and search state for raw materials table
  const [materialsFilter, setMaterialsFilter] = useState<"all" | "active">("all");
  const [materialsSearch, setMaterialsSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [inventoryMaterials, setInventoryMaterials] = useState<Material[]>([]);

  useEffect(() => {
    getMaterials("", true)
      .then(setInventoryMaterials)
      .catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getQuotationById(id);
      setQuotation(data);

      // Initialize costing sheets for all blocks / items
      const blocks: QuotationSiteBlock[] = data.siteInformation?.blocks ?? [];
      const items: BoqItem[] = data.items ?? [];
      const count = Math.max(blocks.length, items.length, 1);

      const initialSheets: Record<number, CostingSheetData> = {};
      for (let i = 0; i < count; i++) {
        const item = items[i];
        const block = blocks[i];
        if (item?.costingSheet) {
          initialSheets[i] = item.costingSheet;
        } else {
          initialSheets[i] = buildDefaultCostingSheet(item, block, {
            clientName: data.clientName,
            projectName: data.projectName,
            inspectedBy: data.createdByName || "Site Engineer",
            ssrNumber: data.inquiryId ? `INQ-${String(data.inquiryId).slice(-4).toUpperCase()}` : data.quotationNumber,
          });
        }
      }
      setCostingSheets(initialSheets);
    } catch (err) {
      notifyErr(err, "Failed to load quotation for costing sheet.");
    } finally {
      setLoading(false);
    }
  }, [id, notifyErr]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeSheet: CostingSheetData | undefined = costingSheets[activeBlockIndex];
  const activeBlock: QuotationSiteBlock | undefined = quotation?.siteInformation?.blocks?.[activeBlockIndex];
  const activeBoqItem: BoqItem | undefined = quotation?.items?.[activeBlockIndex];

  // Target item quantity
  const targetQuantity = useMemo(() => {
    if (activeBoqItem && activeBoqItem.quantity > 0) return activeBoqItem.quantity;
    if (activeBlock?.workItems?.[0]?.quantity) return Number(activeBlock.workItems[0].quantity);
    return 1;
  }, [activeBoqItem, activeBlock]);

  const targetUnit = activeBoqItem?.unit || activeBlock?.workItems?.[0]?.unit || "Nos";

  // Calculations for Table 1 (Scope Items)
  const scopeTotals = useMemo(() => {
    if (!activeSheet) return { cost: 0, withMargin: 0 };
    return activeSheet.scopeItems.reduce(
      (acc, it) => {
        const cost = (Number(it.quantity) || 0) * (Number(it.unitCost) || 0);
        const margin = cost * (1 + (Number(it.marginPercent) || 0) / 100);
        return { cost: acc.cost + cost, withMargin: acc.withMargin + margin };
      },
      { cost: 0, withMargin: 0 },
    );
  }, [activeSheet]);

  // Calculations for Table 2 (Materials)
  const materialTotals = useMemo(() => {
    if (!activeSheet) return { cost: 0, withMargin: 0 };
    return activeSheet.materialItems.reduce(
      (acc, it) => {
        const cost = (Number(it.quantity) || 0) * (Number(it.unitCost) || 0);
        const margin = cost * (1 + (Number(it.marginPercent) || 0) / 100);
        return { cost: acc.cost + cost, withMargin: acc.withMargin + margin };
      },
      { cost: 0, withMargin: 0 },
    );
  }, [activeSheet]);

  // Calculations for Table 3 (Labor)
  const laborTotals = useMemo(() => {
    if (!activeSheet) return { cost: 0, withMargin: 0 };
    return activeSheet.laborItems.reduce(
      (acc, it) => {
        const hours = Number(it.hours) || (Number(it.days) || 0) * 8;
        const cost = hours * (Number(it.ratePerHour) || 0) * (Number(it.personCount) || 1);
        const margin = cost * (1 + (Number(it.marginPercent) || 0) / 100);
        return { cost: acc.cost + cost, withMargin: acc.withMargin + margin };
      },
      { cost: 0, withMargin: 0 },
    );
  }, [activeSheet]);

  // Grand summary
  const directCost = scopeTotals.cost + materialTotals.cost + laborTotals.cost;
  const calculatedQuoteWithMargin = scopeTotals.withMargin + materialTotals.withMargin + laborTotals.withMargin;

  const finalQuoteAmount =
    activeSheet?.customQuoteAmount != null && !isNaN(activeSheet.customQuoteAmount)
      ? activeSheet.customQuoteAmount
      : calculatedQuoteWithMargin;

  const calculatedUnitRate = targetQuantity > 0 ? finalQuoteAmount / targetQuantity : finalQuoteAmount;

  const grossProfit = finalQuoteAmount - directCost;
  const gpPercent = finalQuoteAmount > 0 ? (grossProfit / finalQuoteAmount) * 100 : 0;
  const marginOnCost = directCost > 0 ? (grossProfit / directCost) * 100 : 0;

  // Handlers to update active sheet
  function updateActiveSheet(updater: (prev: CostingSheetData) => CostingSheetData) {
    setCostingSheets((prev) => {
      const current = prev[activeBlockIndex] || buildDefaultCostingSheet(activeBoqItem, activeBlock, null);
      const next = updater(current);
      return { ...prev, [activeBlockIndex]: next };
    });
  }

  function handleAddScopeItem() {
    updateActiveSheet((s) => ({
      ...s,
      scopeItems: [
        ...s.scopeItems,
        {
          id: `scope-${Date.now()}`,
          name: "New Scope / Finish Item",
          specs: "Specification details",
          unit: "pcs",
          quantity: 1,
          unitCost: 0,
          marginPercent: 20,
        },
      ],
    }));
  }

  function handleRemoveScopeItem(id: string) {
    updateActiveSheet((s) => ({
      ...s,
      scopeItems: s.scopeItems.filter((it) => it.id !== id),
    }));
  }

  function handleAddMaterial() {
    updateActiveSheet((s) => ({
      ...s,
      materialItems: [
        ...s.materialItems,
        {
          id: `mat-${Date.now()}`,
          name: "Custom Material / Consumable",
          specs: "Grade / Spec",
          unit: "pcs",
          quantity: 1,
          unitCost: 0,
          marginPercent: 20,
        },
      ],
    }));
  }

  function handleAddMaterialByName(
    name: string,
    specs?: string,
    unit?: string,
    unitCost?: number,
    margin?: number
  ) {
    const cleanName = name.trim();
    if (!cleanName) return;

    updateActiveSheet((s) => {
      const existingIdx = s.materialItems.findIndex(
        (m) => m.name.toLowerCase() === cleanName.toLowerCase()
      );

      if (existingIdx >= 0) {
        const updated = [...s.materialItems];
        const currentQty = Number(updated[existingIdx].quantity) || 0;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: currentQty > 0 ? currentQty + 1 : 1,
        };
        return { ...s, materialItems: updated };
      }

      return {
        ...s,
        materialItems: [
          ...s.materialItems,
          {
            id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: cleanName,
            specs: specs?.trim() || "Standard specification",
            unit: unit?.trim() || "pcs",
            quantity: 1,
            unitCost: unitCost != null ? unitCost : 0,
            marginPercent: margin != null ? margin : 20,
          },
        ],
      };
    });

    setMaterialsSearch("");
    setSearchFocused(false);
    notifyOk(`Material "${cleanName}" added.`);
  }

  function handleAddLabor() {
    updateActiveSheet((s) => ({
      ...s,
      laborItems: [
        ...s.laborItems,
        {
          id: `labor-${Date.now()}`,
          role: "Specialist Technician",
          days: 1,
          hours: 8,
          ratePerHour: 25,
          personCount: 1,
          marginPercent: 20,
        },
      ],
    }));
  }

  async function handleSaveAndApply() {
    if (!quotation || !id) return;
    setSaving(true);
    dismiss();

    try {
      const updatedItems = [...(quotation.items || [])];

      // Ensure item exists at activeBlockIndex
      if (!updatedItems[activeBlockIndex]) {
        updatedItems[activeBlockIndex] = {
          itemCode: `WI-${String(activeBlockIndex + 1).padStart(3, "0")}`,
          description: activeBlock?.workItems?.[0]?.workType || `Work Item ${activeBlockIndex + 1}`,
          category: "Material",
          quantity: targetQuantity,
          unit: targetUnit,
          unitPrice: Math.round(calculatedUnitRate * 100) / 100,
          costingSheet: activeSheet,
        };
      } else {
        updatedItems[activeBlockIndex] = {
          ...updatedItems[activeBlockIndex],
          unitPrice: Math.round(calculatedUnitRate * 100) / 100,
          costingSheet: activeSheet,
        };
      }

      const updated = await updateQuotation(id, { items: updatedItems });
      setQuotation(updated);
      notifyOk(`Costing saved! Applied rate of ${formatAed(calculatedUnitRate)} to BOQ item.`);
    } catch (err) {
      notifyErr(err, "Failed to save costing sheet.");
    } finally {
      setSaving(false);
    }
  }

  const blocksCount = Math.max(
    quotation?.siteInformation?.blocks?.length || 0,
    quotation?.items?.length || 0,
    1,
  );

  const matchingSuggestions = useMemo(() => {
    const q = materialsSearch.trim().toLowerCase();
    if (!q) return [];

    const existingNames = new Set(
      (activeSheet?.materialItems || []).map((m) => m.name.toLowerCase())
    );

    const results: Array<{
      name: string;
      specs: string;
      unit: string;
      unitCost: number;
      marginPercent: number;
      source: "existing" | "preset" | "inventory";
      currentQty?: number;
    }> = [];

    // 1. Existing items in current sheet matching query
    for (const m of activeSheet?.materialItems || []) {
      if (
        m.name.toLowerCase().includes(q) ||
        (m.specs && m.specs.toLowerCase().includes(q))
      ) {
        results.push({
          name: m.name,
          specs: m.specs,
          unit: m.unit,
          unitCost: m.unitCost,
          marginPercent: m.marginPercent,
          source: "existing",
          currentQty: m.quantity,
        });
      }
    }

    // 2. Default presets matching query that are NOT already in current sheet
    for (const p of DEFAULT_RAW_MATERIALS) {
      if (
        !existingNames.has(p.name.toLowerCase()) &&
        (p.name.toLowerCase().includes(q) ||
          (p.specs && p.specs.toLowerCase().includes(q)))
      ) {
        results.push({
          name: p.name,
          specs: p.specs,
          unit: p.unit,
          unitCost: p.unitCost,
          marginPercent: p.marginPercent,
          source: "preset",
        });
      }
    }

    // 3. Inventory materials matching query not already added
    for (const inv of inventoryMaterials) {
      if (
        !existingNames.has(inv.name.toLowerCase()) &&
        (inv.name.toLowerCase().includes(q) ||
          (inv.SKU && inv.SKU.toLowerCase().includes(q)))
      ) {
        results.push({
          name: inv.name,
          specs: inv.SKU ? `SKU: ${inv.SKU}` : "Inventory stock item",
          unit: inv.unit || "nos",
          unitCost: inv.unitCost || 0,
          marginPercent: 20,
          source: "inventory",
        });
      }
    }

    return results.slice(0, 8);
  }, [materialsSearch, activeSheet?.materialItems, inventoryMaterials]);

  const displayedMaterials = useMemo(() => {
    let list = activeSheet?.materialItems || [];
    if (materialsFilter === "active") {
      list = list.filter((m) => Number(m.quantity) > 0);
    }
    const q = materialsSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.specs && m.specs.toLowerCase().includes(q)) ||
          (m.unit && m.unit.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeSheet?.materialItems, materialsFilter, materialsSearch]);

  if (loading) {
    return (
      <AppShell activeNav="tools">
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-primary" />
          <p className="text-sm text-text-muted">Loading Costing & Rate Analysis Sheet…</p>
        </div>
      </AppShell>
    );
  }

  if (!quotation) {
    return (
      <AppShell activeNav="tools">
        <div className="p-8 text-center">
          <p className="text-base font-semibold text-slate-800">Quotation not found</p>
          <Link to="/boq" className="mt-4 inline-flex items-center gap-2 text-sm text-brand-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to BOQ list
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeNav="tools" pageTitle="Costing & Rate Analysis Sheet">
      <AppFeedbackPopup msg={msg} onDismiss={dismiss} />

      <div className="space-y-5 font-sans">
        {/* Top Breadcrumb & Action Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/boq/${id}`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-slate-500" />
              Back to Quotation ({quotation.quotationNumber})
            </button>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-400 text-amber-950 font-bold shadow-2xs">
                <FileSpreadsheet className="h-4 w-4" />
              </span>
              <h1 className="text-base font-bold text-slate-900">
                Rate Analysis & Estimation Sheet
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveAndApply()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save & Apply Rate to BOQ
            </button>
          </div>
        </div>

        {/* Block Tabs Bar */}
        {blocksCount > 1 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">
              Select Block:
            </span>
            {Array.from({ length: blocksCount }).map((_, idx) => {
              const blk = quotation.siteInformation?.blocks?.[idx];
              const itm = quotation.items?.[idx];
              const label =
                blk?.measurements?.[0]?.areaRoom && blk?.workItems?.[0]?.workType
                  ? `${blk.measurements[0].areaRoom} — ${blk.workItems[0].workType}`
                  : blk?.title || itm?.description?.split(" — ")[0] || `Block ${idx + 1}`;
              const isSelected = activeBlockIndex === idx;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSearchParams({ block: String(idx) })}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span
                    className={`flex h-4 min-w-4 items-center justify-center rounded text-[10px] font-bold ${
                      isSelected ? "bg-amber-400 text-slate-950" : "bg-slate-300 text-slate-800"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="max-w-[180px] truncate">{label}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Metadata Header Box (Matching Page 1 of PDF) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Client:</label>
              <p className="mt-0.5 text-sm font-bold text-slate-900">{quotation.clientName || "—"}</p>
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Project / Site:</label>
              <p className="mt-0.5 text-sm font-bold text-slate-900">{quotation.projectName || "—"}</p>
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Inspected by:</label>
              <p className="mt-0.5 text-sm font-bold text-slate-900">
                {activeSheet?.inspectedBy || quotation.createdByName || "System Engineer"}
              </p>
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">SSR # / Ref:</label>
              <p className="mt-0.5 text-sm font-bold text-brand-primary">
                {activeSheet?.ssrNumber || quotation.quotationNumber} (Block {activeBlockIndex + 1})
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TABLE 1: Primary Work Items & Specifications (Yellow Header) */}
        {/* ============================================================ */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#fde047] px-4 py-2.5 border-b border-amber-400">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-extrabold uppercase tracking-wide text-slate-950">
                1. Scope Items & Finishes
              </span>
              <span className="rounded bg-amber-200/80 px-2 py-0.5 text-[10.5px] font-bold text-amber-950">
                {activeSheet?.scopeItems.length || 0} Items
              </span>
            </div>
            <button
              type="button"
              onClick={handleAddScopeItem}
              className="inline-flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-slate-800 transition-colors"
            >
              <Plus className="h-3 w-3" /> Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fef08a]/60 text-[10.5px] font-bold uppercase tracking-wider text-slate-800 border-b border-amber-200">
                <tr>
                  <th className="py-2 px-3">Item Name</th>
                  <th className="py-2 px-3">Size / Rating / Color / Brand / Type</th>
                  <th className="py-2 px-3 w-20">Unit</th>
                  <th className="py-2 px-3 w-24 text-right">Qty</th>
                  <th className="py-2 px-3 w-28 text-right">Unit Cost (AED)</th>
                  <th className="py-2 px-3 w-28 text-right">Total Cost</th>
                  <th className="py-2 px-3 w-24 text-right">Margin %</th>
                  <th className="py-2 px-3 w-28 text-right">Quote with Margin</th>
                  <th className="py-2 px-2 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {activeSheet?.scopeItems.map((item, sIdx) => {
                  const lineCost = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
                  const lineQuote = lineCost * (1 + (Number(item.marginPercent) || 0) / 100);

                  return (
                    <tr key={item.id || sIdx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2 px-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateActiveSheet((s) => ({
                              ...s,
                              scopeItems: s.scopeItems.map((it) => (it.id === item.id ? { ...it, name: val } : it)),
                            }));
                          }}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 outline-none"
                        />
                      </td>
                      <td className="p-2 px-3">
                        <input
                          type="text"
                          value={item.specs}
                          placeholder="e.g. 1cm bevel / 18mm MR"
                          onChange={(e) => {
                            const val = e.target.value;
                            updateActiveSheet((s) => ({
                              ...s,
                              scopeItems: s.scopeItems.map((it) => (it.id === item.id ? { ...it, specs: val } : it)),
                            }));
                          }}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 outline-none"
                        />
                      </td>
                      <td className="p-2 px-3">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateActiveSheet((s) => ({
                              ...s,
                              scopeItems: s.scopeItems.map((it) => (it.id === item.id ? { ...it, unit: val } : it)),
                            }));
                          }}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 text-center uppercase"
                        />
                      </td>
                      <td className="p-2 px-3">
                        <input
                          type="number"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateActiveSheet((s) => ({
                              ...s,
                              scopeItems: s.scopeItems.map((it) => (it.id === item.id ? { ...it, quantity: val } : it)),
                            }));
                          }}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-right font-medium"
                        />
                      </td>
                      <td className="p-2 px-3">
                        <input
                          type="number"
                          step="any"
                          value={item.unitCost}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateActiveSheet((s) => ({
                              ...s,
                              scopeItems: s.scopeItems.map((it) => (it.id === item.id ? { ...it, unitCost: val } : it)),
                            }));
                          }}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-right font-medium"
                        />
                      </td>
                      <td className="p-2 px-3 text-right font-semibold text-slate-800 tabular-nums">
                        {lineCost.toFixed(2)}
                      </td>
                      <td className="p-2 px-3">
                        <input
                          type="number"
                          step="any"
                          value={item.marginPercent}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateActiveSheet((s) => ({
                              ...s,
                              scopeItems: s.scopeItems.map((it) => (it.id === item.id ? { ...it, marginPercent: val } : it)),
                            }));
                          }}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-right font-medium text-emerald-700"
                        />
                      </td>
                      <td className="p-2 px-3 text-right font-bold text-emerald-800 tabular-nums bg-emerald-50/40">
                        {lineQuote.toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveScopeItem(item.id)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-[#fef08a]/40 font-bold border-t border-amber-300 text-slate-900">
                <tr>
                  <td colSpan={5} className="py-2.5 px-3 text-right uppercase text-[11px]">
                    Subtotal Scope Items:
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-900">
                    {scopeTotals.cost.toFixed(2)}
                  </td>
                  <td></td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-emerald-800 bg-emerald-100/60">
                    {scopeTotals.withMargin.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TABLE 2: Raw Materials & Consumables (Yellow Header)        */}
        {/* ============================================================ */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#fde047] px-4 py-2.5 border-b border-amber-400">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-extrabold uppercase tracking-wide text-slate-950">
                2. Raw Materials & Consumables
              </span>
              <span className="rounded bg-amber-200/80 px-2 py-0.5 text-[10.5px] font-bold text-amber-950">
                {displayedMaterials.length} Items
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search Bar with Autocomplete & Quick Add */}
              <div className="relative min-w-[200px] sm:w-64">
                <div className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-amber-900/60" />
                  <input
                    type="text"
                    value={materialsSearch}
                    onChange={(e) => setMaterialsSearch(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => {
                      setTimeout(() => setSearchFocused(false), 250);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && materialsSearch.trim()) {
                        e.preventDefault();
                        handleAddMaterialByName(materialsSearch);
                      }
                    }}
                    placeholder="Search or add item by name..."
                    className="w-full rounded-lg border border-amber-400 bg-white/95 pl-8 pr-7 py-1 text-xs font-semibold text-slate-900 placeholder:text-amber-950/50 shadow-2xs focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  {materialsSearch ? (
                    <button
                      type="button"
                      onClick={() => setMaterialsSearch("")}
                      className="absolute right-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>

                {/* Suggestions Dropdown */}
                {searchFocused && materialsSearch.trim() ? (
                  <div className="absolute left-0 top-full z-40 mt-1 max-h-72 w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                    {matchingSuggestions.length > 0 ? (
                      <div className="space-y-1">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Matching Materials
                        </div>
                        {matchingSuggestions.map((item, idx) => {
                          const isInSheet = item.source === "existing";
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                handleAddMaterialByName(
                                  item.name,
                                  item.specs,
                                  item.unit,
                                  item.unitCost,
                                  item.marginPercent
                                );
                              }}
                              className="w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-amber-50 cursor-pointer"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-slate-900 truncate">
                                  {item.name}
                                </div>
                                <div className="text-[10.5px] text-slate-500 truncate">
                                  {item.specs} · {item.unit} · {formatAed(item.unitCost)}
                                </div>
                              </div>
                              <span
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  isInSheet
                                    ? item.currentQty && item.currentQty > 0
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-slate-100 text-slate-700"
                                    : "bg-amber-200 text-amber-900"
                                }`}
                              >
                                {isInSheet
                                  ? item.currentQty && item.currentQty > 0
                                    ? `Qty: ${item.currentQty}`
                                    : "In List"
                                  : "+ Add"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {/* Quick Add Custom Button */}
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAddMaterialByName(materialsSearch)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 text-amber-400" />
                        <span>Add "{materialsSearch}" as New Item</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Filter: All vs Active (Qty > 0) */}
              <div className="flex items-center rounded-lg bg-amber-200/70 p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setMaterialsFilter("all")}
                  className={`rounded px-2 py-0.5 transition-colors ${
                    materialsFilter === "all" ? "bg-slate-900 text-white" : "text-amber-950 hover:bg-amber-300"
                  }`}
                >
                  All ({activeSheet?.materialItems.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setMaterialsFilter("active")}
                  className={`rounded px-2 py-0.5 transition-colors ${
                    materialsFilter === "active" ? "bg-slate-900 text-white" : "text-amber-950 hover:bg-amber-300"
                  }`}
                >
                  Active Only ({(activeSheet?.materialItems || []).filter((m) => Number(m.quantity) > 0).length})
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddMaterial}
                className="inline-flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Add Material
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#fef08a] text-[10.5px] font-bold uppercase tracking-wider text-slate-800 border-b border-amber-300">
                <tr>
                  <th className="py-2 px-3">Item Name</th>
                  <th className="py-2 px-3">Size / Rating / Color / Brand / Type</th>
                  <th className="py-2 px-3 w-20">Unit</th>
                  <th className="py-2 px-3 w-24 text-right">Total Qty</th>
                  <th className="py-2 px-3 w-28 text-right">Cost (AED)</th>
                  <th className="py-2 px-3 w-28 text-right">Total Cost</th>
                  <th className="py-2 px-3 w-24 text-right">Margin %</th>
                  <th className="py-2 px-3 w-28 text-right">Quote with Margin</th>
                  <th className="py-2 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {displayedMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center bg-amber-50/20">
                      <p className="text-xs font-semibold text-slate-700">
                        {materialsSearch
                          ? `No material matching "${materialsSearch}" in this sheet.`
                          : "No materials to display."}
                      </p>
                      {materialsSearch ? (
                        <button
                          type="button"
                          onClick={() => handleAddMaterialByName(materialsSearch)}
                          className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5 text-amber-400" />
                          Add "{materialsSearch}" as New Item
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ) : (
                  displayedMaterials.map((item) => {
                  const lineCost = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
                  const lineQuote = lineCost * (1 + (Number(item.marginPercent) || 0) / 100);
                  const isFilled = Number(item.quantity) > 0;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${isFilled ? "bg-amber-50/30 hover:bg-amber-50/60" : "hover:bg-slate-50/70"}`}
                    >
                      <td className="p-1.5 px-3 font-medium text-slate-900">
                        {item.name}
                      </td>
                      <td className="p-1.5 px-3 text-slate-500">
                        <input
                          type="text"
                          value={item.specs}
                          placeholder="Grade / Brand"
                          onChange={(e) => {
                            const val = e.target.value;
                            updateActiveSheet((s) => ({
                              ...s,
                              materialItems: s.materialItems.map((it) => (it.id === item.id ? { ...it, specs: val } : it)),
                            }));
                          }}
                          className="w-full rounded border border-transparent hover:border-slate-200 px-1.5 py-0.5 text-xs text-slate-600 focus:border-amber-400 focus:bg-white outline-none"
                        />
                      </td>
                      <td className="p-1.5 px-3 text-slate-600 text-center uppercase font-mono text-[11px]">
                        {item.unit}
                      </td>
                      <td className="p-1.5 px-3">
                        <input
                          type="number"
                          step="any"
                          value={item.quantity === 0 ? "" : item.quantity}
                          placeholder="0"
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateActiveSheet((s) => ({
                              ...s,
                              materialItems: s.materialItems.map((it) => (it.id === item.id ? { ...it, quantity: val } : it)),
                            }));
                          }}
                          className={`w-full rounded border px-2 py-1 text-xs text-right font-bold transition-colors ${
                            isFilled
                              ? "border-amber-400 bg-amber-50 text-slate-950 ring-1 ring-amber-300/60"
                              : "border-slate-200 text-slate-400"
                          }`}
                        />
                      </td>
                      <td className="p-1.5 px-3">
                        <input
                          type="number"
                          step="any"
                          value={item.unitCost}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateActiveSheet((s) => ({
                              ...s,
                              materialItems: s.materialItems.map((it) => (it.id === item.id ? { ...it, unitCost: val } : it)),
                            }));
                          }}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-right font-medium"
                        />
                      </td>
                      <td className="p-1.5 px-3 text-right font-semibold text-slate-800 tabular-nums">
                        {lineCost.toFixed(2)}
                      </td>
                      <td className="p-1.5 px-3">
                        <input
                          type="number"
                          step="any"
                          value={item.marginPercent}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateActiveSheet((s) => ({
                              ...s,
                              materialItems: s.materialItems.map((it) => (it.id === item.id ? { ...it, marginPercent: val } : it)),
                            }));
                          }}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-right font-medium text-emerald-700"
                        />
                      </td>
                      <td className="p-1.5 px-3 text-right font-bold text-emerald-800 tabular-nums bg-emerald-50/40">
                        {lineQuote.toFixed(2)}
                      </td>
                      <td className="p-1.5 text-center">
                        {item.id.startsWith("mat-") && Number(item.id.replace("mat-", "")) > 27 ? (
                          <button
                            type="button"
                            onClick={() => {
                              updateActiveSheet((s) => ({
                                ...s,
                                materialItems: s.materialItems.filter((it) => it.id !== item.id),
                              }));
                            }}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
              <tfoot className="bg-[#fef08a]/40 font-bold border-t border-amber-300 text-slate-900">
                <tr>
                  <td colSpan={5} className="py-2.5 px-3 text-right uppercase text-[11px]">
                    Subtotal Raw Materials:
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-900">
                    {materialTotals.cost.toFixed(2)}
                  </td>
                  <td></td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-emerald-800 bg-emerald-100/60">
                    {materialTotals.withMargin.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TABLE 3: Labor & Technicians (Yellow Header)                 */}
        {/* ============================================================ */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#fde047] px-4 py-2.5 border-b border-amber-400">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-extrabold uppercase tracking-wide text-slate-950">
                3. Labor & Technicians Needed
              </span>
              <span className="rounded bg-amber-200/80 px-2 py-0.5 text-[10.5px] font-bold text-amber-950">
                {activeSheet?.laborItems.length || 0} Trades
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddLabor}
              className="inline-flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-slate-800 transition-colors"
            >
              <Plus className="h-3 w-3" /> Add Trade / Labor
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fef08a]/60 text-[10.5px] font-bold uppercase tracking-wider text-slate-800 border-b border-amber-200">
                <tr>
                  <th className="py-2 px-3">Technician Needed</th>
                  <th className="py-2 px-3 w-20 text-center">Days</th>
                  <th className="py-2 px-3 w-24 text-center">Hours to complete</th>
                  <th className="py-2 px-3 w-28 text-right">Avg Cost / Hr (AED)</th>
                  <th className="py-2 px-3 w-24 text-center">No. of Person</th>
                  <th className="py-2 px-3 w-28 text-right">Labor Cost</th>
                  <th className="py-2 px-3 w-24 text-right">Margin %</th>
                  <th className="py-2 px-3 w-28 text-right">Total with Margin</th>
                  <th className="py-2 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {activeSheet?.laborItems.map((item) => {
                  const hours = Number(item.hours) || (Number(item.days) || 0) * 8;
                  const lineCost = hours * (Number(item.ratePerHour) || 0) * (Number(item.personCount) || 1);
                  const lineQuote = lineCost * (1 + (Number(item.marginPercent) || 0) / 100);
                  const isFilled = hours > 0 || Number(item.days) > 0;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${isFilled ? "bg-amber-50/30 hover:bg-amber-50/60" : "hover:bg-slate-50/70"}`}
                    >
                      <td className="p-1.5 px-3 font-semibold text-slate-900">
                        {item.role}
                      </td>
                      <td className="p-1.5 px-3 text-center">
                        <input
                          type="number"
                          step="any"
                          value={item.days === 0 ? "" : item.days}
                          placeholder="0"
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateActiveSheet((s) => ({
                              ...s,
                              laborItems: s.laborItems.map((it) =>
                                it.id === item.id
                                  ? {
                                      ...it,
                                      days: val,
                                      hours: val * 8,
                                    }
                                  : it,
                              ),
                            }));
                          }}
                          className={`w-16 rounded border px-2 py-1 text-xs text-center font-bold transition-colors ${
                            isFilled ? "border-amber-400 bg-amber-50 text-slate-950" : "border-slate-200 text-slate-400"
                          }`}
                        />
                      </td>
                      <td className="p-1.5 px-3 text-center">
                        <input
                          type="number"
                          step="any"
                          value={item.hours === 0 ? "" : item.hours}
                          placeholder="0"
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateActiveSheet((s) => ({
                              ...s,
                              laborItems: s.laborItems.map((it) => (it.id === item.id ? { ...it, hours: val } : it)),
                            }));
                          }}
                          className={`w-20 rounded border px-2 py-1 text-xs text-center font-bold ${
                            isFilled ? "border-amber-400 bg-amber-50 text-slate-950" : "border-slate-200 text-slate-400"
                          }`}
                        />
                      </td>
                      <td className="p-1.5 px-3">
                        <input
                          type="number"
                          step="any"
                          value={item.ratePerHour}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateActiveSheet((s) => ({
                              ...s,
                              laborItems: s.laborItems.map((it) => (it.id === item.id ? { ...it, ratePerHour: val } : it)),
                            }));
                          }}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-right font-medium"
                        />
                      </td>
                      <td className="p-1.5 px-3 text-center">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={item.personCount}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value));
                            updateActiveSheet((s) => ({
                              ...s,
                              laborItems: s.laborItems.map((it) => (it.id === item.id ? { ...it, personCount: val } : it)),
                            }));
                          }}
                          className="w-16 rounded border border-slate-200 px-2 py-1 text-xs text-center font-medium"
                        />
                      </td>
                      <td className="p-1.5 px-3 text-right font-semibold text-slate-800 tabular-nums">
                        {lineCost.toFixed(2)}
                      </td>
                      <td className="p-1.5 px-3">
                        <input
                          type="number"
                          step="any"
                          value={item.marginPercent}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateActiveSheet((s) => ({
                              ...s,
                              laborItems: s.laborItems.map((it) => (it.id === item.id ? { ...it, marginPercent: val } : it)),
                            }));
                          }}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-right font-medium text-emerald-700"
                        />
                      </td>
                      <td className="p-1.5 px-3 text-right font-bold text-emerald-800 tabular-nums bg-emerald-50/40">
                        {lineQuote.toFixed(2)}
                      </td>
                      <td className="p-1.5 text-center">
                        {item.id.startsWith("labor-") && Number(item.id.replace("labor-", "")) > 10 ? (
                          <button
                            type="button"
                            onClick={() => {
                              updateActiveSheet((s) => ({
                                ...s,
                                laborItems: s.laborItems.filter((it) => it.id !== item.id),
                              }));
                            }}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-[#fef08a]/40 font-bold border-t border-amber-300 text-slate-900">
                <tr>
                  <td colSpan={5} className="py-2.5 px-3 text-right uppercase text-[11px]">
                    Subtotal Labor:
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-900">
                    {laborTotals.cost.toFixed(2)}
                  </td>
                  <td></td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-emerald-800 bg-emerald-100/60">
                    {laborTotals.withMargin.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TABLE 4: Financial Summary Box (Matching Page 6 & 15 of PDF) */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Summary Excel Table */}
          <div className="lg:col-span-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="bg-slate-900 px-4 py-2.5 text-white flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wide flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-amber-400" />
                Costing & Profit Summary
              </span>
              <span className="text-[11px] font-medium text-slate-300">
                Scope Items + Raw Materials + Labor
              </span>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">1. Scope Finishes</p>
                  <p className="mt-1 text-sm font-bold text-slate-800 tabular-nums">
                    {formatAed(scopeTotals.cost)}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-semibold">Quote: {formatAed(scopeTotals.withMargin)}</p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">2. Raw Materials</p>
                  <p className="mt-1 text-sm font-bold text-slate-800 tabular-nums">
                    {formatAed(materialTotals.cost)}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-semibold">Quote: {formatAed(materialTotals.withMargin)}</p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">3. Labor & Trades</p>
                  <p className="mt-1 text-sm font-bold text-slate-800 tabular-nums">
                    {formatAed(laborTotals.cost)}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-semibold">Quote: {formatAed(laborTotals.withMargin)}</p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-100 p-2.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-700">Total Direct Cost</p>
                  <p className="mt-1 text-base font-extrabold text-slate-950 tabular-nums">
                    {formatAed(directCost)}
                  </p>
                  <p className="text-[10px] text-slate-500">Base direct expenses</p>
                </div>
              </div>

              {/* Exact Metrics from Page 6 & 15 */}
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-amber-50/50">
                      <td className="py-2 px-3 font-bold text-slate-900 w-1/2">Quote (with Margin)</td>
                      <td className="py-2 px-3 text-right font-extrabold text-slate-950 tabular-nums text-sm">
                        {formatAed(finalQuoteAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-bold text-slate-700">Cost (Direct Expenses)</td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-800 tabular-nums">
                        {formatAed(directCost)}
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/50">
                      <td className="py-2 px-3 font-bold text-emerald-900">Gross Profit (Quote − Cost)</td>
                      <td className="py-2 px-3 text-right font-extrabold text-emerald-800 tabular-nums text-sm">
                        {formatAed(grossProfit)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-600">Gross Profit (GP %)</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700 tabular-nums">
                        {gpPercent.toFixed(1)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-600">Margin on Cost %</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-800 tabular-nums">
                        {marginOnCost.toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Amount Override & Application Card */}
          <div className="rounded-xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50 p-4 shadow-sm space-y-4">
            <div className="border-b border-emerald-200/80 pb-2">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                BOQ Item Pricing Sync
              </span>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Applied to Block {activeBlockIndex + 1} ({targetQuantity} {targetUnit})
              </p>
            </div>

            <div className="space-y-3">
              {/* Editable Final Quote Amount */}
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-700">
                  Total Quote Amount (AED):
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    step="any"
                    value={activeSheet?.customQuoteAmount != null ? activeSheet.customQuoteAmount : Math.round(calculatedQuoteWithMargin * 100) / 100}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateActiveSheet((s) => ({
                        ...s,
                        customQuoteAmount: val,
                        customUnitRate: targetQuantity > 0 ? val / targetQuantity : val,
                      }));
                    }}
                    className="w-full rounded-lg border-2 border-emerald-400 bg-white px-3 py-2 text-base font-extrabold text-emerald-950 shadow-2xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 outline-none tabular-nums"
                  />
                  {activeSheet?.customQuoteAmount != null ? (
                    <button
                      type="button"
                      onClick={() => {
                        updateActiveSheet((s) => ({
                          ...s,
                          customQuoteAmount: null,
                          customUnitRate: null,
                        }));
                      }}
                      className="mt-1 text-[10.5px] text-slate-500 hover:text-rose-600 underline block"
                    >
                      Reset to calculated ({formatAed(calculatedQuoteWithMargin)})
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Editable Calculated Unit Rate */}
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-700">
                  Unit Rate / {targetUnit} (AED):
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    step="any"
                    value={Math.round(calculatedUnitRate * 100) / 100}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateActiveSheet((s) => ({
                        ...s,
                        customUnitRate: val,
                        customQuoteAmount: val * targetQuantity,
                      }));
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 shadow-2xs focus:border-emerald-500 outline-none tabular-nums"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveAndApply()}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-all"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save & Apply to BOQ
              </button>

              <button
                type="button"
                onClick={() => navigate(`/boq/${id}`)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Back to Quotation View
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
