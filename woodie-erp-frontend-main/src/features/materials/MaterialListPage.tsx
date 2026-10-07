import { useCallback, useEffect, useState } from "react";
import { Package, Plus, Search } from "lucide-react";
import {
  DataTable,
  DataTableBody,
  DataTableHeadRow,
  DataTableHeader,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "../../components/list/DataTable";
import { BoqFeedbackPopup, useBoqFeedback } from "../boq/boqFeedback";
import { themeClasses } from "../../theme/classes";
import {
  adjustMaterialStock,
  createMaterial,
  getMaterials,
  updateMaterial,
} from "./materialApi";
import { stockLevelTone } from "./materialShared";
import { MATERIAL_UNITS, type Material, type MaterialUnit } from "./materialTypes";

type MaterialForm = {
  name: string;
  SKU: string;
  unit: MaterialUnit;
  currentStock: string;
  minStockLevel: string;
  unitCost: string;
  isActive: boolean;
};

const emptyForm: MaterialForm = {
  name: "",
  SKU: "",
  unit: "nos",
  currentStock: "0",
  minStockLevel: "0",
  unitCost: "0",
  isActive: true,
};

export function MaterialInventorySection() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState<MaterialForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [stockTarget, setStockTarget] = useState<Material | null>(null);
  const [stockType, setStockType] = useState<"in" | "out">("in");
  const [stockQty, setStockQty] = useState("");
  const [stockNote, setStockNote] = useState("");
  const { msg, notifyOk, notifyErr, dismiss } = useBoqFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMaterials(await getMaterials(search));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(m: Material) {
    setEditing(m);
    setForm({
      name: m.name,
      SKU: m.SKU,
      unit: m.unit,
      currentStock: String(m.currentStock),
      minStockLevel: String(m.minStockLevel),
      unitCost: String(m.unitCost),
      isActive: m.isActive,
    });
    setFormOpen(true);
  }

  async function saveMaterial() {
    setSaving(true);
    dismiss();
    try {
      const payload = {
        name: form.name.trim(),
        SKU: form.SKU.trim(),
        unit: form.unit,
        minStockLevel: Number(form.minStockLevel) || 0,
        unitCost: Number(form.unitCost) || 0,
        isActive: form.isActive,
      };
      if (editing) {
        await updateMaterial(editing._id, payload);
        notifyOk("Material updated.");
      } else {
        await createMaterial({
          ...payload,
          currentStock: Number(form.currentStock) || 0,
        });
        notifyOk("Material added.");
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      notifyErr(err, "Could not save material.");
    } finally {
      setSaving(false);
    }
  }

  async function submitStockAdjust() {
    if (!stockTarget) return;
    const qty = Number(stockQty);
    if (!qty || qty <= 0) {
      notifyErr(null, "Enter a positive quantity.");
      return;
    }
    setSaving(true);
    dismiss();
    try {
      await adjustMaterialStock(stockTarget._id, {
        type: stockType,
        qty,
        note: stockNote.trim(),
      });
      notifyOk("Stock updated.");
      setStockTarget(null);
      setStockQty("");
      setStockNote("");
      await load();
    } catch (err) {
      notifyErr(err, "Could not adjust stock.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <BoqFeedbackPopup msg={msg} onDismiss={dismiss} />
      <section className={themeClasses.cardPadding}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Package className="h-5 w-5" /> Materials
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className={`${themeClasses.searchBar} sm:w-64`}>
              <Search className="h-4 w-4 shrink-0 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or SKU"
                className={themeClasses.searchInput}
              />
            </div>
            <button type="button" onClick={openCreate} className={themeClasses.btnNavy}>
              <Plus className="h-4 w-4" /> Add material
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : materials.length === 0 ? (
          <p className="text-sm text-text-muted">No materials yet. Add your first item.</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {materials.map((m) => (
                <div key={m._id} className="rounded-xl border border-surface-border-light p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="font-mono text-xs text-text-muted">{m.SKU}</p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${stockLevelTone(m.currentStock, m.minStockLevel)}`}
                    >
                      {m.currentStock} {m.unit}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-text-muted">
                    Min {m.minStockLevel} · Cost {m.unitCost}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => openEdit(m)} className={themeClasses.btnGhost}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStockTarget(m);
                        setStockType("in");
                      }}
                      className={themeClasses.btnGhost}
                    >
                      Adjust stock
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block">
              <DataTable>
                <DataTableHeader>
                  <DataTableHeadRow>
                    <DataTableTh>SKU</DataTableTh>
                    <DataTableTh>Name</DataTableTh>
                    <DataTableTh>Unit</DataTableTh>
                    <DataTableTh align="right">Stock</DataTableTh>
                    <DataTableTh align="right">Min</DataTableTh>
                    <DataTableTh align="right">Unit cost</DataTableTh>
                    <DataTableTh>Status</DataTableTh>
                    <DataTableTh align="right">Actions</DataTableTh>
                  </DataTableHeadRow>
                </DataTableHeader>
                <DataTableBody>
                  {materials.map((m) => (
                    <DataTableRow key={m._id}>
                      <DataTableTd className="font-mono text-xs">{m.SKU}</DataTableTd>
                      <DataTableTd className="font-medium">{m.name}</DataTableTd>
                      <DataTableTd>{m.unit}</DataTableTd>
                      <DataTableTd
                        align="right"
                        className={`font-semibold ${stockLevelTone(m.currentStock, m.minStockLevel)}`}
                      >
                        {m.currentStock}
                      </DataTableTd>
                      <DataTableTd align="right">{m.minStockLevel}</DataTableTd>
                      <DataTableTd align="right">{m.unitCost}</DataTableTd>
                      <DataTableTd>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            m.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {m.isActive ? "Active" : "Inactive"}
                        </span>
                      </DataTableTd>
                      <DataTableTd align="right">
                        <button type="button" onClick={() => openEdit(m)} className={themeClasses.btnGhost}>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStockTarget(m);
                            setStockType("in");
                          }}
                          className={themeClasses.btnGhost}
                        >
                          Stock
                        </button>
                      </DataTableTd>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </div>
          </>
        )}
      </section>

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${themeClasses.cardPadding} max-h-[90vh] w-full max-w-md overflow-y-auto`}>
            <h3 className="text-base font-semibold">{editing ? "Edit material" : "Add material"}</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-text-muted">Name</span>
                <input
                  className={`${themeClasses.input} mt-1`}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-text-muted">SKU</span>
                <input
                  className={`${themeClasses.input} mt-1 font-mono`}
                  value={form.SKU}
                  onChange={(e) => setForm((f) => ({ ...f, SKU: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-text-muted">Unit</span>
                <select
                  className={`${themeClasses.select} mt-1 w-full`}
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as MaterialUnit }))}
                >
                  {MATERIAL_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
              {!editing ? (
                <label className="block text-sm">
                  <span className="text-text-muted">Opening stock</span>
                  <input
                    type="number"
                    min={0}
                    className={`${themeClasses.input} mt-1`}
                    value={form.currentStock}
                    onChange={(e) => setForm((f) => ({ ...f, currentStock: e.target.value }))}
                  />
                </label>
              ) : null}
              <label className="block text-sm">
                <span className="text-text-muted">Min stock level</span>
                <input
                  type="number"
                  min={0}
                  className={`${themeClasses.input} mt-1`}
                  value={form.minStockLevel}
                  onChange={(e) => setForm((f) => ({ ...f, minStockLevel: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-text-muted">Unit cost</span>
                <input
                  type="number"
                  min={0}
                  className={`${themeClasses.input} mt-1`}
                  value={form.unitCost}
                  onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Active
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setFormOpen(false)} className={themeClasses.btnSecondary}>
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !form.name.trim() || !form.SKU.trim()}
                onClick={() => void saveMaterial()}
                className={themeClasses.btnNavy}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {stockTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${themeClasses.cardPadding} w-full max-w-sm`}>
            <h3 className="text-base font-semibold">Adjust stock — {stockTarget.name}</h3>
            <p className="mt-1 text-sm text-text-muted">
              Current: {stockTarget.currentStock} {stockTarget.unit}
            </p>
            <div className="mt-4 space-y-3">
              <select
                className={`${themeClasses.select} w-full`}
                value={stockType}
                onChange={(e) => setStockType(e.target.value as "in" | "out")}
              >
                <option value="in">Stock in</option>
                <option value="out">Stock out</option>
              </select>
              <input
                type="number"
                min={0.001}
                step="any"
                placeholder="Quantity"
                className={themeClasses.input}
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
              />
              <input
                placeholder="Note (optional)"
                className={themeClasses.input}
                value={stockNote}
                onChange={(e) => setStockNote(e.target.value)}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setStockTarget(null)} className={themeClasses.btnSecondary}>
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submitStockAdjust()}
                className={themeClasses.btnNavy}
              >
                {saving ? "Saving…" : "Apply"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default MaterialInventorySection;
