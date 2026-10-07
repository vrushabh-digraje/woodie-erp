import type { BoqItem } from "./boqTypes";

export function validateBoqForm(input: {
  projectName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  items: BoqItem[];
  taxPercent: string;
  discountPercent: string;
  paymentTerms: string;
}): string | null {
  if (!input.projectName.trim()) return "Project name is required.";
  if (!input.clientName.trim()) return "Client name is required.";
  if (!input.paymentTerms.trim()) return "Payment terms are required.";

  if (input.clientEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.clientEmail.trim())) {
    return "Enter a valid client email.";
  }

  const tax = Number(input.taxPercent);
  if (Number.isNaN(tax) || tax < 0 || tax > 100) return "Tax must be between 0 and 100.";

  const discount = Number(input.discountPercent);
  if (Number.isNaN(discount) || discount < 0 || discount > 100) {
    return "Discount must be between 0 and 100.";
  }

  const validItems = input.items.filter((item) => item.description.trim());
  if (validItems.length === 0) return "Add at least one BOQ line item with a description.";

  for (const item of validItems) {
    if (item.quantity <= 0) return `Item "${item.description}" must have quantity greater than 0.`;
    if (item.unitPrice < 0) return `Item "${item.description}" cannot have a negative price.`;
    if (!item.unit.trim()) return `Item "${item.description}" must have a unit.`;
  }

  return null;
}
