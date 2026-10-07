/**
 * Map inquiry site report → BOQ line items + quotation.siteInformation blocks.
 */

function inferCategory(text) {
  const t = String(text).toLowerCase();
  if (/\b(supply|material|laminate|paint|flooring|glass|vinyl|mdf|timber|slab)\b/.test(t)) {
    return "Material";
  }
  if (/\b(install|removal|relocate|repair|demolition|partition|wiring|ceiling|wall)\b/.test(t)) {
    return "Labor";
  }
  if (/\b(equipment|tool|scaffold|lift)\b/.test(t)) {
    return "Equipment";
  }
  return "Service";
}

function workItemDescription(w) {
  const parts = [];
  if (w.workType) parts.push(w.workType);
  if (w.description) parts.push(w.description);
  if (w.finishMaterial) parts.push(`Finish: ${w.finishMaterial}`);
  let main = parts.join(" — ");
  if (w.notes) {
    main = main ? `${main}. ${w.notes}` : w.notes;
  }
  return main.trim() || "Site work item";
}

function workItemQuantity(w) {
  const q = w.quantity;
  if (q !== null && q !== undefined && !Number.isNaN(Number(q)) && Number(q) > 0) {
    return Number(q);
  }
  return 1;
}

function workItemUnit(w) {
  const u = String(w.unit ?? "").trim();
  return u || "LS";
}

function itemsFromWorkItems(workItems, startIndex = 1) {
  if (!Array.isArray(workItems)) return [];
  return workItems
    .map((w, i) => {
      const description = workItemDescription(w);
      const textForCategory = `${w.workType || ""} ${w.description || ""} ${w.finishMaterial || ""}`;
      return {
        itemCode: `WI-${String(startIndex + i).padStart(3, "0")}`,
        description,
        category: inferCategory(textForCategory),
        quantity: workItemQuantity(w),
        unit: workItemUnit(w),
        unitPrice: 0,
      };
    })
    .filter((item) => item.description);
}

function projectNameFromInquiry(inquiry) {
  const scope = String(inquiry.scopeOfWork ?? "").trim();
  if (scope) return scope.slice(0, 200);
  const site = String(inquiry.siteDetails ?? "").trim();
  if (site) return site.slice(0, 200);
  return String(inquiry.category || inquiry.inquiryNumber || "New Project").trim();
}

function notesFromSiteReport(inquiry) {
  const sr = inquiry?.siteReport;
  if (!sr) return "";
  const lines = [];
  const vn = sr.siteVisitNotes || {};
  const labels = {
    clientRequirements: "Client requirements",
    installationDetails: "Installation",
    materialSuggestions: "Materials",
    recommendedSolution: "Recommended solution",
    executionComplexity: "Complexity",
    specialInstructions: "Special instructions",
  };
  for (const [key, label] of Object.entries(labels)) {
    const v = String(vn[key] ?? "").trim();
    if (v) lines.push(`${label}: ${v}`);
  }
  const sc = sr.siteCondition || {};
  if (String(sc.existingCondition ?? "").trim()) {
    lines.push(`Site condition: ${String(sc.existingCondition).trim()}`);
  }
  return lines.join("\n").slice(0, 4000);
}

function cloneAttachments(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((a) => ({
      url: String(a?.url ?? "").trim(),
      filename: String(a?.filename ?? "").trim(),
      uploadedAt: a?.uploadedAt ? new Date(a.uploadedAt) : undefined,
    }))
    .filter((a) => a.url && a.filename);
}

function cloneWorkItems(list) {
  if (!Array.isArray(list)) return [];
  return list.map((w) => ({
    workType: String(w?.workType ?? "").trim(),
    description: String(w?.description ?? "").trim(),
    quantity:
      w?.quantity === "" || w?.quantity === undefined || w?.quantity === null || Number.isNaN(Number(w.quantity))
        ? null
        : Number(w.quantity),
    unit: String(w?.unit ?? "").trim(),
    finishMaterial: String(w?.finishMaterial ?? "").trim(),
    notes: String(w?.notes ?? "").trim(),
  }));
}

function cloneMeasurements(list) {
  if (!Array.isArray(list)) return [];
  return list.map((m) => {
    const measurementItem = String(m?.measurementItem ?? m?.label ?? "").trim();
    const value =
      m?.value === "" || m?.value === undefined || m?.value === null || Number.isNaN(Number(m.value))
        ? null
        : Number(m.value);
    return {
      areaRoom: String(m?.areaRoom ?? "").trim(),
      measurementItem,
      value,
      unit: String(m?.unit ?? "").trim(),
      label: String(m?.label ?? measurementItem).trim(),
    };
  });
}

function cloneMaterials(list) {
  if (!Array.isArray(list)) return [];
  return list.map((r) => ({
    category: String(r?.category ?? "").trim(),
    specification: String(r?.specification ?? "").trim(),
    notes: String(r?.notes ?? "").trim(),
  }));
}

function cloneCondition(sc = {}) {
  return {
    existingCondition: String(sc.existingCondition ?? "").trim(),
    demolitionRequired: String(sc.demolitionRequired ?? "").trim(),
    accessLimitations: String(sc.accessLimitations ?? "").trim(),
    ceilingWallFloorCondition: String(sc.ceilingWallFloorCondition ?? "").trim(),
  };
}

