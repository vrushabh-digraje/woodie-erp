const fs = require("fs");
const path = require("path");
const { Inquiry } = require("../models/Inquiry");
const { BoqQuotation } = require("../models/BoqQuotation");
const { validateCreateInquiry, validateUpdateInquiry } = require("../validators/inquiryValidator");
const {
  activityActor,
  assertInquiryAccess,
  assertAssignedPersonAction,
  assertSiteSurveyWriteAccess,
  assertSiteSurveyMediaUpload,
  buildInquiryListFilter,
  resolveAssignedPerson,
} = require("../middleware/inquiryAccess");

function emptyScope(title = "Site block 1") {
  return {
    title,
    workItems: [],
    measurements: [],
    materialFinishDetails: [],
  };
}

function defaultSiteReport() {
  return {
    observations: "",
    scopes: [emptyScope("Site block 1")],
    workItems: [],
    measurements: [],
    materialFinishDetails: [],
    siteCondition: {},
    riskAssessment: {},
    siteVisitNotes: {},
    photos: [],
    videos: [],
    referenceImages: [],
    reportSubmittedAt: null,
    updatedAt: null,
  };
}

function normalizeSiteCondition(raw = {}, fallback = {}) {
  const sc = raw && typeof raw === "object" ? raw : {};
  const fb = fallback && typeof fallback === "object" ? fallback : {};
  return {
    existingCondition: String(sc.existingCondition ?? fb.existingCondition ?? "").trim(),
    demolitionRequired: String(sc.demolitionRequired ?? fb.demolitionRequired ?? "").trim(),
    accessLimitations: String(sc.accessLimitations ?? fb.accessLimitations ?? "").trim(),
    ceilingWallFloorCondition: String(
      sc.ceilingWallFloorCondition ?? fb.ceilingWallFloorCondition ?? "",
    ).trim(),
  };
}

function normalizeRiskAssessment(raw = {}, fallback = {}) {
  const ra = raw && typeof raw === "object" ? raw : {};
  const fb = fallback && typeof fallback === "object" ? fallback : {};
  return {
    electricalRisk: String(ra.electricalRisk ?? fb.electricalRisk ?? "").trim(),
    heightWork: String(ra.heightWork ?? fb.heightWork ?? "").trim(),
    waterLeakage: String(ra.waterLeakage ?? fb.waterLeakage ?? "").trim(),
    restrictedAccess: String(ra.restrictedAccess ?? fb.restrictedAccess ?? "").trim(),
    otherRisks: String(ra.otherRisks ?? fb.otherRisks ?? "").trim(),
  };
}

function normalizeVisitNotes(raw = {}, fallback = {}) {
  const vn = raw && typeof raw === "object" ? raw : {};
  const fb = fallback && typeof fallback === "object" ? fallback : {};
  return {
    clientRequirements: String(vn.clientRequirements ?? fb.clientRequirements ?? "").trim(),
    installationDetails: String(vn.installationDetails ?? fb.installationDetails ?? "").trim(),
    materialSuggestions: String(vn.materialSuggestions ?? fb.materialSuggestions ?? "").trim(),
    recommendedSolution: String(vn.recommendedSolution ?? fb.recommendedSolution ?? "").trim(),
    executionComplexity: String(vn.executionComplexity ?? fb.executionComplexity ?? "").trim(),
    specialInstructions: String(vn.specialInstructions ?? fb.specialInstructions ?? "").trim(),
  };
}

function normalizeAttachments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a) => ({
      url: String(a?.url ?? "").trim(),
      filename: String(a?.filename ?? "").trim(),
      uploadedAt: a?.uploadedAt ? new Date(a.uploadedAt) : new Date(),
    }))
    .filter((a) => a.url && a.filename);
}

function normalizeScope(raw, index, previous) {
  const prev = previous && typeof previous === "object" ? previous : {};
  const title = String(raw?.title ?? prev.title ?? "").trim() || `Site block ${index + 1}`;
  return {
    title,
    workItems: normalizeWorkItems(raw?.workItems ?? prev.workItems),
    measurements: normalizeMeasurements(raw?.measurements ?? prev.measurements),
    materialFinishDetails: normalizeMaterialFinish(
      raw?.materialFinishDetails ?? prev.materialFinishDetails,
    ),
  };
}

