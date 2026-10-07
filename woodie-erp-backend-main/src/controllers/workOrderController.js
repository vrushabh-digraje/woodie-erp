const path = require("path");
const fs = require("fs");
const { WorkOrder, WORK_ORDER_STATUSES } = require("../models/WorkOrder");
const { TeamMember } = require("../models/TeamMember");
const { isFieldRole } = require("../config/rbac");
const {
  assertWorkOrderReadAccess,
  assertWorkOrderManageAccess,
  assertWorkOrderFieldWriteAccess,
  openSnagCount,
} = require("../middleware/workOrderAccess");
const { validateWorkOrderStatusTransition } = require("../utils/workOrderStatusTransition");
const { formatCount } = require("../utils/formatCount");
const {
  createWorkOrderFromQuotation,
  parseOptionalDate,
  activity,
} = require("../utils/workOrderFactory");

const LOCKED_STATUSES = ["Completed", "Handed Over", "Cancelled"];

function actorName(req) {
  return req.user?.name || "System";
}

async function loadWorkOrder(req, res) {
  const doc = await WorkOrder.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ message: "Work order not found" });
    return null;
  }
  const accessError = assertWorkOrderReadAccess(doc, req.user);
  if (accessError) {
    res.status(403).json({ message: accessError });
    return null;
  }
  return doc;
}

async function createWorkOrder(req, res) {
  try {
    const quotationId = req.body?.quotationId;
    if (!quotationId) {
      return res.status(400).json({ message: "quotationId is required" });
    }

    const { doc, created } = await createWorkOrderFromQuotation(quotationId, {
      scheduledStart: req.body.scheduledStart,
      targetCompletion: req.body.targetCompletion,
      notes: req.body.notes,
      createdBy: req.user._id,
      createdByName: actorName(req),
    });

    if (!created) {
      return res.status(400).json({ message: "Work order already exists for this quotation" });
    }

    return res.status(201).json(doc);
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ message: error.message });
    if (error.statusCode === 400) return res.status(400).json({ message: error.message });
    if (error.code === 11000) {
      return res.status(400).json({ message: "Work order already exists for this quotation" });
    }
    return res.status(500).json({ message: error.message || "Failed to create work order" });
  }
}

async function listWorkOrders(req, res) {
  try {
    const { q = "", status = "All", quotationId } = req.query;
    const search = String(q).trim();
    const filter = {};

    if (isFieldRole(req.user.role)) {
      filter["assignedTeam.memberId"] = req.user._id;
    }

    if (status !== "All" && WORK_ORDER_STATUSES.includes(status)) {
      filter.status = status;
    }

    if (quotationId) {
      filter.quotationId = quotationId;
    }

    if (search) {
      filter.$or = [
        { workOrderNumber: { $regex: search, $options: "i" } },
        { projectName: { $regex: search, $options: "i" } },
        { clientName: { $regex: search, $options: "i" } },
      ];
    }

    const pageParam = Number(req.query?.page);
    const pageSizeParam = Number(req.query?.pageSize);
    const usePagination = Number.isFinite(pageParam) && pageParam > 0;
    if (!usePagination) {
      const data = await WorkOrder.find(filter).sort({ updatedAt: -1 });
      return res.json(data);
    }

    const page = Math.max(1, Math.floor(pageParam));
    const pageSize = Math.min(100, Math.max(1, Math.floor(pageSizeParam || 20)));
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      WorkOrder.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(pageSize),
      WorkOrder.countDocuments(filter),
    ]);
    return res.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to list work orders" });
  }
}

async function getWorkOrderById(req, res) {
  try {
    const doc = await loadWorkOrder(req, res);
    if (!doc) return undefined;
    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch work order" });
  }
}

