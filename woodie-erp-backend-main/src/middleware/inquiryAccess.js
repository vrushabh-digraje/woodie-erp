const mongoose = require("mongoose");
const { TeamMember } = require("../models/TeamMember");
const { BoqQuotation } = require("../models/BoqQuotation");
const { canCreateInquiry, isFieldRole, isAdmin, isSales, isManager } = require("../config/rbac");

function activityActor(req) {
  return req.user?.name || "System";
}

function isAssignedToInquiry(inquiry, member) {
  if (!member || !isFieldRole(member.role)) return false;
  if (!inquiry?.assignedPersonId) return false;
  return String(inquiry.assignedPersonId) === String(member._id);
}

function assertInquiryAccess(inquiry, member, res) {
  if (isAdmin(member.role) || isSales(member.role) || isManager(member.role)) return true;
  if (isAssignedToInquiry(inquiry, member)) return true;
  res.status(403).json({ message: "You do not have access to this inquiry" });
  return false;
}

function assertAssignedPersonAction(inquiry, member, res) {
  if (isAssignedToInquiry(inquiry, member)) return true;
  res.status(403).json({ message: "Only the assigned team member can perform this action" });
  return false;
}

/**
 * Only the assigned site person may edit while Visit Approved, or after submit
 * until a BOQ/quotation exists. Admin/manager are view-only.
 */
async function assertSiteSurveyWriteAccess(inquiry, member, res) {
  if (!inquiry) {
    res.status(404).json({ message: "Inquiry not found" });
    return false;
  }
  const status = inquiry.status;
  if (status !== "Visit Approved" && status !== "Site Report Attached") {
    res.status(400).json({ message: "Site survey can only be edited after the visit is approved" });
    return false;
  }
  if (status === "Site Report Attached") {
    const prepared = await BoqQuotation.exists({ inquiryId: inquiry._id });
    if (prepared) {
      res.status(403).json({
        message: "Site survey is locked once BOQ has been prepared and cannot be edited",
      });
      return false;
    }
  }
  if (isAssignedToInquiry(inquiry, member)) return true;
  res.status(403).json({ message: "Only the assigned site person can edit this site survey" });
  return false;
}

async function assertSiteSurveyMediaUpload(inquiry, member, res) {
  if (!inquiry) {
    res.status(404).json({ message: "Inquiry not found" });
    return false;
  }
  if (inquiry.status === "Visit Approved" || inquiry.status === "Site Report Attached") {
    return assertSiteSurveyWriteAccess(inquiry, member, res);
  }
  res.status(400).json({ message: "Site survey media can only be uploaded after visit approval" });
  return false;
}

function buildInquiryListFilter(req) {
  const { q = "", status = "All" } = req.query;
  const search = String(q).trim();
  const filter = {};

  if (status !== "All") {
    filter.status = status;
  }

  if (isFieldRole(req.user?.role)) {
    filter.assignedPersonId = req.user._id;
  }

  if (search) {
    filter.$or = [
      { inquiryNumber: { $regex: search, $options: "i" } },
      { clientName: { $regex: search, $options: "i" } },
      { contactPersonName: { $regex: search, $options: "i" } },
      { assignedPersonName: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
    ];
  }

  return filter;
}

async function resolveAssignedPerson(assignedPersonId) {
  if (!assignedPersonId || !mongoose.Types.ObjectId.isValid(assignedPersonId)) {
    return { error: "A valid assignedPersonId is required" };
  }
  const person = await TeamMember.findOne({
    _id: assignedPersonId,
    status: "Active",
  });
  if (!person) {
    return { error: "Assigned person not found or inactive" };
  }
  if (!isFieldRole(person.role)) {
    return { error: "Assigned person must have a field role (e.g. Site Engineer, Technician)" };
  }
  return { assignedPersonId: person._id, assignedPersonName: person.name };
}

function assertCanCreateInquiry(member, res) {
  if (canCreateInquiry(member.role)) return true;
  res.status(403).json({ message: "You cannot create inquiries" });
  return false;
}

module.exports = {
  activityActor,
  assertInquiryAccess,
  assertAssignedPersonAction,
  assertSiteSurveyWriteAccess,
  assertSiteSurveyMediaUpload,
  buildInquiryListFilter,
  resolveAssignedPerson,
  assertCanCreateInquiry,
  isAssignedToInquiry,
};
