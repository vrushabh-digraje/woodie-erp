const { Invoice } = require("../models/Invoice");
const { timelineEntrySystem, AWAITING_STATUSES } = require("../utils/invoiceHelpers");

const MAX_FOLLOW_UPS = 3;
const FOLLOW_UP_INTERVAL_MS = 24 * 60 * 60 * 1000;

function canSendFollowUp(invoice) {
  if (!AWAITING_STATUSES.includes(invoice.status) && invoice.status !== "Escalated") return false;
  if (invoice.outstandingBalance <= 0) return false;
  if (invoice.followUpCount >= MAX_FOLLOW_UPS) return false;
  if (invoice.status === "Escalated") return false;
  if (!invoice.sentAt) return false;
  if (!invoice.lastFollowUpAt) return true;
  return Date.now() - new Date(invoice.lastFollowUpAt).getTime() >= FOLLOW_UP_INTERVAL_MS;
}

async function processInvoiceFollowUps() {
  const candidates = await Invoice.find({
    status: { $in: [...AWAITING_STATUSES, "Escalated"] },
    outstandingBalance: { $gt: 0 },
    sentAt: { $ne: null },
  });

  let followUps = 0;
  let escalations = 0;

  for (const doc of candidates) {
    if (doc.status === "Escalated") continue;

    if (doc.followUpCount >= MAX_FOLLOW_UPS) {
      doc.status = "Escalated";
      doc.escalatedAt = doc.escalatedAt || new Date();
      doc.activityTimeline.push(
        timelineEntrySystem(
          "Escalated to Manager",
          "Maximum 3 auto follow-ups completed with no payment.",
        ),
      );
      await doc.save();
      escalations += 1;
      continue;
    }

    if (!canSendFollowUp(doc)) continue;

    const day = doc.followUpCount + 1;
    doc.followUpCount = day;
    doc.lastFollowUpAt = new Date();
    doc.activityTimeline.push(
      timelineEntrySystem(
        `Auto Follow-up (Day ${day})`,
        `Payment reminder sent for ${doc.invoiceNumber} (outstanding AED ${doc.outstandingBalance.toFixed(2)}).`,
      ),
    );

    if (doc.followUpCount >= MAX_FOLLOW_UPS) {
      doc.status = "Escalated";
      doc.escalatedAt = new Date();
      doc.activityTimeline.push(
        timelineEntrySystem(
          "Escalated to Manager",
          "No payment after 3 follow-ups — manager action required.",
        ),
      );
      escalations += 1;
    }

    await doc.save();
    followUps += 1;
  }

  return { followUps, escalations, checked: candidates.length };
}

function startInvoiceScheduler(intervalMs = 60 * 60 * 1000) {
  const run = async () => {
    try {
      const result = await processInvoiceFollowUps();
      if (result.followUps > 0 || result.escalations > 0) {
        // eslint-disable-next-line no-console
        console.log("[invoice-scheduler]", result);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[invoice-scheduler] error", err.message);
    }
  };

  void run();
  return setInterval(run, intervalMs);
}

module.exports = { processInvoiceFollowUps, startInvoiceScheduler, MAX_FOLLOW_UPS };
