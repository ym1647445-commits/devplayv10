import { providerFetch } from "./client";
import type { ProviderCatalogType } from "./types";

export interface CreateProviderOrderInput {
  type: ProviderCatalogType;
  productId: string;
  offerId: string;
  quantity?: number;
  targetAccount?: string;
}

export interface ProviderOrder {
  id: string;
  fazerOrderId: string;
  status: string;
  product: string | null;
  quantity: number;
  cost: number;
  deliveredCodes: string[];
  createdAt: string | null;
}

interface ProviderOrderRow {
  id: string | number;
  fazer_order_id?: string | number | null;
  status?: string | null;
  product?: string | null;
  quantity?: number | string | null;
  cost?: number | string | null;
  delivered_code?: string | null;
  delivered_codes?: unknown;
  created_at?: string | null;
}

interface CreateOrderResponse {
  success: boolean;
  order?: ProviderOrderRow;
  remaining_balance?: number | string;
  error?: string;
  message?: string;
  required?: number | string;
  current_balance?: number | string;
}

interface OrdersResponse {
  success: boolean;
  orders?: ProviderOrderRow[];
  message?: string;
}

export class ProviderOrderRejectedError extends Error {
  readonly code: string;
  readonly response: CreateOrderResponse;

  constructor(response: CreateOrderResponse) {
    super(response.message || response.error || "Provider rejected the order.");
    this.name = "ProviderOrderRejectedError";
    this.code = response.error || "PROVIDER_REJECTED";
    this.response = response;
  }
}

function normalizeCodes(row: ProviderOrderRow): string[] {
  if (Array.isArray(row.delivered_codes)) {
    return row.delivered_codes.map(String).filter(Boolean);
  }
  return row.delivered_code ? [String(row.delivered_code)] : [];
}

function normalizeOrder(row: ProviderOrderRow): ProviderOrder {
  return {
    id: String(row.id),
    fazerOrderId: String(row.fazer_order_id ?? row.id),
    status: String(row.status ?? "pending").toLowerCase(),
    product: row.product ?? null,
    quantity: Number(row.quantity ?? 1),
    cost: Number(row.cost ?? 0),
    deliveredCodes: normalizeCodes(row),
    createdAt: row.created_at ?? null,
  };
}

export async function createProviderOrder(input: CreateProviderOrderInput): Promise<{ order: ProviderOrder; remainingBalance: number | null; raw: CreateOrderResponse }> {
  const body: Record<string, unknown> = {
    type: input.type,
    product_id: input.productId,
    offer_id: input.offerId,
  };

  if (input.type === "gc") body.quantity = input.quantity ?? 1;
  if (input.type === "topup") {
    const target = input.targetAccount?.trim();
    if (!target) throw new Error("Target account is required for topup orders.");
    body.target_account = target;
  }

  const data = await providerFetch<CreateOrderResponse>("orders.php", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!data.success || !data.order) throw new ProviderOrderRejectedError(data);
  return {
    order: normalizeOrder(data.order),
    remainingBalance: data.remaining_balance === undefined ? null : Number(data.remaining_balance),
    raw: data,
  };
}

export async function getProviderOrders(page = 1, limit = 50): Promise<ProviderOrder[]> {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const data = await providerFetch<OrdersResponse>(`orders.php?page=${safePage}&limit=${safeLimit}`);
  if (!data.success || !Array.isArray(data.orders)) throw new Error(data.message || "Failed to load provider orders.");
  return data.orders.map(normalizeOrder);
}
