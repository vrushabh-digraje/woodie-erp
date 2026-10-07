import type {
  BoqItem,
  CostingLaborItem,
  CostingMaterialItem,
  CostingScopeItem,
  CostingSheetData,
  QuotationSiteBlock,
} from "./boqTypes";

export const DEFAULT_RAW_MATERIALS: Omit<CostingMaterialItem, "id">[] = [
  { name: "Tile grout", specs: "Standard waterproof grout", unit: "bags", quantity: 0, unitCost: 65, marginPercent: 20 },
  { name: "Tile glue", specs: "High-grade polymer tile adhesive", unit: "bags", quantity: 0, unitCost: 20, marginPercent: 20 },
  { name: "Cement", specs: "OPC / Portland", unit: "bags", quantity: 0, unitCost: 15, marginPercent: 20 },
  { name: "Black sand", specs: "Washed screening sand", unit: "bags", quantity: 0, unitCost: 6, marginPercent: 20 },
  { name: "White sand", specs: "Fine plaster sand", unit: "bags", quantity: 0, unitCost: 6, marginPercent: 20 },
  { name: "Block 100mm", specs: "100mm solid block", unit: "pcs", quantity: 0, unitCost: 6, marginPercent: 20 },
  { name: "Water proof", specs: "Liquid bitumen / membrane", unit: "drum", quantity: 0, unitCost: 300, marginPercent: 20 },
  { name: "Carton roll", specs: "Floor protection sheet", unit: "nos", quantity: 0, unitCost: 60, marginPercent: 20 },
  { name: "Plastic sheet", specs: "1000 gage heavy duty", unit: "pcs", quantity: 0, unitCost: 15, marginPercent: 20 },
  { name: "Debris disposal", specs: "Waste removal site trip", unit: "trip", quantity: 0, unitCost: 280, marginPercent: 20 },
  { name: "Sacks", specs: "Heavy duty rubble sacks", unit: "bags", quantity: 0, unitCost: 1, marginPercent: 20 },
  { name: "Consumable / machine tools", specs: "Blades, drills, fixing tools", unit: "lot", quantity: 0, unitCost: 300, marginPercent: 20 },
  { name: "Gypsum ceiling", specs: "Knauf / Moisture Board", unit: "pcs", quantity: 0, unitCost: 33, marginPercent: 20 },
  { name: "Ceiling channel", specs: "Galvanized main runner & cross tee", unit: "pcs", quantity: 0, unitCost: 10, marginPercent: 20 },
  { name: "Cement sheet", specs: "Fibre cement backing board", unit: "pcs", quantity: 0, unitCost: 65, marginPercent: 20 },
  { name: "MDF MR", specs: "Moisture resistant MDF", unit: "pcs", quantity: 0, unitCost: 140, marginPercent: 20 },
  { name: "Paint (exterior)", specs: "Weatherproof exterior emulsion", unit: "gallon", quantity: 0, unitCost: 120, marginPercent: 20 },
  { name: "Paint (interior)", specs: "Interior matte / silk finish", unit: "gallon", quantity: 0, unitCost: 65, marginPercent: 20 },
  { name: "Stucco", specs: "Wall smoothing compound", unit: "gallon", quantity: 0, unitCost: 45, marginPercent: 20 },
  { name: "Primer", specs: "High-adhesion acrylic primer", unit: "liter", quantity: 0, unitCost: 40, marginPercent: 20 },
  { name: "Gypsum powder", specs: "Finishing plaster", unit: "kgs", quantity: 0, unitCost: 15, marginPercent: 20 },
  { name: "Access panel", specs: "Flush ceiling inspection door", unit: "pcs", quantity: 0, unitCost: 52, marginPercent: 20 },
  { name: "Wastage cloths", specs: "Cleaning cotton rags", unit: "pkt", quantity: 0, unitCost: 30, marginPercent: 20 },
  { name: "Roller & brushes", specs: "Paint applicators", unit: "pics", quantity: 0, unitCost: 20, marginPercent: 20 },
  { name: "WC angle valve", specs: "1/2 inch brass chrome", unit: "nos", quantity: 0, unitCost: 15, marginPercent: 20 },
  { name: "Wash basin angle valve", specs: "1/2 inch brass chrome", unit: "pcs", quantity: 0, unitCost: 15, marginPercent: 20 },
  { name: "Masking tape", specs: "Precision paper masking", unit: "roll", quantity: 0, unitCost: 3, marginPercent: 20 },
];

