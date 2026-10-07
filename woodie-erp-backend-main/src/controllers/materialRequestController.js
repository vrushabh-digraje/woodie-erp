const { Material } = require("../models/Material");
const { MaterialRequest, MATERIAL_REQUEST_STATUSES } = require("../models/MaterialRequest");
const { WorkOrder } = require("../models/WorkOrder");
const { isFieldRole } = require("../config/rbac");
const { isAssignedToWorkOrder } = require("../middleware/workOrderAccess");
const { formatCount } = require("../utils/formatCount");

const ALLOWED_WO_STATUSES = ["Scheduled", "In Progress"];

function actorName(req) {
  return req.user?.name || "System";
}

function timelineEntry(action, note, req) {
  return {
    action,
    note: note || "",
    by: req.user?._id,
    byName: actorName(req),
    at: new Date(),
  };
}

function timelineEntrySystem(action, note) {
  return {
    action,
    note: note || "",
    byName: "System",
    at: new Date(),
  };
}

async function generateRequestNumber() {
  const rows = await MaterialRequest.find({ requestNumber: /^MR-\d+$/ })
    .select("requestNumber")
    .lean();
  let maxSeq = 0;
  for (const row of rows) {
    const match = /^MR-(\d+)$/.exec(String(row.requestNumber ?? ""));
    if (match) maxSeq = Math.max(maxSeq, Number(match[1]));
  }
  return `MR-${String(maxSeq + 1).padStart(4, "0")}`;
}

function normalizeItems(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: "At least one material item is required" };
  }

  const items = [];
  for (const row of raw) {
    const materialId = row?.materialId;
    const requestedQty = Number(row?.requestedQty);
    if (!materialId) return { error: "Each item must include materialId" };
    if (!requestedQty || requestedQty <= 0 || Number.isNaN(requestedQty)) {
      return { error: "Each item must have a positive requestedQty" };
    }
    items.push({ materialId, requestedQty });
  }
  return { items };
}

async function snapshotInventory(doc) {
  const materialIds = doc.items.map((i) => i.materialId);
  const materials = await Material.find({ _id: { $in: materialIds } });
  const materialMap = new Map(materials.map((m) => [String(m._id), m]));

  const shortItems = [];
  for (const item of doc.items) {
    const material = materialMap.get(String(item.materialId));
    const available = material ? material.currentStock : 0;
    item.availableQty = available;
    if (available < item.requestedQty) {
      shortItems.push(item.materialName);
    }
  }

  return { allInStock: shortItems.length === 0, shortItems, materialMap };
}

async function deductStockForRequest(doc, req) {
  const materialIds = doc.items.map((i) => i.materialId);
  const materials = await Material.find({ _id: { $in: materialIds } });
  const materialMap = new Map(materials.map((m) => [String(m._id), m]));

  for (const item of doc.items) {
    const material = materialMap.get(String(item.materialId));
    if (!material) {
      const error = new Error(`Material not found: ${item.materialName}`);
      error.code = "MATERIAL_NOT_FOUND";
      throw error;
    }
    if (material.currentStock < item.requestedQty) {
      const error = new Error(`Insufficient stock for ${item.materialName}`);
      error.code = "INSUFFICIENT_STOCK";
      throw error;
    }
  }

  for (const item of doc.items) {
    const material = materialMap.get(String(item.materialId));
    material.currentStock -= item.requestedQty;
    material.stockTransactions.push({
      type: "out",
      qty: item.requestedQty,
      note: `Issued for ${doc.requestNumber} (${doc.workOrderNumber})`,
      by: req.user._id,
      byName: actorName(req),
      at: new Date(),
    });
    item.issuedQty = item.requestedQty;
    await material.save();
  }
}

/** After manager approval or post-procurement: auto inventory check → Issued or Procurement Needed. */
async function runInventoryCheckAndFulfill(doc, req, { afterProcurement = false } = {}) {
  const { allInStock, shortItems } = await snapshotInventory(doc);

  doc.activityTimeline.push(
    timelineEntrySystem(
      "Inventory Check (System Auto)",
      allInStock
        ? "All requested quantities are available in stock"
        : `Short on: ${shortItems.join(", ")}`,
    ),
  );

  if (allInStock) {
    await deductStockForRequest(doc, req);
    doc.status = "Issued";
    doc.activityTimeline.push(
      timelineEntrySystem(
        afterProcurement ? "Stock Updated + Issued to Work Order" : "Issue Stock to Work Order",
        `Materials issued to ${doc.workOrderNumber}`,
      ),
    );
  } else {
    doc.status = "Procurement Needed";
    doc.activityTimeline.push(
      timelineEntrySystem(
        "Purchase Request",
        "Stock not available — RFQ → PO → GRN workflow required before issue",
      ),
    );
  }
}

