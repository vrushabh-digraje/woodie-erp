export const INVOICE_TYPES = ["Advance", "Progress", "Final"] as const;
export type InvoiceType = (typeof INVOICE_TYPES)[number];

export const INVOICE_STATUSES = [
  "Draft",
  "Awaiting Payment",
  "Partially Paid",
  "Paid",
  "Escalated",
  "Cancelled",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Cheque", "Online"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type InvoicePayment = {
  _id?: string;
  amount: number;
  method: PaymentMethod;
  receiptUrl: string;
  recordedByName?: string;
  recordedAt: string;
};

export type InvoiceActivity = {
  action: string;
  note: string;
  byName?: string;
  at: string;
};

export type Invoice = {
  _id: string;
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
  workOrderId: string;
  workOrderNumber: string;
  projectName?: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  amount: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  dueDate?: string | null;
  sentAt?: string | null;
  followUpCount: number;
  lastFollowUpAt?: string | null;
  escalatedAt?: string | null;
  payments: InvoicePayment[];
  activityTimeline?: InvoiceActivity[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateInvoicePayload = {
  workOrderId: string;
  type: InvoiceType;
  amount: number;
  taxPercent?: number;
  dueDate?: string;
};

export type WorkOrderInvoiceSummary = {
  workOrderId?: string;
  workOrderNumber?: string;
  quotationNumber?: string | null;
  quotationId?: string | null;
  /** Contract excluding VAT (source of truth for remaining to invoice) */
  contractExTax: number;
  contractInclTax: number;
  taxPercent?: number;
  invoicedExTax: number;
  /** Sum of invoice totals (incl. VAT) */
  totalInvoiced: number;
  remainingToInvoice: number;
  totalPaid: number;
  outstanding: number;
  invoiceCount: number;
  invoices: Invoice[];
  /** Not invoiced | Unpaid | Partially Paid | Paid */
  paymentStatus?: string;
  fullyPaid?: boolean;
  canCreateInvoice?: boolean;
  primaryInvoiceId?: string | null;
  advanceCollected?: boolean;
  paidPercent?: number;
};

export type FinanceStats = {
  awaitingPayment: number;
  escalatedInvoices: number;
  paidThisMonth: number;
  totalOutstanding: number;
};
