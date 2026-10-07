const TRANSITION_RULES = {
  "Quotation Sent": ["Approved"],
  Negotiation: ["Approved", "Quotation Sent"],
  Won: ["Approved", "Quotation Sent", "Negotiation"],
  Lost: ["Approved", "Quotation Sent", "Negotiation"],
};

function validateStatusTransition(currentStatus, targetStatus) {
  const allowedFrom = TRANSITION_RULES[targetStatus];
  if (!allowedFrom) {
    const error = new Error(`Unknown target status: ${targetStatus}`);
    error.code = "INVALID_TARGET_STATUS";
    throw error;
  }

  if (!allowedFrom.includes(currentStatus)) {
    const error = new Error(
      `Cannot transition from "${currentStatus}" to "${targetStatus}". Allowed from: ${allowedFrom.join(", ")}`,
    );
    error.code = "INVALID_STATUS_TRANSITION";
    throw error;
  }
}

module.exports = { validateStatusTransition, TRANSITION_RULES };