function normalizeScopes(raw, previousScopes = []) {
  if (!Array.isArray(raw) || raw.length === 0) {
    if (Array.isArray(previousScopes) && previousScopes.length) {
      return previousScopes.map((s, i) => normalizeScope(s, i, s));
    }
    return [emptyScope("Site block 1")];
  }
  return raw.map((s, i) => normalizeScope(s, i, previousScopes[i]));
}

/** Mirror first scope work lines onto legacy flat fields; keep shared sections on root. */
function syncLegacyFlatFromScopes(sr) {
  const first = Array.isArray(sr.scopes) && sr.scopes.length ? sr.scopes[0] : emptyScope();
  sr.workItems = first.workItems || [];
  sr.measurements = first.measurements || [];
  sr.materialFinishDetails = first.materialFinishDetails || [];
  // Do not pull shared sections from scopes — they live on siteReport root.
  if (!sr.siteCondition) sr.siteCondition = {};
  if (!sr.riskAssessment) sr.riskAssessment = {};
  if (!sr.siteVisitNotes) sr.siteVisitNotes = {};
  if (!Array.isArray(sr.photos)) sr.photos = [];
  if (!Array.isArray(sr.videos)) sr.videos = [];
  if (!Array.isArray(sr.referenceImages)) sr.referenceImages = [];
}

function migrateSiteReportScopes(sr) {
  if (!sr) return defaultSiteReport();

  // Hoist shared fields from first scope if root is empty (legacy)
  const firstScope = Array.isArray(sr.scopes) && sr.scopes.length ? sr.scopes[0] : null;
  const rootEmptyCondition = !Object.values(sr.siteCondition || {}).some((v) => String(v ?? "").trim());
  const rootEmptyRisk = !Object.values(sr.riskAssessment || {}).some((v) => String(v ?? "").trim());
  const rootEmptyNotes = !Object.values(sr.siteVisitNotes || {}).some((v) => String(v ?? "").trim());
  if (firstScope) {
    if (rootEmptyCondition && firstScope.siteCondition) sr.siteCondition = firstScope.siteCondition;
    if (rootEmptyRisk && firstScope.riskAssessment) sr.riskAssessment = firstScope.riskAssessment;
    if (rootEmptyNotes && firstScope.siteVisitNotes) sr.siteVisitNotes = firstScope.siteVisitNotes;
    // Hoist media from scopes if root empty
    const rootMediaEmpty =
      !(sr.photos?.length || sr.videos?.length || sr.referenceImages?.length);
    if (rootMediaEmpty) {
      const photos = [];
      const videos = [];
      const refs = [];
      for (const scope of sr.scopes || []) {
        photos.push(...(scope.photos || []));
        videos.push(...(scope.videos || []));
        refs.push(...(scope.referenceImages || []));
      }
      if (photos.length || videos.length || refs.length) {
        sr.photos = photos;
        sr.videos = videos;
        sr.referenceImages = refs;
      }
    }
  }

  if (Array.isArray(sr.scopes) && sr.scopes.length > 0) {
    // Strip shared/media from scopes — block-only fields
    sr.scopes = sr.scopes.map((s, i) => normalizeScope(s, i, s));
    syncLegacyFlatFromScopes(sr);
    return sr;
  }

  const hasLegacy =
    (sr.workItems?.length ?? 0) > 0 ||
    (sr.measurements?.length ?? 0) > 0 ||
    (sr.materialFinishDetails?.length ?? 0) > 0;

  sr.scopes = hasLegacy
    ? [
        {
          title: "Site block 1",
          workItems: sr.workItems || [],
          measurements: sr.measurements || [],
          materialFinishDetails: sr.materialFinishDetails || [],
        },
      ]
    : [emptyScope("Site block 1")];
  syncLegacyFlatFromScopes(sr);
  return sr;
}

async function decorateInquiry(inquiry) {
  const plain = inquiry.toObject ? inquiry.toObject() : { ...inquiry };
  if (plain.siteReport) {
    migrateSiteReportScopes(plain.siteReport);
  }
  plain.boqPrepared = Boolean(await BoqQuotation.exists({ inquiryId: inquiry._id }));
  return plain;
}