async function updateWorkOrderStatus(req, res) {
  try {
    const manageError = assertWorkOrderManageAccess(req.user);
    if (manageError) return res.status(403).json({ message: manageError });

    const doc = await loadWorkOrder(req, res);
    if (!doc) return undefined;

    const nextStatus = req.body?.status;
    if (!nextStatus) {
      return res.status(400).json({ message: "status is required" });
    }

    if (nextStatus === "Completed" && openSnagCount(doc) > 0) {
      return res.status(400).json({ message: "Resolve all open snags before completing the project" });
    }

    try {
      validateWorkOrderStatusTransition(doc.status, nextStatus);
    } catch (err) {
      if (err.code === "INVALID_STATUS_TRANSITION" || err.code === "INVALID_STATUS") {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }

    const actor = actorName(req);
    doc.status = nextStatus;
    if (nextStatus === "Handed Over") {
      doc.handedOverAt = new Date();
    }
    doc.activityTimeline.unshift(
      activity("Status Updated", `Status changed to ${nextStatus}`, actor),
    );
    await doc.save();

    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update status" });
  }
}

async function startExecution(req, res) {
  try {
    const manageError = assertWorkOrderManageAccess(req.user);
    if (manageError) return res.status(403).json({ message: manageError });

    const doc = await loadWorkOrder(req, res);
    if (!doc) return undefined;

    if (doc.assignedTeam.length === 0) {
      return res.status(400).json({ message: "Assign a project team before starting execution" });
    }

    if (doc.status !== "Scheduled" && doc.status !== "On Hold") {
      return res.status(400).json({ message: "Execution can only start from Scheduled or On Hold" });
    }

    const actor = actorName(req);
    doc.status = "In Progress";
    doc.executionStartedAt = doc.executionStartedAt || new Date();
    doc.activityTimeline.unshift(activity("Execution Started", "Project execution started", actor));
    await doc.save();

    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to start execution" });
  }
}

async function completeProject(req, res) {
  try {
    const manageError = assertWorkOrderManageAccess(req.user);
    if (manageError) return res.status(403).json({ message: manageError });

    const doc = await loadWorkOrder(req, res);
    if (!doc) return undefined;

    if (openSnagCount(doc) > 0) {
      return res.status(400).json({ message: "Resolve all open snags before completing the project" });
    }

    try {
      validateWorkOrderStatusTransition(doc.status, "Completed");
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    const actor = actorName(req);
    doc.status = "Completed";
    doc.activityTimeline.unshift(activity("Project Completed", "Work marked complete", actor));
    await doc.save();

    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to complete project" });
  }
}

async function clientHandover(req, res) {
  try {
    const manageError = assertWorkOrderManageAccess(req.user);
    if (manageError) return res.status(403).json({ message: manageError });

    const doc = await loadWorkOrder(req, res);
    if (!doc) return undefined;

    try {
      validateWorkOrderStatusTransition(doc.status, "Handed Over");
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    const actor = actorName(req);
    doc.status = "Handed Over";
    doc.handedOverAt = new Date();
    doc.activityTimeline.unshift(activity("Client Handover", "Project handed over to client", actor));
    await doc.save();

    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to record handover" });
  }
}

async function assignTeam(req, res) {
  try {
    const manageError = assertWorkOrderManageAccess(req.user);
    if (manageError) return res.status(403).json({ message: manageError });

    const doc = await loadWorkOrder(req, res);
    if (!doc) return undefined;

    if (LOCKED_STATUSES.includes(doc.status)) {
      return res.status(400).json({ message: "Cannot change team on a closed work order" });
    }

    const memberIds = req.body?.memberIds;
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: "memberIds must be a non-empty array" });
    }

    const members = await TeamMember.find({
      _id: { $in: memberIds },
      status: "Active",
    });

    if (members.length === 0) {
      return res.status(400).json({ message: "No active team members found for the given ids" });
    }

    doc.assignedTeam = members.map((m) => ({
      memberId: m._id,
      name: m.name,
      role: m.role,
      phone: m.phone || "",
    }));

    const names = members.map((m) => m.name).join(", ");
    doc.activityTimeline.unshift(activity("Team Assigned", names, actorName(req)));
    await doc.save();

    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to assign team" });
  }
}

async function updateWorkOrder(req, res) {
  try {
    const manageError = assertWorkOrderManageAccess(req.user);
    if (manageError) return res.status(403).json({ message: manageError });

    const doc = await loadWorkOrder(req, res);
    if (!doc) return undefined;

    if (LOCKED_STATUSES.includes(doc.status)) {
      return res.status(400).json({ message: "Cannot edit a closed work order" });
    }

    const { scheduledStart, targetCompletion, notes, projectName } = req.body ?? {};

    if (scheduledStart !== undefined) {
      doc.scheduledStart = parseOptionalDate(scheduledStart);
    }
    if (targetCompletion !== undefined) {
      doc.targetCompletion = parseOptionalDate(targetCompletion);
    }
    if (notes !== undefined) {
      doc.notes = String(notes).trim();
    }
    if (projectName !== undefined) {
      const trimmed = String(projectName).trim();
      if (!trimmed) {
        return res.status(400).json({ message: "projectName cannot be empty" });
      }
      doc.projectName = trimmed;
    }
    doc.activityTimeline.unshift(activity("Work Order Updated", "Details updated", actorName(req)));

    await doc.save();

    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update work order" });
  }
}

async function addProgressLog(req, res) {
  try {
    const doc = await loadWorkOrder(req, res);
    if (!doc) return undefined;

    const writeError = assertWorkOrderFieldWriteAccess(doc, req.user);
    if (writeError) return res.status(403).json({ message: writeError });

    if (LOCKED_STATUSES.includes(doc.status)) {
      return res.status(400).json({ message: "Cannot add logs to a closed work order" });
    }

    const note = String(req.body?.note ?? "").trim();
    if (!note) {
      return res.status(400).json({ message: "note is required" });
    }

    const logDate = parseOptionalDate(req.body?.logDate) || new Date();
    const actor = actorName(req);

    doc.progressLogs.unshift({
      logDate,
      note,
      createdBy: actor,
      createdAt: new Date(),
    });
    doc.activityTimeline.unshift(activity("Progress Log", note.slice(0, 120), actor));
    await doc.save();

    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to add progress log" });
  }
}

