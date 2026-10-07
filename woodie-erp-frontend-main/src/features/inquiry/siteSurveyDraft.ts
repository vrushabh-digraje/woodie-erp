import type { Inquiry, SiteReport, SiteReportScope } from "./services/inquiryTypes";

export type Id = string;

export type WorkItemDraft = {
  id: Id;
  workType: string;
  description: string;
  quantity: string;
  unit: string;
  finishMaterial: string;
  notes: string;
};

export type MeasurementDraft = {
  id: Id;
  areaRoom: string;
  measurementItem: string;
  value: string;
  unit: string;
};

export type MaterialFinishDraft = {
  id: Id;
  category: string;
  specification: string;
  notes: string;
};

/** Per-block: Work Item + Measurements + Material & Finish only (one each) */
export type SiteBlockDraft = {
  id: Id;
  title: string;
  /** Single work item per block (no Add work item) */
  workItem: WorkItemDraft;
  /** Single measurement entry per block (no Add Measurement) */
  measurement: MeasurementDraft;
  /** Single material entry per block (no Add Material Row) */
  materialFinish: MaterialFinishDraft;
};

export type SiteSurveyDraft = {
  blocks: SiteBlockDraft[];
  /** Shared once for the whole site report */
  siteCondition: {
    existingCondition: string;
    demolitionRequired: string;
    accessLimitations: string;
    ceilingWallFloorCondition: string;
  };
  riskAssessment: {
    electricalRisk: string;
    heightWork: string;
    waterLeakage: string;
    restrictedAccess: string;
    otherRisks: string;
  };
  siteVisitNotes: {
    clientRequirements: string;
    installationDetails: string;
    materialSuggestions: string;
    recommendedSolution: string;
    executionComplexity: string;
    specialInstructions: string;
  };
  observationsLegacy: string;
};

function rid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyWorkItem(): WorkItemDraft {
  return { id: rid("w"), workType: "", description: "", quantity: "", unit: "", finishMaterial: "", notes: "" };
}

export function emptyMeasurement(): MeasurementDraft {
  return { id: rid("meas"), areaRoom: "", measurementItem: "", value: "", unit: "" };
}

export function emptyMaterialFinish(): MaterialFinishDraft {
  return { id: rid("mf"), category: "", specification: "", notes: "" };
}

export function emptySiteBlock(title = ""): SiteBlockDraft {
  return {
    id: rid("block"),
    title,
    workItem: emptyWorkItem(),
    measurement: emptyMeasurement(),
    materialFinish: emptyMaterialFinish(),
  };
}

function emptyShared() {
  return {
    siteCondition: {
      existingCondition: "",
      demolitionRequired: "",
      accessLimitations: "",
      ceilingWallFloorCondition: "",
    },
    riskAssessment: {
      electricalRisk: "",
      heightWork: "",
      waterLeakage: "",
      restrictedAccess: "",
      otherRisks: "",
    },
    siteVisitNotes: {
      clientRequirements: "",
      installationDetails: "",
      materialSuggestions: "",
      recommendedSolution: "",
      executionComplexity: "",
      specialInstructions: "",
    },
  };
}

export function emptySiteSurveyDraft(): SiteSurveyDraft {
  return {
    blocks: [emptySiteBlock("Site block 1")],
    ...emptyShared(),
    observationsLegacy: "",
  };
}

function firstOrEmptyMeasurement(
  list: { areaRoom?: string; measurementItem?: string; label?: string; value?: number | null; unit?: string }[] | undefined,
  index: number,
): MeasurementDraft {
  const m = list?.[0];
  if (!m) return emptyMeasurement();
  const item = m.measurementItem || m.label || "";
  const val = m.value;
  return {
    id: `m-${index}-0`,
    areaRoom: m.areaRoom ?? "",
    measurementItem: item,
    value: val != null && !Number.isNaN(Number(val)) ? String(val) : "",
    unit: m.unit ?? "",
  };
}

function firstOrEmptyMaterial(
  list: { category?: string; specification?: string; notes?: string }[] | undefined,
  index: number,
): MaterialFinishDraft {
  const r = list?.[0];
  if (!r) return emptyMaterialFinish();
  return {
    id: `mf-${index}-0`,
    category: r.category ?? "",
    specification: r.specification ?? "",
    notes: r.notes ?? "",
  };
}

function firstOrEmptyWorkItem(
  list:
    | {
        workType?: string;
        description?: string;
        quantity?: number | null;
        unit?: string;
        finishMaterial?: string;
        notes?: string;
      }[]
    | undefined,
  index: number,
): WorkItemDraft {
  const w = list?.[0];
  if (!w) return emptyWorkItem();
  return {
    id: `w-${index}-0`,
    workType: w.workType ?? "",
    description: w.description ?? "",
    quantity: w.quantity != null && !Number.isNaN(w.quantity) ? String(w.quantity) : "",
    unit: w.unit ?? "",
    finishMaterial: w.finishMaterial ?? "",
    notes: w.notes ?? "",
  };
}

