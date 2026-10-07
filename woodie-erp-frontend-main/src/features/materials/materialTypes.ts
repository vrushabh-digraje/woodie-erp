export const MATERIAL_UNITS = ["nos", "sqm", "rm", "kg", "ltr", "box"] as const;
export type MaterialUnit = (typeof MATERIAL_UNITS)[number];

export type StockTransaction = {
  _id?: string;
  type: "in" | "out";
  qty: number;
  note?: string;
  by?: string;
  byName?: string;
  at?: string;
};

export type Material = {
  _id: string;
  name: string;
  SKU: string;
  unit: MaterialUnit;
  currentStock: number;
  minStockLevel: number;
  unitCost: number;
  isActive: boolean;
  stockTransactions?: StockTransaction[];
  createdAt?: string;
  updatedAt?: string;
};

export const MATERIAL_REQUEST_STATUSES = [
  "Pending",
  "Approved",
  "Issued",
  "Procurement Needed",
  "Rejected",
] as const;

export type MaterialRequestStatus = (typeof MATERIAL_REQUEST_STATUSES)[number];

export type MaterialRequestItem = {
  _id?: string;
  materialId: string;
  materialName: string;
  unit: string;
  requestedQty: number;
  availableQty: number;
  issuedQty: number;
};

export type MaterialRequestActivity = {
  _id?: string;
  action: string;
  note?: string;
  by?: string;
  byName?: string;
  at?: string;
};

export type MaterialRequest = {
  _id: string;
  requestNumber: string;
  workOrderId: string;
  workOrderNumber: string;
  projectName: string;
  requestedBy: string;
  requestedByName: string;
  status: MaterialRequestStatus;
  items: MaterialRequestItem[];
  notes?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  activityTimeline?: MaterialRequestActivity[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateMaterialPayload = {
  name: string;
  SKU: string;
  unit: MaterialUnit;
  currentStock?: number;
  minStockLevel?: number;
  unitCost?: number;
  isActive?: boolean;
};

export type UpdateMaterialPayload = Partial<CreateMaterialPayload>;

export type StockAdjustPayload = {
  type: "in" | "out";
  qty: number;
  note?: string;
};

export type CreateMaterialRequestPayload = {
  workOrderId: string;
  items: { materialId: string; requestedQty: number }[];
  notes?: string;
};
