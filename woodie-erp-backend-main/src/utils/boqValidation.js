function validateBoqPayload(body, { requireItems = true } = {}) {
  const projectName = String(body.projectName ?? "").trim();
  const clientName = String(body.clientName ?? "").trim();
  const clientEmail = String(body.clientEmail ?? "").trim();
  const paymentTerms = String(body.paymentTerms ?? "").trim();

  if (!projectName) return "Project name is required";
  if (!clientName) return "Client name is required";
  if (!paymentTerms) return "Payment terms are required";

  if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    return "Client email is invalid";
  }

  const taxPercent = Number(body.taxPercent);
  if (Number.isNaN(taxPercent) || taxPercent < 0 || taxPercent > 100) {
    return "Tax percent must be between 0 and 100";
  }

  const discountPercent = Number(body.discountPercent);
  if (Number.isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    return "Discount percent must be between 0 and 100";
  }

  if (requireItems) {
    const items = Array.isArray(body.items) ? body.items : [];
    const valid = items.filter((item) => String(item?.description ?? "").trim());
    if (valid.length === 0) return "At least one BOQ item is required";

    for (const item of valid) {
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      if (Number.isNaN(qty) || qty <= 0) return "Each item must have quantity greater than 0";
      if (Number.isNaN(price) || price < 0) return "Each item must have a valid unit price";
      if (!String(item.unit ?? "").trim()) return "Each item must have a unit";
    }
  }

  return null;
}

module.exports = { validateBoqPayload };
