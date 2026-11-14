const { Inquiry } = require("../models/Inquiry");
const { BoqQuotation } = require("../models/BoqQuotation");
const { Invoice } = require("../models/Invoice");
const { WorkOrder } = require("../models/WorkOrder");
const { FIELD_ROLES, COMPANIES, isMasterAdmin } = require("../config/rbac");
const { AWAITING_STATUSES } = require("../utils/invoiceHelpers");
const { buildTenantFilter } = require("../middleware/tenantIsolation");

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

async function resolveLocationWorkOrderIds(location, req) {
  if (!location || location === "all") return null;
  let bySiteFilter = withAddressMatch({}, "siteAddress", location);
  let inquiryFilter = withAddressMatch({}, "fullAddress", location);
  if (req) {
    bySiteFilter = buildTenantFilter(req, bySiteFilter);
    inquiryFilter = buildTenantFilter(req, inquiryFilter);
  }
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

async function buildMonthlyTrend(since, location, workOrderIds, req) {
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
    let inquiryFilter = withAddressMatch(
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
    if (req) {
      inquiryFilter = buildTenantFilter(req, inquiryFilter);
      woFilter = buildTenantFilter(req, woFilter);
    }

    const [inquiries, workOrders] = await Promise.all([
      Inquiry.countDocuments(inquiryFilter),
      WorkOrder.countDocuments(woFilter),
    ]);

    trend.push({
      month: b.month,
      inquiries,
      workOrders,
    });
  }

  return trend;
}

async function loadFinanceSummary(req) {
  let baseFilter = {};
  if (req) baseFilter = buildTenantFilter(req);

  const [awaitingAgg, unallocatedAgg, escalatedCount] = await Promise.all([
    Invoice.aggregate([
      { $match: { ...baseFilter, status: { $in: AWAITING_STATUSES } } },
      { $group: { _id: null, total: { $sum: "$outstandingBalance" } } },
    ]),
    Invoice.aggregate([
      { $match: { ...baseFilter, status: "Awaiting Payment", paidAmount: 0 } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Invoice.countDocuments({ ...baseFilter, status: "Escalated" }),
  ]);

  return {
    totalAwaitingBalance: awaitingAgg[0]?.total ?? 0,
    unallocatedCollections: unallocatedAgg[0]?.total ?? 0,
    escalatedCount,
  };
}

async function adminStats(req, res) {
  const filters = parseDashboardFilters(req.query);
  const payload = await buildOfficeDashboardPayload("admin", filters, req);
  return res.json(payload);
}

async function salesStats(req, res) {
  const memberId = req.user._id;
  const filter = buildTenantFilter(req, { assignedPersonId: memberId });

  const [assigned, won, lost, pendingApproval, completed] = await Promise.all([
    Inquiry.countDocuments(filter),
    Inquiry.countDocuments({ ...filter, status: "Won" }),
    Inquiry.countDocuments({ ...filter, status: "Lost" }),
    Inquiry.countDocuments({ ...filter, status: "Visit Pending Approval" }),
    Inquiry.countDocuments({ ...filter, status: "Site Report Attached" }),
  ]);

  const finance = await loadFinanceSummary(req);

  return res.json({
    role: "sales",
    finance,
    myInquiries: assigned,
    wonDeals: won,
    lostDeals: lost,
    pendingVisits: pendingApproval,
    completedVisits: completed,
  });
}

async function fieldStats(req, res) {
  const memberId = req.user._id;
  const filter = buildTenantFilter(req, { assignedPersonId: memberId });

  const [assigned, inProgress, completed, rejected, pendingApproval] = await Promise.all([
    Inquiry.countDocuments(filter),
    Inquiry.countDocuments({
      ...filter,
      status: { $in: ["Visit Approved", "Visit Pending Approval"] },
    }),
    Inquiry.countDocuments({ ...filter, status: "Site Report Attached" }),
    Inquiry.countDocuments({ ...filter, status: "Visit Rejected" }),
    Inquiry.countDocuments({ ...filter, status: "Visit Pending Approval" }),
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

async function managerStats(req, res) {
  const tenantScope = buildTenantFilter(req);
  const [pending, approved, rejected, inProgress, boqByStatus, inquiryByStatus] = await Promise.all([
    BoqQuotation.countDocuments({ ...tenantScope, status: "Pending Approval" }),
    BoqQuotation.countDocuments({ ...tenantScope, status: "Approved" }),
    BoqQuotation.countDocuments({ ...tenantScope, status: "Rejected" }),
    BoqQuotation.countDocuments({
      ...tenantScope,
      status: { $in: ["BOQ In Progress", "Quotation Draft", "Revision Requested", "Rejected"] },
    }),
    BoqQuotation.aggregate([{ $match: tenantScope }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Inquiry.aggregate([{ $match: tenantScope }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const boqMap = Object.fromEntries(boqByStatus.map((row) => [row._id, row.count]));
  const inquiryMap = Object.fromEntries(inquiryByStatus.map((row) => [row._id, row.count]));
  const finance = await loadFinanceSummary(req);

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

async function buildOfficeDashboardPayload(roleKey, filters, req) {
  const { location, since } = filters;
  const workOrderIds = await resolveLocationWorkOrderIds(location, req);

  let inquiryFilter = withCreatedSince({}, since);
  inquiryFilter = withAddressMatch(inquiryFilter, "fullAddress", location);
  if (req) inquiryFilter = buildTenantFilter(req, inquiryFilter);

  let woActiveFilter = { status: { $nin: INACTIVE_WORK_ORDER_STATUSES } };
  if (workOrderIds) {
    woActiveFilter = { ...woActiveFilter, _id: { $in: workOrderIds } };
  } else {
    woActiveFilter = withAddressMatch(woActiveFilter, "siteAddress", location);
  }
  if (req) woActiveFilter = buildTenantFilter(req, woActiveFilter);

  let invoiceFilter = withCreatedSince({}, since);
  if (workOrderIds) {
    invoiceFilter = { ...invoiceFilter, workOrderId: { $in: workOrderIds } };
  } else if (location && location !== "all") {
    invoiceFilter = {
      ...invoiceFilter,
      workOrderId: { $in: workOrderIds && workOrderIds.length ? workOrderIds : [] },
    };
  }
  if (req) invoiceFilter = buildTenantFilter(req, invoiceFilter);

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
    buildMonthlyTrend(since, location, workOrderIds, req),
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
    invoiceStatusBreakdown: Object.fromEntries(
      invoiceStatusBreakdown.map((row) => [row._id, row.count]),
    ),
    monthlyTrend,
    recentActivity,
  };
}

async function getDashboardStats(req, res) {
  try {
    const filters = parseDashboardFilters(req.query);

    if (isMasterAdmin(req.user.role)) {
      return masterStats(req, res);
    }

    if (req.user.role === "admin") {
      return res.json(await buildOfficeDashboardPayload("admin", filters, req));
    }

    if (req.user.role === "manager" || req.user.role === "operation_manager" || req.user.role === "procurement") {
      return res.json(await buildOfficeDashboardPayload("manager", filters, req));
    }

    if (req.user.role === "sales" || req.user.role === "accounts") {
      return salesStats(req, res);
    }

    if (FIELD_ROLES.includes(req.user.role)) {
      const memberId = req.user._id;
      const startOfThisMonth = startOfMonth();
      const scopedMember = buildTenantFilter(req, { assignedPersonId: memberId });
      const scopedTeam = buildTenantFilter(req, { "assignedTeam.memberId": memberId });

      const [
        pendingVisits,
        approvedVisits,
        completedVisits,
        myActiveWorkOrders,
        completedThisMonth,
        openSnagRows,
        recentActivity,
      ] = await Promise.all([
        Inquiry.countDocuments({
          ...scopedMember,
          status: "Visit Pending Approval",
        }),
        Inquiry.countDocuments({
          ...scopedMember,
          status: "Visit Approved",
        }),
        Inquiry.countDocuments({
          ...scopedMember,
          status: "Site Report Attached",
        }),
        WorkOrder.countDocuments({
          ...scopedTeam,
          status: { $nin: INACTIVE_WORK_ORDER_STATUSES },
        }),
        WorkOrder.countDocuments({
          ...scopedTeam,
          status: "Completed",
          updatedAt: { $gte: startOfThisMonth },
        }),
        WorkOrder.aggregate([
          { $match: { ...scopedTeam, "snags.status": "open" } },
          { $unwind: "$snags" },
          { $match: { "snags.status": "open" } },
          { $count: "count" },
        ]),
        getRecentActivity(5),
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

    return res.json(await buildOfficeDashboardPayload("admin", filters, req));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load dashboard stats" });
  }
}

/**
 * Master Super-Admin Dashboard Stats:
 * Aggregates high-level metrics across all companies or filters by specified company.
 */
async function masterStats(req, res) {
  try {
    const filters = parseDashboardFilters(req.query);
    const { since, location } = filters;
    const requestedCompany = (req.query.companyId || req.query.company || req.headers?.["x-company-id"] || req.companyId || "all").toString().toLowerCase().trim();
    const companyFilter = requestedCompany === "all" ? "all" : requestedCompany;

    let tenantScope = {};
    if (companyFilter !== "all") {
      if (companyFilter === "woodie-1") {
        tenantScope = { $or: [{ companyId: "woodie-1" }, { companyId: { $exists: false } }, { companyId: null }] };
      } else {
        tenantScope = { companyId: companyFilter };
      }
    }

    let inqFilter = { ...tenantScope };
    if (since) inqFilter = withCreatedSince(inqFilter, since);
    inqFilter = withAddressMatch(inqFilter, "fullAddress", location);

    let quotFilter = { ...tenantScope };
    if (since) quotFilter = withCreatedSince(quotFilter, since);

    let woFilter = { ...tenantScope };
    if (since) woFilter = withCreatedSince(woFilter, since);
    woFilter = withAddressMatch(woFilter, "siteAddress", location);

    let invFilter = { ...tenantScope };
    if (since) invFilter = withCreatedSince(invFilter, since);

    const [
      totalInquiries,
      inquiryByStatusRaw,
      totalQuotations,
      quotationByStatusRaw,
      quotationValueAgg,
      totalWorkOrders,
      workOrdersByStatusRaw,
      invoiceValueAgg,
      recentActivity,
    ] = await Promise.all([
      Inquiry.countDocuments(inqFilter),
      Inquiry.aggregate([
        { $match: inqFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      BoqQuotation.countDocuments(quotFilter),
      BoqQuotation.aggregate([
        { $match: quotFilter },
        { $group: { _id: "$status", count: { $sum: 1 }, totalValue: { $sum: "$grandTotal" } } },
      ]),
      BoqQuotation.aggregate([
        { $match: quotFilter },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      WorkOrder.countDocuments(woFilter),
      WorkOrder.aggregate([
        { $match: woFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([
        { $match: invFilter },
        { $group: { _id: null, totalAmount: { $sum: "$totalAmount" }, paidAmount: { $sum: "$paidAmount" } } },
      ]),
      getRecentActivity(8),
    ]);

    const inquiryByStatus = Object.fromEntries(inquiryByStatusRaw.map((r) => [r._id, r.count]));
    const quotationByStatus = Object.fromEntries(quotationByStatusRaw.map((r) => [r._id, r.count]));
    const workOrdersByStatus = Object.fromEntries(workOrdersByStatusRaw.map((r) => [r._id, r.count]));

    // Multi-Company comparison breakdown
    const companyComparison = await Promise.all(
      COMPANIES.map(async (company) => {
        const cScope = company.id === "woodie-1"
          ? { $or: [{ companyId: "woodie-1" }, { companyId: { $exists: false } }, { companyId: null }] }
          : { companyId: company.id };

        const [inqCount, quotRows, woRows, invRows] = await Promise.all([
          Inquiry.countDocuments(cScope),
          BoqQuotation.aggregate([
            { $match: cScope },
            { $group: { _id: null, count: { $sum: 1 }, totalValue: { $sum: "$grandTotal" } } },
          ]),
          WorkOrder.aggregate([
            { $match: cScope },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                active: {
                  $sum: {
                    $cond: [{ $in: ["$status", ["Scheduled", "In Progress", "Snagging"]] }, 1, 0],
                  },
                },
              },
            },
          ]),
          Invoice.aggregate([
            { $match: cScope },
            { $group: { _id: null, totalPaid: { $sum: "$paidAmount" }, totalBilled: { $sum: "$totalAmount" } } },
          ]),
        ]);

        return {
          id: company.id,
          name: company.name,
          inquiries: inqCount,
          quotations: quotRows[0]?.count || 0,
          quotationValue: Math.round((quotRows[0]?.totalValue || 0) * 100) / 100,
          workOrders: woRows[0]?.total || 0,
          activeWorkOrders: woRows[0]?.active || 0,
          revenue: Math.round((invRows[0]?.totalPaid || 0) * 100) / 100,
        };
      }),
    );

    const activeWorkOrders =
      (workOrdersByStatus["Scheduled"] || 0) +
      (workOrdersByStatus["In Progress"] || 0) +
      (workOrdersByStatus["Snagging"] || 0) +
      (workOrdersByStatus["On Hold"] || 0);

    return res.json({
      role: "master_admin",
      companyFilter,
      companies: COMPANIES,
      summary: {
        totalInquiries,
        totalSiteVisits:
          (inquiryByStatus["Visit Pending Approval"] || 0) +
          (inquiryByStatus["Visit Approved"] || 0) +
          (inquiryByStatus["Site Report Attached"] || 0) +
          (inquiryByStatus["Visit Rejected"] || 0),
        pendingVisits: inquiryByStatus["Visit Pending Approval"] || 0,
        approvedVisits: inquiryByStatus["Visit Approved"] || 0,
        completedVisits: inquiryByStatus["Site Report Attached"] || 0,
        totalQuotations,
        pendingApprovalQuotations: quotationByStatus["Pending Approval"] || 0,
        approvedQuotations: quotationByStatus["Approved"] || 0,
        wonQuotations: quotationByStatus["Won"] || 0,
        quotationValueAed: Math.round((quotationValueAgg[0]?.total || 0) * 100) / 100,
        totalWorkOrders,
        activeWorkOrders,
        completedWorkOrders: workOrdersByStatus["Completed"] || 0,
        totalInvoicedAed: Math.round((invoiceValueAgg[0]?.totalAmount || 0) * 100) / 100,
        totalPaidAed: Math.round((invoiceValueAgg[0]?.paidAmount || 0) * 100) / 100,
      },
      inquiryByStatus,
      siteVisitBreakdown: {
        "Pending Approval": inquiryByStatus["Visit Pending Approval"] || 0,
        "Approved / Scheduled": inquiryByStatus["Visit Approved"] || 0,
        "Completed / Report Attached": inquiryByStatus["Site Report Attached"] || 0,
        "Rejected": inquiryByStatus["Visit Rejected"] || 0,
      },
      quotationByStatus,
      workOrdersByStatus,
      companyComparison,
      recentActivity,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load master dashboard stats" });
  }
}

/**
 * Interactive Drill-Down API:
 * Returns the live underlying records for a specific chart segment.
 */
async function masterDrilldown(req, res) {
  try {
    const { category = "inquiries", status = "all", companyId = "all" } = req.query;

    let tenantScope = {};
    if (companyId && companyId !== "all") {
      if (companyId === "woodie-1") {
        tenantScope = { $or: [{ companyId: "woodie-1" }, { companyId: { $exists: false } }, { companyId: null }] };
      } else {
        tenantScope = { companyId };
      }
    } else if (!isMasterAdmin(req.user.role)) {
      tenantScope = buildTenantFilter(req);
    }

    const companyNameForId = (cid) => {
      const found = COMPANIES.find((c) => c.id === cid);
      return found ? found.name : "Woodie 1";
    };

    let records = [];

    if (category === "inquiries" || category === "visits") {
      const filter = { ...tenantScope };
      if (status && status !== "all") {
        if (category === "visits") {
          if (status === "Pending Approval") filter.status = "Visit Pending Approval";
          else if (status === "Approved / Scheduled") filter.status = "Visit Approved";
          else if (status === "Completed / Report Attached") filter.status = "Site Report Attached";
          else if (status === "Rejected") filter.status = "Visit Rejected";
          else filter.status = status;
        } else {
          filter.status = status;
        }
      }
      const docs = await Inquiry.find(filter).sort({ createdAt: -1 }).limit(50).lean();
      records = docs.map((doc) => ({
        id: doc._id,
        number: doc.inquiryNumber,
        projectName: doc.scopeOfWork || "Site Visit",
        clientName: doc.clientName,
        assignedPerson: doc.assignedPersonName,
        status: doc.status,
        companyId: doc.companyId || "woodie-1",
        companyName: companyNameForId(doc.companyId || "woodie-1"),
        date: doc.scheduleVisitDate || doc.createdAt,
        time: doc.scheduleVisitTime || "",
        link: `/inquiry/inquiries/${doc._id}`,
      }));
    } else if (category === "quotations") {
      const filter = { ...tenantScope };
      if (status && status !== "all") {
        filter.status = status;
      }
      const docs = await BoqQuotation.find(filter).sort({ updatedAt: -1 }).limit(50).lean();
      records = docs.map((doc) => ({
        id: doc._id,
        number: doc.quotationNumber,
        projectName: doc.projectName || "Quotation",
        clientName: doc.clientName,
        status: doc.status,
        value: doc.grandTotal || 0,
        companyId: doc.companyId || "woodie-1",
        companyName: companyNameForId(doc.companyId || "woodie-1"),
        date: doc.quoteDate || doc.createdAt,
        link: `/boq/${doc._id}`,
      }));
    } else if (category === "workorders") {
      const filter = { ...tenantScope };
      if (status && status !== "all") {
        filter.status = status;
      }
      const docs = await WorkOrder.find(filter).sort({ updatedAt: -1 }).limit(50).lean();
      records = docs.map((doc) => ({
        id: doc._id,
        number: doc.workOrderNumber,
        projectName: doc.projectName || "Work Order",
        clientName: doc.clientName,
        status: doc.status,
        value: doc.approvedAmount || 0,
        companyId: doc.companyId || "woodie-1",
        companyName: companyNameForId(doc.companyId || "woodie-1"),
        date: doc.scheduledStart || doc.createdAt,
        link: `/workorders/${doc._id}`,
      }));
    }

    return res.json({
      category,
      status,
      companyId,
      total: records.length,
      records,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch drill-down records" });
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
  masterStats,
  masterDrilldown,
};
