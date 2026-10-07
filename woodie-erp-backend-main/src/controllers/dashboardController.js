const { Inquiry } = require("../models/Inquiry");
const { BoqQuotation } = require("../models/BoqQuotation");
const { Invoice } = require("../models/Invoice");
const { WorkOrder } = require("../models/WorkOrder");
const { FIELD_ROLES } = require("../config/rbac");
const { AWAITING_STATUSES } = require("../utils/invoiceHelpers");

const INACTIVE_WORK_ORDER_STATUSES = ["Completed", "Cancelled", "Handed Over"];

const LOCATION_OPTIONS = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"];

function startOfMonth(ref = new Date()) {
  return new Date(ref.getFullYear(), ref.getMonth(), 1);
}

function startOfYear(ref = new Date()) {
  return new Date(ref.getFullYear(), 0, 1);
}

function parseDashboardFilters(query = {}) {
  const periodRaw = String(query.period || "year").toLowerCase();
  const period = ["month", "year", "all"].includes(periodRaw) ? periodRaw : "year";
  const locationRaw = String(query.location || "all").trim();
  const location =
    !locationRaw || locationRaw.toLowerCase() === "all"
      ? "all"
      : LOCATION_OPTIONS.find((l) => l.toLowerCase() === locationRaw.toLowerCase()) || locationRaw;

  let since = null;
  if (period === "month") since = startOfMonth();
  else if (period === "year") since = startOfYear();

  return { period, location, since };
}

function locationRegex(location) {
  if (!location || location === "all") return null;
  const escaped = location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
}

function withCreatedSince(filter, since) {
  if (!since) return filter;
  return { ...filter, createdAt: { ...(filter.createdAt || {}), $gte: since } };
}

function withAddressMatch(filter, field, location) {
  const rx = locationRegex(location);
  if (!rx) return filter;
  return { ...filter, [field]: { $regex: rx } };
}

async function resolveLocationWorkOrderIds(location) {
  if (!location || location === "all") return null;
  const bySiteFilter = withAddressMatch({}, "siteAddress", location);
  const inquiryFilter = withAddressMatch({}, "fullAddress", location);
  const [bySite, inquiries] = await Promise.all([
    WorkOrder.find(bySiteFilter).select("_id").lean(),
    Inquiry.find(inquiryFilter).select("_id").lean(),
  ]);
  const inquiryIds = inquiries.map((i) => i._id);
  const byInquiry =
    inquiryIds.length > 0
      ? await WorkOrder.find({ inquiryId: { $in: inquiryIds } }).select("_id").lean()
      : [];
  return [...bySite, ...byInquiry].map((r) => r._id);
}

async function buildMonthlyTrend(since, location, workOrderIds) {
  const months = 6;
  const now = new Date();
  const buckets = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    if (since && end <= since) continue;
    const rangeStart = since && start < since ? since : start;
    buckets.push({
      month: start.toLocaleString("en", { month: "short" }),
      start: rangeStart,
      end,
    });
  }

  const trend = [];
  for (const b of buckets) {
    const inquiryFilter = withAddressMatch(
      { createdAt: { $gte: b.start, $lt: b.end } },
      "fullAddress",
      location,
    );
    let woFilter = { createdAt: { $gte: b.start, $lt: b.end } };
    if (workOrderIds) {
      woFilter = { ...woFilter, _id: { $in: workOrderIds } };
    } else {
      woFilter = withAddressMatch(woFilter, "siteAddress", location);
    }

    const [inquiries, workOrders] = await Promise.all([
      Inquiry.countDocuments(inquiryFilter),
      WorkOrder.countDocuments(woFilter),
    ]);
    trend.push({ month: b.month, inquiries, workOrders });
  }
  return trend;
}

async function loadFinanceSummary(extraInvoiceFilter = {}) {
  const base = { ...extraInvoiceFilter };
  const [awaitingPayment, escalated, outstandingAgg] = await Promise.all([
    Invoice.countDocuments({
      ...base,
      status: { $in: AWAITING_STATUSES },
      outstandingBalance: { $gt: 0 },
    }),
    Invoice.countDocuments({ ...base, status: "Escalated" }),
    Invoice.aggregate([
      {
        $match: {
          ...base,
          outstandingBalance: { $gt: 0 },
          status: { $ne: "Cancelled" },
        },
      },
      { $group: { _id: null, total: { $sum: "$outstandingBalance" } } },
    ]),
  ]);
  return {
    awaitingPayment,
    escalatedInvoices: escalated,
    totalOutstanding: outstandingAgg[0]?.total ?? 0,
  };
}

