function validateMarkLost(body) {
  const lossReason = String(body?.lossReason ?? "").trim();
  if (!lossReason) return "lossReason is required";
  if (lossReason.length < 5) return "lossReason must be at least 5 characters";
  return null;
}

function validateNegotiation(body) {
  if (body?.clientFeedback === undefined || body?.clientFeedback === null) {
    return null;
  }
  const clientFeedback = String(body.clientFeedback).trim();
  if (clientFeedback.length > 500) {
    return "clientFeedback must be at most 500 characters";
  }
  return null;
}

module.exports = { validateMarkLost, validateNegotiation };
