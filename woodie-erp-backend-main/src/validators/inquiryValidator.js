const { INQUIRY_CATEGORIES } = require("../config/rbac");

function validatePhone(phone) {
  const value = String(phone ?? "").trim();
  if (!/^\d{10}$/.test(value)) {
    return "phone must be exactly 10 digits";
  }
  return null;
}

function validateInquiryPayload(payload) {
  const requiredFields = [
    "clientName",
    "phone",
    "category",
    "scopeOfWork",
    "fullAddress",
    "assignedPersonId",
    "scheduleVisitDate",
    "scheduleVisitTime",
  ];

  for (const field of requiredFields) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
      return `${field} is required`;
    }
  }

  const phoneError = validatePhone(payload.phone);
  if (phoneError) return phoneError;

  if (!INQUIRY_CATEGORIES.includes(payload.category)) {
    return "Invalid category";
  }

  return null;
}

module.exports = {
  validateCreateInquiry: validateInquiryPayload,
  validateUpdateInquiry: validateInquiryPayload,
  validatePhone,
};
