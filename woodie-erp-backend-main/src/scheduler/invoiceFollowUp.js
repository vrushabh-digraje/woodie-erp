const cron = require("node-cron");
const { Invoice } = require("../models/Invoice");
const { timelineEntrySystem, startOfToday, MAX_FOLLOW_UPS } = require("../utils/invoiceHelpers");

async function runInvoiceFollowUpJob() {
  const today = startOfToday();
  const candidates = await Invoice.find({
    status: "Awaiting Payment",
    dueDate: { $lt: today },
    followUpCount: { $lt: MAX_FOLLOW_UPS },
    outstandingBalance: { $gt: 0 },
  });

  let processed = 0;
  let escalated = 0;

  for (const doc of candidates) {
    doc.followUpCount += 1;
    doc.activityTimeline.push(
      timelineEntrySystem(
        "Follow-up reminder sent",
        `Reminder ${doc.followUpCount}/${MAX_FOLLOW_UPS} for overdue invoice ${doc.invoiceNumber}`,
      ),
    );

    if (doc.followUpCount >= MAX_FOLLOW_UPS) {
      doc.status = "Escalated";
      doc.escalatedAt = new Date();
      doc.activityTimeline.push(
        timelineEntrySystem("Escalated", "Auto-escalated after 3 follow-up reminders"),
      );
      escalated += 1;
    }

    await doc.save();
    processed += 1;
  }

  // eslint-disable-next-line no-console
  console.log(
    `[invoice-follow-up] ${new Date().toISOString()} — checked ${candidates.length}, processed ${processed}, escalated ${escalated}`,
  );

  return { checked: candidates.length, processed, escalated };
}

function startInvoiceFollowUpScheduler() {
  cron.schedule("0 9 * * *", () => {
    void runInvoiceFollowUpJob().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[invoice-follow-up] error", err.message);
    });
  });
  // eslint-disable-next-line no-console
  console.log("[invoice-follow-up] scheduled daily at 09:00");
}

module.exports = { runInvoiceFollowUpJob, startInvoiceFollowUpScheduler };