async function createMaterialRequest(req, res) {
  try {
    const workOrderId = req.body?.workOrderId;
    if (!workOrderId) return res.status(400).json({ message: "workOrderId is required" });

    const normalized = normalizeItems(req.body?.items);
    if (normalized.error) return res.status(400).json({ message: normalized.error });

    const workOrder = await WorkOrder.findById(workOrderId);
    if (!workOrder) return res.status(404).json({ message: "Work order not found" });

    if (!ALLOWED_WO_STATUSES.includes(workOrder.status)) {
      return res.status(400).json({
        message: `Material requests are only allowed when work order status is ${ALLOWED_WO_STATUSES.join(" or ")}`,
      });
    }

    if (isFieldRole(req.user.role) && !isAssignedToWorkOrder(workOrder, req.user._id)) {
      return res.status(403).json({ message: "You must be assigned to this work order to request materials" });
    }

    const materialIds = normalized.items.map((i) => i.materialId);
    const materials = await Material.find({ _id: { $in: materialIds }, isActive: true });
    const materialMap = new Map(materials.map((m) => [String(m._id), m]));

    const requestItems = [];
    for (const item of normalized.items) {
      const material = materialMap.get(String(item.materialId));
      if (!material) {
        return res.status(400).json({ message: "One or more materials are invalid or inactive" });
      }
      requestItems.push({
        materialId: material._id,
        materialName: material.name,
        unit: material.unit,
        requestedQty: item.requestedQty,
        availableQty: material.currentStock,
        issuedQty: 0,
      });
    }

    const requestNumber = await generateRequestNumber();
    const notes = String(req.body?.notes ?? "").trim();

    const doc = await MaterialRequest.create({
      requestNumber,
      workOrderId: workOrder._id,
      workOrderNumber: workOrder.workOrderNumber,
      projectName: workOrder.projectName,
      requestedBy: req.user._id,
      requestedByName: actorName(req),
      status: "Pending",
      items: requestItems,
      notes,
      activityTimeline: [
        timelineEntry(
          "Material Request Created",
          `${formatCount(requestItems.length, "item", "items")} for ${workOrder.workOrderNumber}`,
          req,
        ),
      ],
    });

    return res.status(201).json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to create material request" });
  }
}

async function listMaterialRequests(req, res) {
  try {
    const { workOrderId, status = "All", q = "" } = req.query;
    const filter = {};
    const search = String(q).trim();

    if (workOrderId) filter.workOrderId = workOrderId;
    if (status !== "All" && MATERIAL_REQUEST_STATUSES.includes(status)) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { requestNumber: { $regex: search, $options: "i" } },
        { workOrderNumber: { $regex: search, $options: "i" } },
        { projectName: { $regex: search, $options: "i" } },
        { requestedByName: { $regex: search, $options: "i" } },
      ];
    }

    const query = MaterialRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("requestedBy", "name email role")
      .populate("approvedBy", "name email role");

    const pageParam = Number(req.query?.page);
    const pageSizeParam = Number(req.query?.pageSize);
    const usePagination = Number.isFinite(pageParam) && pageParam > 0;
    if (!usePagination) {
      const data = await query;
      return res.json(data);
    }

    const page = Math.max(1, Math.floor(pageParam));
    const pageSize = Math.min(100, Math.max(1, Math.floor(pageSizeParam || 20)));
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      MaterialRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate("requestedBy", "name email role")
        .populate("approvedBy", "name email role"),
      MaterialRequest.countDocuments(filter),
    ]);
    return res.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to list material requests" });
  }
}

async function getMaterialRequestById(req, res) {
  try {
    const doc = await MaterialRequest.findById(req.params.id)
      .populate("requestedBy", "name email role")
      .populate("approvedBy", "name email role");
    if (!doc) return res.status(404).json({ message: "Material request not found" });
    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch material request" });
  }
}

async function updateMaterialRequestStatus(req, res) {
  try {
    const doc = await MaterialRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Material request not found" });

    const nextStatus = String(req.body?.status ?? "").trim();
    if (!MATERIAL_REQUEST_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ message: `Invalid status. Allowed: ${MATERIAL_REQUEST_STATUSES.join(", ")}` });
    }

    const currentStatus = doc.status;

    if (nextStatus === "Rejected") {
      if (currentStatus !== "Pending") {
        return res.status(400).json({ message: `Cannot reject from status: ${currentStatus}` });
      }
      const rejectionReason = String(req.body?.rejectionReason ?? "").trim();
      if (!rejectionReason) {
        return res.status(400).json({ message: "rejectionReason is required when rejecting" });
      }
      doc.status = "Rejected";
      doc.rejectionReason = rejectionReason;
      doc.approvedBy = req.user._id;
      doc.approvedByName = actorName(req);
      doc.approvedAt = new Date();
      doc.activityTimeline.push(timelineEntry("Rejected", rejectionReason, req));
      await doc.save();
      return res.json(doc);
    }

    if (nextStatus === "Approved") {
      if (currentStatus !== "Pending") {
        return res.status(400).json({ message: `Only pending requests can be approved (current: ${currentStatus})` });
      }

      doc.approvedBy = req.user._id;
      doc.approvedByName = actorName(req);
      doc.approvedAt = new Date();
      doc.status = "Approved";
      doc.activityTimeline.push(
        timelineEntry("Manager Approval", "Request approved — running inventory check", req),
      );

      await runInventoryCheckAndFulfill(doc, req);
      await doc.save();
      return res.json(doc);
    }

    if (nextStatus === "Issued") {
      if (currentStatus !== "Procurement Needed") {
        return res.status(400).json({
          message: "Issue to work order is only available after procurement (Procurement Needed status)",
        });
      }

      const { allInStock, shortItems } = await snapshotInventory(doc);
      if (!allInStock) {
        return res.status(400).json({
          message: `Stock still insufficient for: ${shortItems.join(", ")}. Receive goods (GRN) and update inventory first.`,
        });
      }

      await deductStockForRequest(doc, req);
      doc.status = "Issued";
      doc.activityTimeline.push(
        timelineEntry(
          "Stock Updated + Issued to Work Order",
          `Materials issued to ${doc.workOrderNumber} after procurement`,
          req,
        ),
      );
      await doc.save();
      return res.json(doc);
    }

    return res.status(400).json({
      message:
        'Use status "Approved" (from Pending), "Rejected" (from Pending), or "Issued" (from Procurement Needed)',
    });
  } catch (error) {
    if (error.code === "INSUFFICIENT_STOCK" || error.code === "MATERIAL_NOT_FOUND") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message || "Failed to update material request status" });
  }
}

module.exports = {
  createMaterialRequest,
  listMaterialRequests,
  getMaterialRequestById,
  updateMaterialRequestStatus,
};
