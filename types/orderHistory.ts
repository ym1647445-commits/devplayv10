export type CustomerOrderType =
  | "product"
  | "deposit";

export type CustomerOrderStatus =
  | "pending"
  | "waiting_payment"
  | "under_review"
  | "processing"
  | "supplier_pending"
  | "completed"
  | "approved"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "failed"
  | "needs_information"
  | "frozen"
  | "manual_review";

export interface CustomerOrderHistoryItem {
  id: string;
  orderNumber: string;

  type: CustomerOrderType;
  status: CustomerOrderStatus;

  title: string;
  description: string | null;

  requestedCurrency: "EGP" | "USD";
  requestedAmount: number;
  amountUsd: number;

  paymentMethod: string | null;
  paymentNetwork: string | null;

  rejectionReason: string | null;
  adminNote: string | null;
  deliveredCodes?: string[];

  createdAt: string;
  updatedAt: string;
}
