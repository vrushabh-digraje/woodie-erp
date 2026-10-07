import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import { BoqFeedbackPopup, useBoqFeedback } from "../boq/boqFeedback";
import { themeClasses } from "../../theme/classes";
import { getWorkOrders } from "../workorders/workOrderApi";
import type { WorkOrder } from "../workorders/workOrderTypes";
import { createMaterialRequest, getMaterials } from "./materialApi";
import type { Material } from "./materialTypes";

type LineItem = {
  materialId: string;
  requestedQty: string;
};

function MaterialRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedWo = searchParams.get("workOrderId") ?? "";

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [workOrderId, setWorkOrderId] = useState(preselectedWo);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ materialId: "", requestedQty: "" }]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { msg, notifyOk, notifyErr, dismiss } = useBoqFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [woData, matData] = await Promise.all([
        getWorkOrders("", "All"),
        getMaterials("", true),
      ]);
      const eligible = woData.filter(
        (wo) => wo.status === "Scheduled" || wo.status === "In Progress",
      );
      setWorkOrders(eligible);
      setMaterials(matData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function addLine() {
    setLines((prev) => [...prev, { materialId: "", requestedQty: "" }]);
  }

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function submit() {
    if (!workOrderId) {
      notifyErr(null, "Select a work order.");
      return;
    }
    const items = lines
      .map((l) => ({
        materialId: l.materialId,
        requestedQty: Number(l.requestedQty),
      }))
      .filter((l) => l.materialId && l.requestedQty > 0);
    if (items.length === 0) {
      notifyErr(null, "Add at least one material with quantity.");
      return;
    }

    setSubmitting(true);
    dismiss();
    try {
      const doc = await createMaterialRequest({
        workOrderId,
        items,
        notes: notes.trim() || undefined,
      });
      notifyOk(`Request ${doc.requestNumber} submitted — awaiting manager approval.`);
      navigate("/materials");
    } catch (err) {
      notifyErr(err, "Could not submit material request.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedWo = workOrders.find((wo) => wo._id === workOrderId);

  return (
    <AppShell
      activeNav="materials"
      pageTitle="New material request"
      pageSubtitle="For work orders you are assigned to (Scheduled or In Progress)"
    >
      <BoqFeedbackPopup msg={msg} onDismiss={dismiss} />
      <Link
        to="/materials"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <section className={themeClasses.cardPadding}>
        {loading ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : (
          <div className="space-y-5">
            <label className="block text-sm">
              <span className="font-medium text-text-primary">Work order</span>
              <select
                className={`${themeClasses.select} mt-1 w-full`}
                value={workOrderId}
                onChange={(e) => setWorkOrderId(e.target.value)}
              >
                <option value="">Select work order…</option>
                {workOrders.map((wo) => (
                  <option key={wo._id} value={wo._id}>
                    {wo.workOrderNumber} — {wo.projectName} ({wo.status})
                  </option>
                ))}
              </select>
              {selectedWo ? (
                <p className="mt-1 text-xs text-text-muted">Project: {selectedWo.projectName}</p>
              ) : null}
            </label>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Items</span>
                <button type="button" onClick={addLine} className={themeClasses.btnGhost}>
                  <Plus className="h-4 w-4" /> Add line
                </button>
              </div>
              <div className="space-y-3">
                {lines.map((line, index) => {
                  const mat = materials.find((m) => m._id === line.materialId);
                  return (
                    <div
                      key={index}
                      className="flex flex-col gap-2 rounded-lg border border-surface-border-light p-3 sm:flex-row sm:items-end"
                    >
                      <label className="flex-1 text-sm">
                        <span className="text-text-muted">Material</span>
                        <select
                          className={`${themeClasses.select} mt-1 w-full`}
                          value={line.materialId}
                          onChange={(e) => updateLine(index, { materialId: e.target.value })}
                        >
                          <option value="">Select…</option>
                          {materials.map((m) => (
                            <option key={m._id} value={m._id}>
                              {m.name} ({m.SKU}) — {m.currentStock} {m.unit} in stock
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="w-full text-sm sm:w-28">
                        <span className="text-text-muted">Qty{mat ? ` (${mat.unit})` : ""}</span>
                        <input
                          type="number"
                          min={0.001}
                          step="any"
                          className={`${themeClasses.input} mt-1`}
                          value={line.requestedQty}
                          onChange={(e) => updateLine(index, { requestedQty: e.target.value })}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="inline-flex rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                        aria-label="Remove line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <label className="block text-sm">
              <span className="font-medium">Notes (optional)</span>
              <textarea
                className={`${themeClasses.input} mt-1 min-h-[80px]`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Site notes or urgency"
              />
            </label>

            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className={themeClasses.btnNavy}
            >
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </div>
        )}
      </section>
    </AppShell>
  );
}

export default MaterialRequestPage;
