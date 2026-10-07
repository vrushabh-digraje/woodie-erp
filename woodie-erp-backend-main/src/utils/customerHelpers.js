const { Customer } = require("../models/Customer");
const { Inquiry } = require("../models/Inquiry");

function normalizePhone(phone) {
  return String(phone ?? "").replace(/\D/g, "").slice(-10);
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

async function findOrCreateCustomer({ name, phone, email, inquiryId, createdByName }) {
  const phoneNorm = normalizePhone(phone);
  const emailNorm = normalizeEmail(email);
  let customer = null;

  if (phoneNorm.length >= 10) {
    customer = await Customer.findOne({ phone: { $regex: phoneNorm.slice(-10) + "$" } });
  }
  if (!customer && emailNorm) {
    customer = await Customer.findOne({ email: emailNorm });
  }

  if (!customer) {
    customer = await Customer.create({
      name: String(name || "Unknown").trim() || "Unknown",
      phone: phoneNorm,
      email: emailNorm,
      inquiryIds: inquiryId ? [inquiryId] : [],
      createdByName: createdByName || "System",
    });
    return customer;
  }

  if (inquiryId && !customer.inquiryIds.some((id) => String(id) === String(inquiryId))) {
    customer.inquiryIds.push(inquiryId);
    await customer.save();
  }
  return customer;
}

async function matchInquiryByContact(phone, email) {
  const phoneNorm = normalizePhone(phone);
  const emailNorm = normalizeEmail(email);
  if (phoneNorm.length >= 10) {
    const byPhone = await Inquiry.findOne({ phone: { $regex: phoneNorm.slice(-10) + "$" } })
      .sort({ updatedAt: -1 })
      .lean();
    if (byPhone) return byPhone;
  }
  return null;
}

module.exports = { findOrCreateCustomer, matchInquiryByContact, normalizePhone, normalizeEmail };