function normalizeWorkItems(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((w) => {
      const quantityRaw = w?.quantity;
      let quantity = null;
      if (quantityRaw !== "" && quantityRaw !== undefined && quantityRaw !== null) {
        const n = Number(quantityRaw);
        quantity = Number.isNaN(n) ? null : n;
      }
      return {
        workType: String(w?.workType ?? "").trim(),
        description: String(w?.description ?? "").trim(),
        quantity,
        unit: String(w?.unit ?? "").trim(),
        finishMaterial: String(w?.finishMaterial ?? "").trim(),
        notes: String(w?.notes ?? "").trim(),
      };
    })
    .filter(
      (w) =>
        w.workType ||
        w.description ||
        w.finishMaterial ||
        w.notes ||
        w.unit ||
        (w.quantity !== null && !Number.isNaN(w.quantity)),
    );
}

function normalizeMeasurements(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m) => {
      const areaRoom = String(m?.areaRoom ?? "").trim();
      let measurementItem = String(m?.measurementItem ?? "").trim();
      const legacy = String(m?.label ?? "").trim();
      if (!measurementItem && legacy) measurementItem = legacy;
      const valRaw = m?.value;
      const value =
        valRaw === "" || valRaw === undefined || valRaw === null ? null : Number(valRaw);
      const unit = String(m?.unit ?? "").trim();
      return {
        areaRoom,
        measurementItem,
        value: Number.isNaN(value) ? null : value,
        unit,
        label: legacy || measurementItem,
      };
    })
    .filter((row) => {
      const hasVal = row.value !== null && !Number.isNaN(row.value);
      return row.areaRoom || row.measurementItem || row.unit || hasVal;
    });
}

function normalizeMaterialFinish(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => ({
      category: String(row?.category ?? "").trim(),
      specification: String(row?.specification ?? "").trim(),
      notes: String(row?.notes ?? "").trim(),
    }))
    .filter((r) => r.category || r.specification || r.notes);
}

function createActivity(action, note, createdBy = "System") {
  return { action, note, createdBy };
}

async function generateInquiryNumber() {
  const rows = await Inquiry.find({ inquiryNumber: /^INQ-\d+$/ }).select("inquiryNumber").lean();
  let maxSeq = 0;
  for (const row of rows) {
    const match = /^INQ-(\d+)$/.exec(String(row.inquiryNumber ?? ""));
    if (match) maxSeq = Math.max(maxSeq, Number(match[1]));
  }
  return `INQ-${String(maxSeq + 1).padStart(4, "0")}`;
}

function mapInquiryBody(body) {
  return {
    clientName: body.clientName,
    contactPersonName: body.contactPersonName ? String(body.contactPersonName).trim() : "",
    phone: body.phone,
    category: body.category,
    scopeOfWork: body.scopeOfWork,
    siteDetails: body.siteDetails ?? "",
    fullAddress: body.fullAddress,
    googleMapsUrl: body.googleMapsUrl ? String(body.googleMapsUrl).trim() : "",
    scheduleVisitDate: body.scheduleVisitDate,
    scheduleVisitTime: body.scheduleVisitTime,
    notes: body.notes ?? "",
  };
}

function mapUploadedAttachments(files, inquiryId) {
  if (!Array.isArray(files) || files.length === 0) return [];
  const uploadedAt = new Date();
  return files.map((file) => ({
    url: `/uploads/inquiry-attachments/${inquiryId}/${file.filename}`,
    filename: file.originalname || file.filename,
    uploadedAt,
  }));
}

async function listInquiries(req, res) {
  const filter = buildInquiryListFilter(req);
  const pageParam = Number(req.query?.page);
  const pageSizeParam = Number(req.query?.pageSize);
  const usePagination = Number.isFinite(pageParam) && pageParam > 0;
  if (!usePagination) {
    const data = await Inquiry.find(filter).sort({ createdAt: -1 });
    return res.json(data);
  }

  const page = Math.max(1, Math.floor(pageParam));
  const pageSize = Math.min(100, Math.max(1, Math.floor(pageSizeParam || 20)));
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    Inquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
    Inquiry.countDocuments(filter),
  ]);
  return res.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

