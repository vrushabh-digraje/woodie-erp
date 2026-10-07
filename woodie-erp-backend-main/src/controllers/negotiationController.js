const { BoqQuotation } = require("../models/BoqQuotation");
const { Inquiry } = require("../models/Inquiry");
const { createWorkOrderFromQuotation } = require("../utils/workOrderFactory");
const { validateStatusTransition } = require("../utils/statusTransition");
const { validateMarkLost, validateNegotiation } = require("../validators/negotiationValidator");

function activity(action, note, createdBy = "System") {
  return { action, note, createdBy };
}

function actorName(req) {
  return req.user?.name || "System";
}

function assertSalesOwnership(doc, user) {
  if (user.role === "sales" && String(doc.createdBy) !== String(user._id)) {
    return "You can only update your own quotations";
  }
  return null;
}

async function syncInquiryStatus(inquiryId, status) {
  if (!inquiryId) return;
  await Inquiry.findByIdAndUpdate(inquiryId, { status });
}

async function loadQuotation(req) {
  const doc = await BoqQuotation.findById(req.params.id);
  if (!doc) {
    const error = new Error("Quotation not found");
    error.statusCode = 404;
    throw error;
  }
  return doc;
}

async function sendQuotation(req, res) {
  try {
    const doc = await loadQuotation(req);
    const ownershipError = assertSalesOwnership(doc, req.user);
    if (ownershipError) {
      return res.status(403).json({ success: false, message: ownershipError });
    }

    validateStatusTransition(doc.status, "Quotation Sent");

    doc.status = "Quotation Sent";
    doc.sentAt = new Date();
    doc.activityTimeline.unshift(
      activity("Quotation Sent", "Quotation sent to client", actorName(req)),
    );
    await doc.save();

    return res.json({
      success: true,
      data: doc,
      message: "Quotation marked as sent to client",
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.code === "INVALID_STATUS_TRANSITION") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send quotation",
    });
  }
}

async function markNegotiation(req, res) {
  try {
    const validationError = validateNegotiation(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const doc = await loadQuotation(req);
    const ownershipError = assertSalesOwnership(doc, req.user);
    if (ownershipError) {
      return res.status(403).json({ success: false, message: ownershipError });
    }

    validateStatusTransition(doc.status, "Negotiation");

    const clientFeedback = String(req.body?.clientFeedback ?? "").trim();
    doc.status = "Negotiation";
    if (clientFeedback) {
      doc.clientFeedback = clientFeedback;
    }
    doc.activityTimeline.unshift(
      activity(
        "Negotiation",
        clientFeedback || "Client entered negotiation",
        actorName(req),
      ),
    );
    await doc.save();

    return res.json({
      success: true,
      data: doc,
      message: "Quotation marked as under negotiation",
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.code === "INVALID_STATUS_TRANSITION") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to mark negotiation",
    });
  }
}

async function markWon(req, res) {
  try {
    const doc = await loadQuotation(req);
    const ownershipError = assertSalesOwnership(doc, req.user);
    if (ownershipError) {
      return res.status(403).json({ success: false, message: ownershipError });
    }

    validateStatusTransition(doc.status, "Won");

    doc.status = "Won";
    doc.wonAt = new Date();
    doc.activityTimeline.unshift(activity("Won", "Quotation won", actorName(req)));
    await doc.save();

    await syncInquiryStatus(doc.inquiryId, "Won");

    try {
      await createWorkOrderFromQuotation(doc._id, {
        createdBy: req.user._id,
        createdByName: actorName(req),
        autoCreated: true,
      });
    } catch (woError) {
      // Won is saved; work order can be created manually if auto-create fails.
      // eslint-disable-next-line no-console
      console.error("Auto work order creation failed:", woError.message);
    }

    return res.json({
      success: true,
      data: doc,
      message: "Quotation marked as won",
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.code === "INVALID_STATUS_TRANSITION") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to mark quotation as won",
    });
  }
}

async function markLost(req, res) {
  try {
    const validationError = validateMarkLost(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const doc = await loadQuotation(req);
    const ownershipError = assertSalesOwnership(doc, req.user);
    if (ownershipError) {
      return res.status(403).json({ success: false, message: ownershipError });
    }

    validateStatusTransition(doc.status, "Lost");

    const lossReason = String(req.body.lossReason).trim();
    doc.status = "Lost";
    doc.lostAt = new Date();
    doc.lossReason = lossReason;
    doc.activityTimeline.unshift(
      activity("Lost", lossReason, actorName(req)),
    );
    await doc.save();

    await syncInquiryStatus(doc.inquiryId, "Lost");

    return res.json({
      success: true,
      data: doc,
      message: "Quotation marked as lost",
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.code === "INVALID_STATUS_TRANSITION") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to mark quotation as lost",
    });
  }
}

module.exports = {
  sendQuotation,
  markNegotiation,
  markWon,
  markLost,
};
