export type AdminOrderStatus =
  | "pending"
  | "processing"
  | "supplier_pending"
  | "completed"
  | "failed"
  | "cancelled"
  | "refunded"
  | "manual_review";

export interface AdminOrderCustomer {
  id: string;
  customerId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;

  level: string;
  points: number;
  pointsDebt: number;

  trustScore: number;
  status: string;
}

export interface AdminOrderItem {
  id: string;

  productId: string | null;
  productName: string;
  offerId: string | null;
  offerName: string | null;
  providerOfferId: string | null;
  productImageUrl: string | null;

  supplierProductId: string | null;

  quantity: number;

  supplierPriceUsd: number;
  profitUsd: number;
  unitPriceUsd: number;
  totalPriceUsd: number;

  inputValues: Record<
    string,
    string
  >;

  supplierResponse: Record<
    string,
    unknown
  >;

  status: AdminOrderStatus;

  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderStatusHistory {
  id: string;

  oldStatus:
    | AdminOrderStatus
    | null;

  newStatus: AdminOrderStatus;

  note: string | null;
  changedBy: string | null;

  createdAt: string;
}

export interface AdminOrder {
  id: string;
  orderId: string;

  userId: string;
  status: AdminOrderStatus;

  subtotalUsd: number;
  discountUsd: number;
  totalUsd: number;

  usdToEgpRate: number;
  totalEgpSnapshot: number;

  couponId: string | null;
  couponCode: string | null;

  supplierOrderId: string | null;
  supplierStatus: string | null;

  failureReason: string | null;

  customerNote: string | null;
  adminNote: string | null;

  completedAt: string | null;
  createdAt: string;
  updatedAt: string;

  customer: AdminOrderCustomer | null;

  items: AdminOrderItem[];

  statusHistory:
    AdminOrderStatusHistory[];
}

export interface AdminOrderStats {
  total: number;

  pending: number;
  processing: number;
  supplierPending: number;
  completed: number;

  failed: number;
  cancelled: number;
  refunded: number;
  manualReview: number;

  totalRevenueUsd: number;
  totalProfitUsd: number;
}

export interface UpdateAdminOrderStatusInput {
  orderId: string;
  status: AdminOrderStatus;
  note: string | null;
}

export interface AdminOrderActionResult {
  success: boolean;
  message: string;

  data?: {
    orderId: string;
    oldStatus: string;
    newStatus: string;

    rewardPoints: number;
    pointsCredited: number;
    pointsDeducted: number;

    debtPaid: number;
    newDebt: number;
  };
}