async function createInquiry(req, res) {
  const error = validateCreateInquiry(req.body);
  if (error) return res.status(400).json({ message: error });

  const personResult = await resolveAssignedPerson(req.body.assignedPersonId);
  if (personResult.error) return res.status(400).json({ message: personResult.error });

  const inquiryNumber = await generateInquiryNumber();
  const actor = activityActor(req);

  const inquiry = await Inquiry.create({
    ...mapInquiryBody(req.body),
    inquiryNumber,
    assignedPersonId: personResult.assignedPersonId,
    assignedPersonName: personResult.assignedPersonName,
    status: "Visit Pending Approval",
    attachments: [],
    activityTimeline: [
      createActivity("Inquiry Created", "New inquiry captured", actor),
      createActivity("Visit Assigned", `Assigned to ${personResult.assignedPersonName}`, actor),
    ],
  });

  const files = req.files || [];
  if (files.length > 0) {
    const destDir = path.join(__dirname, "../../uploads/inquiry-attachments", String(inquiry._id));
    fs.mkdirSync(destDir, { recursive: true });
    for (const file of files) {
      if (file.path && fs.existsSync(file.path)) {
        const dest = path.join(destDir, file.filename);
        fs.renameSync(file.path, dest);
      }
    }
    inquiry.attachments = mapUploadedAttachments(files, inquiry._id);
    inquiry.markModified("attachments");
    await inquiry.save();
  }

  return res.status(201).json(inquiry);
}

async function getInquiryById(req, res) {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
  if (!assertInquiryAccess(inquiry, req.user, res)) return undefined;
  return res.json(await decorateInquiry(inquiry));
}

async function updateInquiry(req, res) {
  const error = validateUpdateInquiry(req.body);
  if (error) return res.status(400).json({ message: error });

  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
  if (inquiry.status === "Site Report Attached") {
    return res.status(400).json({ message: "Cannot edit inquiry after site report is attached" });
  }

  const personResult = await resolveAssignedPerson(req.body.assignedPersonId);
  if (personResult.error) return res.status(400).json({ message: personResult.error });

  const previousAssignee = String(inquiry.assignedPersonId);
  Object.assign(inquiry, mapInquiryBody(req.body));
  inquiry.assignedPersonId = personResult.assignedPersonId;
  inquiry.assignedPersonName = personResult.assignedPersonName;

  const files = req.files || [];
  if (files.length > 0) {
    inquiry.attachments.push(...mapUploadedAttachments(files, inquiry._id));
    inquiry.markModified("attachments");
  }

  if (previousAssignee !== String(personResult.assignedPersonId)) {
    inquiry.activityTimeline.unshift(
      createActivity("Visit Assigned", `Reassigned to ${personResult.assignedPersonName}`, activityActor(req)),
    );
    if (["Visit Approved", "Visit Rejected"].includes(inquiry.status)) {
      inquiry.status = "Visit Pending Approval";
      inquiry.visitApproval = { decision: null, rejectionReason: "", updatedAt: null };
    }
  }

  await inquiry.save();
  return res.json(inquiry);
}

async function deleteInquiry(req, res) {
  const inquiry = await Inquiry.findByIdAndDelete(req.params.id);
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
  return res.status(204).send();
}

async function decideVisitApproval(req, res) {
  const { decision, rejectionReason = "" } = req.body;
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
  if (!assertAssignedPersonAction(inquiry, req.user, res)) return undefined;

  if (inquiry.status !== "Visit Pending Approval") {
    return res.status(400).json({ message: "Visit can only be approved or rejected while pending approval" });
  }
  if (!["Approved", "Rejected"].includes(decision)) {
    return res.status(400).json({ message: "decision must be Approved or Rejected" });
  }
  if (decision === "Rejected" && !String(rejectionReason).trim()) {
    return res.status(400).json({ message: "rejectionReason is required when rejecting" });
  }

  inquiry.visitApproval = {
    decision,
    rejectionReason: decision === "Rejected" ? String(rejectionReason).trim() : "",
    updatedAt: new Date(),
  };
  inquiry.status = decision === "Approved" ? "Visit Approved" : "Visit Rejected";
  inquiry.activityTimeline.unshift(
    createActivity(
      decision === "Approved" ? "Visit Approved" : "Visit Rejected",
      decision === "Rejected" ? inquiry.visitApproval.rejectionReason : "Visit approved",
      activityActor(req),
    ),
  );

  await inquiry.save();
  return res.json(inquiry);
}