export const DEFAULT_LABOR_ROLES: Omit<CostingLaborItem, "id">[] = [
  { role: "Senior AC Technician", days: 0, hours: 0, ratePerHour: 55, personCount: 1, marginPercent: 20 },
  { role: "Assistant AC Technician", days: 0, hours: 0, ratePerHour: 25, personCount: 1, marginPercent: 20 },
  { role: "Mason", days: 0, hours: 0, ratePerHour: 22, personCount: 1, marginPercent: 20 },
  { role: "Electrician", days: 0, hours: 0, ratePerHour: 25, personCount: 1, marginPercent: 20 },
  { role: "Plumber", days: 0, hours: 0, ratePerHour: 25, personCount: 1, marginPercent: 20 },
  { role: "Carpenter", days: 0, hours: 0, ratePerHour: 25, personCount: 1, marginPercent: 20 },
  { role: "Painter", days: 0, hours: 0, ratePerHour: 20, personCount: 1, marginPercent: 20 },
  { role: "Helper", days: 0, hours: 0, ratePerHour: 14, personCount: 1, marginPercent: 20 },
  { role: "Supervision", days: 0, hours: 0, ratePerHour: 0, personCount: 1, marginPercent: 20 },
  { role: "Transport", days: 0, hours: 0, ratePerHour: 13, personCount: 1, marginPercent: 20 },
];

export function buildDefaultCostingSheet(
  boqItem?: BoqItem | null,
  block?: QuotationSiteBlock | null,
  clientMeta?: { clientName?: string; projectName?: string; inspectedBy?: string; ssrNumber?: string } | null,
): CostingSheetData {
  const scopeItems: CostingScopeItem[] = [];

  // Seed scope items from the BOQ item / site block
  const workType = block?.workItems?.[0]?.workType || boqItem?.description?.split(" — ")[0] || "Fitout Scope Item";
  const finish = block?.workItems?.[0]?.finishMaterial || block?.materialFinishDetails?.[0]?.specification || "";
  const unit = boqItem?.unit || block?.workItems?.[0]?.unit || "Nos";
  const qty = boqItem?.quantity || Number(block?.workItems?.[0]?.quantity) || 1;
  const initialCost = boqItem?.unitPrice ? Math.round((boqItem.unitPrice / 1.2) * 100) / 100 : 0;

  scopeItems.push({
    id: "scope-1",
    name: workType,
    specs: finish || "As per site survey specification",
    unit: unit,
    quantity: qty,
    unitCost: initialCost,
    marginPercent: 20,
  });

  const materialItems: CostingMaterialItem[] = DEFAULT_RAW_MATERIALS.map((m, idx) => ({
    ...m,
    id: `mat-${idx + 1}`,
  }));

  const laborItems: CostingLaborItem[] = DEFAULT_LABOR_ROLES.map((l, idx) => ({
    ...l,
    id: `labor-${idx + 1}`,
  }));

  return {
    clientName: clientMeta?.clientName || "",
    inspectedBy: clientMeta?.inspectedBy || "",
    ssrNumber: clientMeta?.ssrNumber || "",
    scopeItems,
    materialItems,
    laborItems,
    customQuoteAmount: boqItem?.unitPrice ? boqItem.unitPrice * qty : null,
    customUnitRate: boqItem?.unitPrice || null,
    notes: "",
    lastUpdated: new Date().toISOString(),
  };
}