async function adminStats(_req, res) {
  const [total, byStatus, pendingApproval, visitApproved, visitRejected, readyForBoq, boqByStatus] =
    await Promise.all([
      Inquiry.countDocuments(),
      Inquiry.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Inquiry.countDocuments({ status: "Visit Pending Approval" }),
      Inquiry.countDocuments({ status: "Visit Approved" }),
      Inquiry.countDocuments({ status: "Visit Rejected" }),
      Inquiry.countDocuments({ status: "Site Report Attached" }),
      BoqQuotation.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

  const statusMap = Object.fromEntries(byStatus.map((row) => [row._id, row.count]));
  const boqMap = Object.fromEntries(boqByStatus.map((row) => [row._id, row.count]));
  const finance = await loadFinanceSummary();

  return res.json({
    role: "admin",
    finance,
    totalInquiries: total,
    pendingApproval,
    visitApproved,
    visitRejected,
    reportsAttached: readyForBoq,
    readyForBoq,
    inquiryByStatus: statusMap,
    boqByStatus: boqMap,
    boqTotal: Object.values(boqMap).reduce((sum, n) => sum + n, 0),
    pendingBoqApproval: boqMap["Pending Approval"] ?? 0,
  });
}

async function salesStats(_req, res) {
  const [total, byStatus, boqByStatus] = await Promise.all([
    Inquiry.countDocuments(),
    Inquiry.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    BoqQuotation.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const inquiryMap = Object.fromEntries(byStatus.map((row) => [row._id, row.count]));
  const boqMap = Object.fromEntries(boqByStatus.map((row) => [row._id, row.count]));
  const finance = await loadFinanceSummary();

  return res.json({
    role: "sales",
    finance,
    totalInquiries: total,
    pendingApproval: inquiryMap["Visit Pending Approval"] ?? 0,
    visitApproved: inquiryMap["Visit Approved"] ?? 0,
    visitRejected: inquiryMap["Visit Rejected"] ?? 0,
    reportsAttached: inquiryMap["Site Report Attached"] ?? 0,
    inquiryByStatus: inquiryMap,
    boqByStatus: boqMap,
    boqTotal: Object.values(boqMap).reduce((sum, n) => sum + n, 0),
  });
}

async function fieldStats(req, res) {
  const memberId = req.user._id;
  const filter = { assignedPersonId: memberId };

  const [assigned, pendingApproval, inProgress, completed, rejected] = await Promise.all([
    Inquiry.countDocuments({
      ...filter,
      status: { $in: ["Visit Pending Approval", "Visit Approved", "Site Report Attached"] },
    }),
    Inquiry.countDocuments({ ...filter, status: "Visit Pending Approval" }),
    Inquiry.countDocuments({ ...filter, status: "Visit Approved" }),
    Inquiry.countDocuments({ ...filter, status: "Site Report Attached" }),
    Inquiry.countDocuments({ ...filter, status: "Visit Rejected" }),
  ]);

  return res.json({
    role: "site_engineer",
    assignedVisits: assigned,
    pendingApproval,
    pendingExecution: inProgress,
    reportsSubmitted: completed,
    visitRejected: rejected,
  });
}

async function managerStats(_req, res) {
  const [pending, approved, rejected, inProgress, boqByStatus, inquiryByStatus] = await Promise.all([
    BoqQuotation.countDocuments({ status: "Pending Approval" }),
    BoqQuotation.countDocuments({ status: "Approved" }),
    BoqQuotation.countDocuments({ status: "Rejected" }),
    BoqQuotation.countDocuments({
      status: { $in: ["BOQ In Progress", "Quotation Draft", "Revision Requested", "Rejected"] },
    }),
    BoqQuotation.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Inquiry.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const boqMap = Object.fromEntries(boqByStatus.map((row) => [row._id, row.count]));
  const inquiryMap = Object.fromEntries(inquiryByStatus.map((row) => [row._id, row.count]));
  const finance = await loadFinanceSummary();

  return res.json({
    role: "manager",
    finance,
    pendingApproval: pending,
    approved,
    rejected,
    boqInProgress: inProgress,
    boqByStatus: boqMap,
    inquiryByStatus: inquiryMap,
    visitRejected: inquiryMap["Visit Rejected"] ?? 0,
  });
}

async function buildOfficeDashboardPayload(roleKey, filters) {
  const { location, since } = filters;
  const workOrderIds = await resolveLocationWorkOrderIds(location);

  let inquiryFilter = withCreatedSince({}, since);
  inquiryFilter = withAddressMatch(inquiryFilter, "fullAddress", location);

  let woActiveFilter = { status: { $nin: INACTIVE_WORK_ORDER_STATUSES } };
  if (workOrderIds) {
    woActiveFilter = { ...woActiveFilter, _id: { $in: workOrderIds } };
  } else {
    woActiveFilter = withAddressMatch(woActiveFilter, "siteAddress", location);
  }

  let invoiceFilter = withCreatedSince({}, since);
  if (workOrderIds) {
    invoiceFilter = { ...invoiceFilter, workOrderId: { $in: workOrderIds } };
  } else if (location && location !== "all") {
    invoiceFilter = {
      ...invoiceFilter,
      workOrderId: { $in: workOrderIds && workOrderIds.length ? workOrderIds : [] },
    };
  }

  const [
    totalInquiries,
    activeWorkOrders,
    outstandingAgg,
    escalatedInvoices,
    inquiryByStatus,
    invoiceStatusBreakdown,
    recentActivity,
    monthlyTrend,
  ] = await Promise.all([
    Inquiry.countDocuments(inquiryFilter),
    WorkOrder.countDocuments(woActiveFilter),
    Invoice.aggregate([
      {
        $match: {
          ...invoiceFilter,
          status: { $nin: ["Paid", "Cancelled"] },
          outstandingBalance: { $gt: 0 },
        },
      },
      { $group: { _id: null, total: { $sum: "$outstandingBalance" } } },
    ]),
    Invoice.countDocuments({ ...invoiceFilter, status: "Escalated" }),
    Inquiry.aggregate([
      { $match: inquiryFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Invoice.aggregate([
      { $match: { ...invoiceFilter, status: { $ne: "Cancelled" } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    getRecentActivity(5),
    buildMonthlyTrend(since, location, workOrderIds),
  ]);

  const inquiryPipeline = Object.fromEntries(
    inquiryByStatus.map((row) => [row._id, row.count]),
  );

  return {
    role: roleKey,
    filters: {
      period: filters.period,
      location: filters.location,
      locations: LOCATION_OPTIONS,
    },
    totalInquiries,
    activeWorkOrders,
    outstandingInvoicesAmount: outstandingAgg[0]?.total ?? 0,
    escalatedInvoices,
    inquiryPipeline,
    invoiceStatusBreakdown: invoiceStatusBreakdown.map((row) => ({
      status: row._id,
      count: row.count,
    })),
    monthlyTrend,
    recentActivity,
  };
}

async function getDashboardStats(req, res) {
  try {
    const role = req.user?.role ?? "admin";
    const filters = parseDashboardFilters(req.query);

    if (role === "admin" || role === "manager" || role === "procurement" || role === "accounts") {
      const roleKey = role === "admin" ? "admin" : "manager";
      return res.json(await buildOfficeDashboardPayload(roleKey, filters));
    }

    if (role === "sales") {
      const userId = req.user._id;
      const monthStart = startOfMonth();
      let inquiryMatch = withCreatedSince({ createdBy: userId }, filters.since);
      inquiryMatch = withAddressMatch(inquiryMatch, "fullAddress", filters.location);

      const [myInquiryRows, myBoqRows, pendingApprovals, wonThisMonth, recentActivity, monthlyTrend] =
        await Promise.all([
          Inquiry.aggregate([
            { $match: inquiryMatch },
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ]),
          BoqQuotation.aggregate([
            {
              $match: withCreatedSince({ createdBy: userId }, filters.since),
            },
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ]),
          BoqQuotation.countDocuments({
            createdBy: userId,
            status: "Pending Approval",
            ...(filters.since ? { createdAt: { $gte: filters.since } } : {}),
          }),
          Inquiry.countDocuments({
            ...inquiryMatch,
            status: "Won",
            updatedAt: { $gte: monthStart },
          }),
          getRecentActivity(5),
          buildMonthlyTrend(filters.since, filters.location, null),
        ]);

      const myInquiriesByStatus = Object.fromEntries(
        myInquiryRows.map((row) => [row._id, row.count]),
      );
      const myQuotationsByStatus = Object.fromEntries(
        myBoqRows.map((row) => [row._id, row.count]),
      );

      return res.json({
        role: "sales",
        filters: {
          period: filters.period,
          location: filters.location,
          locations: LOCATION_OPTIONS,
        },
        myInquiriesByStatus,
        myQuotationsByStatus,
        pendingApprovals,
        wonThisMonth,
        monthlyTrend,
        recentActivity,
      });
    }

    if (FIELD_ROLES.includes(role)) {
      const memberId = req.user._id;
      const monthStart = startOfMonth();
      let visitBase = withCreatedSince({ assignedPersonId: memberId }, filters.since);
      visitBase = withAddressMatch(visitBase, "fullAddress", filters.location);

      const [pendingVisits, approvedVisits, completedVisits, myActiveWorkOrders, completedThisMonth, recentActivity] =
        await Promise.all([
          Inquiry.countDocuments({
            ...visitBase,
            status: "Visit Pending Approval",
          }),
          Inquiry.countDocuments({
            ...visitBase,
            status: "Visit Approved",
          }),
          Inquiry.countDocuments({
            ...visitBase,
            status: "Site Report Attached",
          }),
          WorkOrder.countDocuments({
            "assignedTeam.memberId": memberId,
            status: "In Progress",
            ...(filters.since ? { createdAt: { $gte: filters.since } } : {}),
            ...(locationRegex(filters.location)
              ? { siteAddress: { $regex: locationRegex(filters.location) } }
              : {}),
          }),
          WorkOrder.countDocuments({
            "assignedTeam.memberId": memberId,
            status: "Completed",
            updatedAt: { $gte: monthStart },
          }),
          getRecentActivity(5),
        ]);

      const openSnagRows = await WorkOrder.aggregate([
        { $match: { "assignedTeam.memberId": memberId } },
        { $unwind: "$snags" },
        { $match: { "snags.status": "open" } },
        { $count: "count" },
      ]);

      return res.json({
        role: "field",
        filters: {
          period: filters.period,
          location: filters.location,
          locations: LOCATION_OPTIONS,
        },
        myVisits: {
          pending: pendingVisits,
          approved: approvedVisits,
          completed: completedVisits,
        },
        myActiveWorkOrders,
        myOpenSnags: openSnagRows[0]?.count ?? 0,
        completedThisMonth,
        recentActivity,
      });
    }

    return res.json(await buildOfficeDashboardPayload("admin", filters));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load dashboard stats" });
  }
}

function pushTimelineEntries(items, source, docs) {
  for (const doc of docs) {
    for (const entry of doc.activityTimeline || []) {
      if (!entry?.createdAt) continue;
      items.push({
        source,
        action: entry.action ?? "Updated",
        note: entry.note ?? "",
        createdAt: entry.createdAt,
        createdBy: entry.createdBy ?? "System",
      });
    }
  }
}

async function getRecentActivity(limit = 5) {
  const perSource = Math.max(limit, 12);
  const [inquiries, workOrders, invoices] = await Promise.all([
    Inquiry.find({ "activityTimeline.0": { $exists: true } })
      .sort({ updatedAt: -1 })
      .limit(perSource)
      .select("activityTimeline")
      .lean(),
    WorkOrder.find({ "activityTimeline.0": { $exists: true } })
      .sort({ updatedAt: -1 })
      .limit(perSource)
      .select("activityTimeline")
      .lean(),
    Invoice.find({ "activityTimeline.0": { $exists: true } })
      .sort({ updatedAt: -1 })
      .limit(perSource)
      .select("activityTimeline")
      .lean(),
  ]);

  const items = [];
  pushTimelineEntries(items, "inquiry", inquiries);
  pushTimelineEntries(items, "workorder", workOrders);
  pushTimelineEntries(items, "invoice", invoices);

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return items.slice(0, limit);
}

module.exports = {
  adminStats,
  salesStats,
  fieldStats,
  managerStats,
  getDashboardStats,
};