async function uploadSitePhotos(req, res) {
  try {
    const doc = await loadWorkOrder(req, res);
    if (!doc) return undefined;

    const writeError = assertWorkOrderFieldWriteAccess(doc, req.user);
    if (writeError) return res.status(403).json({ message: writeError });

    if (LOCKED_STATUSES.includes(doc.status)) {
      return res.status(400).json({ message: "Cannot upload photos to a closed work order" });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const actor = actorName(req);
    const caption = String(req.body?.caption ?? "").trim();
    const uploadedAt = new Date();
    const idStr = String(doc._id);

    for (const file of files) {
      doc.sitePhotos.unshift({
        url: `/uploads/work-order/${idStr}/${file.filename}`,
        caption,
        uploadedBy: actor,
        uploadedAt,
      });
    }

    doc.activityTimeline.unshift(
      activity("Site Photos", `${formatCount(files.length, "photo", "photos")} uploaded`, actor),
    );
    await doc.save();

    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to upload photos" });
  }
}

async function addSnag(req, res) {
  try {
    const doc = await loadWorkOrder(req, res);
    if (!doc) return undefined;

    const writeError = assertWorkOrderFieldWriteAccess(doc, req.user);
    if (writeError) return res.status(403).json({ message: writeError });

    if (LOCKED_STATUSES.includes(doc.status)) {
      return res.status(400).json({ message: "Cannot add snags to a closed work order" });
    }

    const description = String(req.body?.description ?? "").trim();
    if (description.length < 3) {
      return res.status(400).json({ message: "description is required (min 3 characters)" });
    }

    const actor = actorName(req);
    doc.snags.unshift({
      description,
      status: "open",
      reportedBy: actor,
      reportedAt: new Date(),
    });

    if (doc.status === "In Progress") {
      doc.status = "Snagging";
    }

    doc.activityTimeline.unshift(activity("Snag Reported", description.slice(0, 120), actor));
    await doc.save();

    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to report snag" });
  }
}

async function resolveSnag(req, res) {
  try {
    const doc = await loadWorkOrder(req, res);
    if (!doc) return undefined;

    const writeError = assertWorkOrderFieldWriteAccess(doc, req.user);
    if (writeError) return res.status(403).json({ message: writeError });

    const snag = doc.snags.id(req.params.snagId);
    if (!snag) {
      return res.status(404).json({ message: "Snag not found" });
    }
    if (snag.status === "resolved") {
      return res.status(400).json({ message: "Snag is already resolved" });
    }

    const actor = actorName(req);
    snag.status = "resolved";
    snag.resolvedBy = actor;
    snag.resolvedAt = new Date();
    snag.resolutionNote = String(req.body?.resolutionNote ?? "").trim();

    if (doc.status === "Snagging" && openSnagCount(doc) === 0) {
      doc.status = "In Progress";
    }

    doc.activityTimeline.unshift(
      activity("Snag Resolved", snag.description.slice(0, 120), actor),
    );
    await doc.save();

    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to resolve snag" });
  }
}

const WO_DELETABLE_STATUSES = ["Scheduled", "On Hold", "Cancelled"];

async function deleteWorkOrder(req, res) {
  try {
    const manageError = assertWorkOrderManageAccess(req.user);
    if (manageError) return res.status(403).json({ message: manageError });

    const doc = await WorkOrder.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Work order not found" });

    if (!WO_DELETABLE_STATUSES.includes(doc.status)) {
      return res.status(400).json({
        message: `Cannot delete work order while status is "${doc.status}"`,
      });
    }

    const hasActivity =
      (doc.progressLogs?.length ?? 0) > 0 ||
      (doc.sitePhotos?.length ?? 0) > 0 ||
      (doc.snags?.length ?? 0) > 0 ||
      Boolean(doc.executionStartedAt);

    if (hasActivity) {
      return res.status(400).json({
        message:
          "Cannot delete: team has already started work (logs, photos, snags, or execution started).",
      });
    }

    const uploadDir = path.join(__dirname, "../../uploads/work-order", String(doc._id));
    await WorkOrder.findByIdAndDelete(doc._id);
    fs.rm(uploadDir, { recursive: true, force: true }, () => {});

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to delete work order" });
  }
}

module.exports = {
  createWorkOrder,
  listWorkOrders,
  getWorkOrderById,
  deleteWorkOrder,
  updateWorkOrderStatus,
  startExecution,
  completeProject,
  clientHandover,
  assignTeam,
  updateWorkOrder,
  addProgressLog,
  uploadSitePhotos,
  addSnag,
  resolveSnag,
};