function scopeToBlockDraft(scope: SiteReportScope, index: number): SiteBlockDraft {
  return {
    id: rid(`block-${index}`),
    title: scope.title || `Site block ${index + 1}`,
    workItem: firstOrEmptyWorkItem(scope.workItems, index),
    measurement: firstOrEmptyMeasurement(scope.measurements, index),
    materialFinish: firstOrEmptyMaterial(scope.materialFinishDetails, index),
  };
}

function resolveScopes(sr: SiteReport | undefined): SiteReportScope[] {
  if (!sr) return [];
  if (Array.isArray(sr.scopes) && sr.scopes.length) return sr.scopes;
  if (Array.isArray(sr.blocks) && sr.blocks.length) return sr.blocks;
  return [
    {
      title: "Site block 1",
      workItems: sr.workItems ?? [],
      measurements: sr.measurements ?? [],
      materialFinishDetails: sr.materialFinishDetails ?? [],
    },
  ];
}

function pickSharedFromScope(scope: SiteReportScope | undefined) {
  return {
    siteCondition: {
      existingCondition: scope?.siteCondition?.existingCondition ?? "",
      demolitionRequired: scope?.siteCondition?.demolitionRequired ?? "",
      accessLimitations: scope?.siteCondition?.accessLimitations ?? "",
      ceilingWallFloorCondition: scope?.siteCondition?.ceilingWallFloorCondition ?? "",
    },
    riskAssessment: {
      electricalRisk: scope?.riskAssessment?.electricalRisk ?? "",
      heightWork: scope?.riskAssessment?.heightWork ?? "",
      waterLeakage: scope?.riskAssessment?.waterLeakage ?? "",
      restrictedAccess: scope?.riskAssessment?.restrictedAccess ?? "",
      otherRisks: scope?.riskAssessment?.otherRisks ?? "",
    },
    siteVisitNotes: {
      clientRequirements: scope?.siteVisitNotes?.clientRequirements ?? "",
      installationDetails: scope?.siteVisitNotes?.installationDetails ?? "",
      materialSuggestions: scope?.siteVisitNotes?.materialSuggestions ?? "",
      recommendedSolution: scope?.siteVisitNotes?.recommendedSolution ?? "",
      executionComplexity: scope?.siteVisitNotes?.executionComplexity ?? "",
      specialInstructions: scope?.siteVisitNotes?.specialInstructions ?? "",
    },
  };
}

function hasSharedValues(obj: Record<string, string>): boolean {
  return Object.values(obj).some((v) => String(v).trim());
}

export function draftFromInquiry(inquiry: Inquiry): SiteSurveyDraft {
  const sr = inquiry.siteReport;
  const base = emptySiteSurveyDraft();
  if (!sr) return base;

  base.observationsLegacy = sr.observations ?? "";
  const scopes = resolveScopes(sr);
  base.blocks = scopes.length ? scopes.map(scopeToBlockDraft) : [emptySiteBlock("Site block 1")];

  // Prefer root shared fields; fall back to first scope (legacy multi-block shared-in-scope data)
  const fromRoot = {
    siteCondition: {
      existingCondition: sr.siteCondition?.existingCondition ?? "",
      demolitionRequired: sr.siteCondition?.demolitionRequired ?? "",
      accessLimitations: sr.siteCondition?.accessLimitations ?? "",
      ceilingWallFloorCondition: sr.siteCondition?.ceilingWallFloorCondition ?? "",
    },
    riskAssessment: {
      electricalRisk: sr.riskAssessment?.electricalRisk ?? "",
      heightWork: sr.riskAssessment?.heightWork ?? "",
      waterLeakage: sr.riskAssessment?.waterLeakage ?? "",
      restrictedAccess: sr.riskAssessment?.restrictedAccess ?? "",
      otherRisks: sr.riskAssessment?.otherRisks ?? "",
    },
    siteVisitNotes: {
      clientRequirements: sr.siteVisitNotes?.clientRequirements ?? "",
      installationDetails: sr.siteVisitNotes?.installationDetails ?? "",
      materialSuggestions: sr.siteVisitNotes?.materialSuggestions ?? "",
      recommendedSolution: sr.siteVisitNotes?.recommendedSolution ?? "",
      executionComplexity: sr.siteVisitNotes?.executionComplexity ?? "",
      specialInstructions: sr.siteVisitNotes?.specialInstructions ?? "",
    },
  };
  const fromScope = pickSharedFromScope(scopes[0]);

  base.siteCondition = hasSharedValues(fromRoot.siteCondition)
    ? fromRoot.siteCondition
    : fromScope.siteCondition;
  base.riskAssessment = hasSharedValues(fromRoot.riskAssessment)
    ? fromRoot.riskAssessment
    : fromScope.riskAssessment;
  base.siteVisitNotes = hasSharedValues(fromRoot.siteVisitNotes)
    ? fromRoot.siteVisitNotes
    : fromScope.siteVisitNotes;

  if (!base.siteVisitNotes.clientRequirements.trim() && base.observationsLegacy.trim()) {
    base.siteVisitNotes.clientRequirements = base.observationsLegacy.trim();
  }
  return base;
}