function cloneRisk(ra = {}) {
  return {
    electricalRisk: String(ra.electricalRisk ?? "").trim(),
    heightWork: String(ra.heightWork ?? "").trim(),
    waterLeakage: String(ra.waterLeakage ?? "").trim(),
    restrictedAccess: String(ra.restrictedAccess ?? "").trim(),
    otherRisks: String(ra.otherRisks ?? "").trim(),
  };
}

function cloneVisitNotes(vn = {}) {
  return {
    clientRequirements: String(vn.clientRequirements ?? "").trim(),
    installationDetails: String(vn.installationDetails ?? "").trim(),
    materialSuggestions: String(vn.materialSuggestions ?? "").trim(),
    recommendedSolution: String(vn.recommendedSolution ?? "").trim(),
    executionComplexity: String(vn.executionComplexity ?? "").trim(),
    specialInstructions: String(vn.specialInstructions ?? "").trim(),
  };
}

function blockHasContent(block) {
  if (!block || typeof block !== "object") return false;
  if ((block.workItems?.length ?? 0) > 0) return true;
  if ((block.measurements?.length ?? 0) > 0) return true;
  if ((block.materialFinishDetails?.length ?? 0) > 0) return true;
  if (String(block.title ?? "").trim()) return true;
  return false;
}

function resolveSiteBlocks(sr) {
  if (!sr || typeof sr !== "object") return [];

  if (Array.isArray(sr.blocks) && sr.blocks.length) {
    return sr.blocks.filter(blockHasContent);
  }
  if (Array.isArray(sr.scopes) && sr.scopes.length) {
    return sr.scopes.filter(blockHasContent);
  }

  const legacy = {
    title: "Site block 1",
    workItems: sr.workItems || [],
    measurements: sr.measurements || [],
    materialFinishDetails: sr.materialFinishDetails || [],
  };
  return blockHasContent(legacy) ? [legacy] : [];
}

function cloneBlock(block, index = 0) {
  return {
    title: String(block?.title ?? "").trim() || `Site block ${index + 1}`,
    workItems: cloneWorkItems(block?.workItems),
    measurements: cloneMeasurements(block?.measurements),
    materialFinishDetails: cloneMaterials(block?.materialFinishDetails),
  };
}

function itemsFromSiteReport(inquiry) {
  const blocks = resolveSiteBlocks(inquiry?.siteReport);
  const all = [];
  for (const block of blocks) {
    all.push(...(block.workItems || []));
  }
  return itemsFromWorkItems(all);
}

/**
 * Quotation snapshot:
 * - blocks: Work Items / Measurements / Material only
 * - shared: Site Condition / Risk / Notes / Attachments once
 */
function siteInformationFromInquiry(inquiry) {
  const sr = inquiry?.siteReport;
  if (!sr || typeof sr !== "object") return null;
  const blocks = resolveSiteBlocks(sr).map((b, i) => cloneBlock(b, i));

  const shared = {
    siteCondition: cloneCondition(sr.siteCondition),
    riskAssessment: cloneRisk(sr.riskAssessment),
    siteVisitNotes: cloneVisitNotes(sr.siteVisitNotes),
    photos: cloneAttachments(sr.photos),
    videos: cloneAttachments(sr.videos),
    referenceImages: cloneAttachments(sr.referenceImages),
  };

  // Legacy: shared lived inside first scope
  const first = Array.isArray(sr.scopes) && sr.scopes[0] ? sr.scopes[0] : null;
  if (first) {
    if (!Object.values(shared.siteCondition).some((v) => v) && first.siteCondition) {
      shared.siteCondition = cloneCondition(first.siteCondition);
    }
    if (!Object.values(shared.riskAssessment).some((v) => v) && first.riskAssessment) {
      shared.riskAssessment = cloneRisk(first.riskAssessment);
    }
    if (!Object.values(shared.siteVisitNotes).some((v) => v) && first.siteVisitNotes) {
      shared.siteVisitNotes = cloneVisitNotes(first.siteVisitNotes);
    }
    if (!shared.photos.length && first.photos) shared.photos = cloneAttachments(first.photos);
  }

  if (!blocks.length && !Object.values(shared.siteCondition).some((v) => v)) {
    const hasShared =
      Object.values(shared.riskAssessment).some((v) => v) ||
      Object.values(shared.siteVisitNotes).some((v) => v) ||
      shared.photos.length;
    if (!hasShared) return null;
  }

  return {
    blocks,
    ...shared,
    reportSubmittedAt: sr.reportSubmittedAt || null,
    updatedAt: sr.updatedAt || null,
  };
}

function mergeBoqItems(existingItems, incomingItems, { replace = false } = {}) {
  if (replace || !existingItems?.length) {
    return { items: incomingItems, addedCount: incomingItems.length };
  }
  const seen = new Set(
    existingItems.map((i) => String(i.description ?? "").trim().toLowerCase()).filter(Boolean),
  );
  const added = incomingItems.filter((i) => {
    const key = String(i.description ?? "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { items: [...existingItems, ...added], addedCount: added.length };
}

module.exports = {
  itemsFromSiteReport,
  itemsFromWorkItems,
  projectNameFromInquiry,
  notesFromSiteReport,
  siteInformationFromInquiry,
  resolveSiteBlocks,
  mergeBoqItems,
  workItemDescription,
};