async function uploadSiteReportMedia(req, res) {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
  if (!(await assertSiteSurveyMediaUpload(inquiry, req.user, res))) return undefined;

  if (!inquiry.siteReport) inquiry.siteReport = defaultSiteReport();
  migrateSiteReportScopes(inquiry.siteReport);

  const groups = req.files || {};
  const photoFiles = groups.photos || [];
  const videoFiles = groups.videos || [];
  const refFiles = groups.references || [];
  if (photoFiles.length + videoFiles.length + refFiles.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  const uploadedAt = new Date();
  const idStr = String(inquiry._id);
  const toAtt = (files) =>
    files.map((file) => ({
      url: `/uploads/site-report/${idStr}/${file.filename}`,
      filename: file.filename,
      uploadedAt,
    }));

  // Attachments are shared once for the whole site report (not per block).
  inquiry.siteReport.photos = [...(inquiry.siteReport.photos || []), ...toAtt(photoFiles)];
  inquiry.siteReport.videos = [...(inquiry.siteReport.videos || []), ...toAtt(videoFiles)];
  inquiry.siteReport.referenceImages = [
    ...(inquiry.siteReport.referenceImages || []),
    ...toAtt(refFiles),
  ];

  syncLegacyFlatFromScopes(inquiry.siteReport);
  inquiry.siteReport.updatedAt = new Date();
  inquiry.markModified("siteReport");
  await inquiry.save();
  return res.json(await decorateInquiry(inquiry));
}

async function updateSiteReport(req, res) {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
  if (!(await assertSiteSurveyWriteAccess(inquiry, req.user, res))) return undefined;

  if (!inquiry.siteReport) inquiry.siteReport = defaultSiteReport();
  migrateSiteReportScopes(inquiry.siteReport);

  const sr = inquiry.siteReport;
  sr.observations = String(req.body.observations ?? sr.observations ?? "").trim();

  if (Array.isArray(req.body.scopes) || Array.isArray(req.body.blocks)) {
    const incoming = Array.isArray(req.body.scopes) ? req.body.scopes : req.body.blocks;
    sr.scopes = normalizeScopes(incoming, sr.scopes);
  } else {
    const first = normalizeScope(
      {
        title: req.body.title || sr.scopes?.[0]?.title || "Site block 1",
        workItems: req.body.workItems,
        measurements: req.body.measurements,
        materialFinishDetails: req.body.materialFinishDetails,
      },
      0,
      sr.scopes?.[0],
    );
    sr.scopes = [first, ...(sr.scopes || []).slice(1)];
  }

  // Shared sections — once for the whole report
  if (req.body.siteCondition !== undefined) {
    sr.siteCondition = normalizeSiteCondition(req.body.siteCondition, sr.siteCondition);
  }
  if (req.body.riskAssessment !== undefined) {
    sr.riskAssessment = normalizeRiskAssessment(req.body.riskAssessment, sr.riskAssessment);
  }
  if (req.body.siteVisitNotes !== undefined) {
    sr.siteVisitNotes = normalizeVisitNotes(req.body.siteVisitNotes, sr.siteVisitNotes);
  }

  syncLegacyFlatFromScopes(sr);
  sr.updatedAt = new Date();
  inquiry.markModified("siteReport");
  await inquiry.save();
  return res.json(await decorateInquiry(inquiry));
}

async function submitSiteReport(req, res) {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
  if (!assertAssignedPersonAction(inquiry, req.user, res)) return undefined;
  if (inquiry.status === "Site Report Attached") {
    return res.status(400).json({ message: "Site report already submitted" });
  }
  if (inquiry.status !== "Visit Approved") {
    return res.status(400).json({ message: "Approve the visit before submitting the site report" });
  }

  if (!inquiry.siteReport) inquiry.siteReport = defaultSiteReport();
  migrateSiteReportScopes(inquiry.siteReport);
  syncLegacyFlatFromScopes(inquiry.siteReport);

  inquiry.siteReport.reportSubmittedAt = new Date();
  inquiry.siteReport.updatedAt = new Date();
  inquiry.markModified("siteReport");
  inquiry.status = "Site Report Attached";
  inquiry.activityTimeline.unshift(
    createActivity("Site Report Uploaded", "Final site visit report submitted", activityActor(req)),
  );

  await inquiry.save();
  return res.json(await decorateInquiry(inquiry));
}

module.exports = {
  listInquiries,
  createInquiry,
  getInquiryById,
  updateInquiry,
  deleteInquiry,
  decideVisitApproval,
  uploadSiteReportMedia,
  updateSiteReport,
  submitSiteReport,
};
