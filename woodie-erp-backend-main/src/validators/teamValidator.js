const { teamMemberStatuses, roleSlugs } = require("../models/TeamMember");

function validatePhone(phone) {
  const value = String(phone ?? "").trim();
  if (!/^\d{10}$/.test(value)) {
    return "phone must be exactly 10 digits";
  }
  return null;
}

function validateEmail(email) {
  const value = String(email ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "email must be valid";
  }
  return null;
}

function validateTeamMemberPayload(payload, { isUpdate = false, requirePassword = false } = {}) {
  const required = ["name", "phone", "email", "role", "status"];
  for (const field of required) {
    if (!isUpdate && (payload[field] === undefined || payload[field] === null || payload[field] === "")) {
      return `${field} is required`;
    }
  }

  if (payload.phone !== undefined) {
    const phoneError = validatePhone(payload.phone);
    if (phoneError) return phoneError;
  }

  if (payload.email !== undefined) {
    const emailError = validateEmail(payload.email);
    if (emailError) return emailError;
  }

  if (payload.role !== undefined && !roleSlugs.includes(payload.role)) {
    return "Invalid role";
  }

  if (payload.status !== undefined && !teamMemberStatuses.includes(payload.status)) {
    return "status must be Active or Inactive";
  }

  if (requirePassword && !payload.password && !payload.generatePassword) {
    return "password or generatePassword is required";
  }

  return null;
}

module.exports = { validateTeamMemberPayload, validatePhone, validateEmail };