function serializeMeasurement(
  m: MeasurementDraft,
  _measurementErrors: string[],
  _blockLabel: string,
  fallbackQuantity?: string,
  fallbackUnit?: string,
) {
  const areaRoom = m.areaRoom.trim();
  const measurementItem = m.measurementItem.trim();
  const unit = m.unit.trim() || (fallbackUnit ? fallbackUnit.trim() : "");
  const valueRaw = m.value.trim() || (fallbackQuantity ? fallbackQuantity.trim() : "");
  if (!areaRoom && !measurementItem && !valueRaw && !unit) return [];

  let value: number | null = null;
  if (valueRaw) {
    const n = Number(valueRaw);
    if (!Number.isNaN(n)) {
      value = n;
    }
  }

  return [
    {
      areaRoom,
      measurementItem,
      value,
      unit,
      label: measurementItem,
    },
  ];
}

function serializeMaterial(r: MaterialFinishDraft) {
  const row = {
    category: r.category.trim(),
    specification: r.specification.trim(),
    notes: r.notes.trim(),
  };
  if (!row.category && !row.specification && !row.notes) return [];
  return [row];
}

function serializeWorkItem(w: WorkItemDraft, errors: string[], blockLabel: string) {
  const quantityRaw = w.quantity.trim();
  let quantity: number | null = null;
  if (quantityRaw) {
    const n = Number(quantityRaw);
    if (Number.isNaN(n)) {
      errors.push(`${blockLabel}: quantity must be a number.`);
      return [];
    }
    quantity = n;
  }
  const row = {
    workType: w.workType.trim(),
    description: w.description.trim(),
    quantity,
    unit: w.unit.trim(),
    finishMaterial: w.finishMaterial.trim(),
    notes: w.notes.trim(),
  };
  if (
    !row.workType &&
    !row.description &&
    !row.finishMaterial &&
    !row.notes &&
    !row.unit &&
    (row.quantity === null || Number.isNaN(row.quantity))
  ) {
    return [];
  }
  return [row];
}

export function patchPayloadFromDraft(d: SiteSurveyDraft, measurementErrors: string[]) {
  measurementErrors.length = 0;
  const scopes = d.blocks.map((block, i) => {
    const label = block.title.trim() || `${i + 1}`;
    return {
      title: label,
      workItems: serializeWorkItem(block.workItem, measurementErrors, label),
      measurements: serializeMeasurement(
        block.measurement,
        measurementErrors,
        label,
        block.workItem.quantity,
        block.workItem.unit,
      ),
      materialFinishDetails: serializeMaterial(block.materialFinish),
    };
  });

  const first = scopes[0] || {
    title: "Site block 1",
    workItems: [],
    measurements: [],
    materialFinishDetails: [],
  };

  return {
    observations: "",
    scopes,
    workItems: first.workItems,
    measurements: first.measurements,
    materialFinishDetails: first.materialFinishDetails,
    siteCondition: { ...d.siteCondition },
    riskAssessment: { ...d.riskAssessment },
    siteVisitNotes: { ...d.siteVisitNotes },
  };
}

function scopeHasBlockContent(scope: SiteReportScope | undefined): boolean {
  if (!scope) return false;
  if ((scope.workItems?.length ?? 0) > 0) return true;
  if ((scope.measurements?.length ?? 0) > 0) return true;
  if ((scope.materialFinishDetails?.length ?? 0) > 0) return true;
  return Boolean(String(scope.title ?? "").trim());
}

export function hasSiteSurveyContent(sr: SiteReport | undefined): boolean {
  if (!sr) return false;
  if (resolveScopes(sr).some(scopeHasBlockContent)) return true;
  if ((sr.photos?.length ?? 0) > 0) return true;
  if ((sr.videos?.length ?? 0) > 0) return true;
  if ((sr.referenceImages?.length ?? 0) > 0) return true;
  if (sr.siteCondition && Object.values(sr.siteCondition).some((v) => String(v ?? "").trim())) return true;
  if (sr.riskAssessment && Object.values(sr.riskAssessment).some((v) => String(v ?? "").trim())) return true;
  if (sr.siteVisitNotes && Object.values(sr.siteVisitNotes).some((v) => String(v ?? "").trim())) return true;
  if (String(sr.observations ?? "").trim()) return true;
  return false;
}

export function countFilledBlockSections(block: SiteBlockDraft): number {
  let n = 0;
  const w = block.workItem;
  if (
    w.workType.trim() ||
    w.description.trim() ||
    w.quantity.trim() ||
    w.unit.trim() ||
    w.finishMaterial.trim() ||
    w.notes.trim()
  ) {
    n += 1;
  }
  if (
    block.measurement.areaRoom.trim() ||
    block.measurement.measurementItem.trim() ||
    block.measurement.value.trim() ||
    block.measurement.unit.trim()
  ) {
    n += 1;
  }
  if (
    block.materialFinish.category.trim() ||
    block.materialFinish.specification.trim() ||
    block.materialFinish.notes.trim()
  ) {
    n += 1;
  }
  return n;
}
