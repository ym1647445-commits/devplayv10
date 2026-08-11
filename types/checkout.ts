export interface CheckoutItemPayload {
  productId: string;
  offerId: string;
  quantity: number;
  inputValues: Record<string, string>;
}

export interface CreateCheckoutPayload {
  items: CheckoutItemPayload[];
  couponCode: string | null;
  customerNote: string | null;
}

export interface CheckoutOrderResult {
  id: string;
  orderId: string;
  subtotalUsd: number;
  discountUsd: number;
  totalUsd: number;
  totalEgp: number;
  status: string;
}

export interface CheckoutActionResult {
  success: boolean;
  message: string;
  order?: CheckoutOrderResult;
}
