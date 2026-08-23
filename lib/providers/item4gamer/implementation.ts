import "server-only";

import { item4gamerRequest } from "./client";
import type { ProviderAdapter, ProviderCatalogKind, ProviderOrder, ProviderRequiredField, ProviderVariation } from "../types";

interface Category { id: number | string; name: string }
interface ProductSummary { id: number | string; name: string }
interface Field { data_name: string; type?: string; required?: boolean; name?: string }
interface Variation extends ProductSummary { price: number | string; currency?: string; discount?: number; in_stock?: boolean; delivery_type?: string; fields?: Field[]; [key: string]: unknown }
interface Product extends ProductSummary { variations?: Variation[] }
interface RemoteOrder { id: number | string; status?: string; total?: number | string; currency?: string; notes?: unknown; [key: string]: unknown }

const CATEGORY_BY_KIND: Record<ProviderCatalogKind, number[]> = { topup: [19, 18], gift_card: [20] };

function kindFromDelivery(value?: string): ProviderCatalogKind {
  const normalized = value?.toLowerCase() ?? "";
  return normalized.includes("gift") || normalized.includes("code") ? "gift_card" : "topup";
}

function fieldType(value?: string): ProviderRequiredField["type"] {
  const normalized = value?.toLowerCase();
  if (normalized === "number" || normalized === "email" || normalized === "url" || normalized === "tel") return normalized;
  return "text";
}

function mapFields(input?: Field[]): ProviderRequiredField[] {
  return (input ?? []).filter((field) => field.data_name).map((field) => ({
    id: field.data_name,
    label: field.name?.trim() || field.data_name,
    type: fieldType(field.type),
    required: Boolean(field.required),
  }));
}

function uniqueFields(variations: Variation[]): ProviderRequiredField[] {
  const result = new Map<string, ProviderRequiredField>();
  for (const variation of variations) for (const field of mapFields(variation.fields)) result.set(field.id, field);
  return [...result.values()];
}

function extractCodes(value: unknown): string[] {
  const found = new Set<string>();
  const visit = (entry: unknown) => {
    if (typeof entry === "string") for (const code of entry.match(/\b[A-Z0-9][A-Z0-9-]{5,}\b/gi) ?? []) found.add(code);
    else if (Array.isArray(entry)) entry.forEach(visit);
    else if (entry && typeof entry === "object") Object.values(entry).forEach(visit);
  };
  visit(value);
  return [...found];
}

function normalizeOrder(order: RemoteOrder): ProviderOrder {
  return {
    id: String(order.id),
    status: String(order.status ?? "pending").toLowerCase(),
    cost: Number(order.total ?? 0),
    currency: String(order.currency ?? "USD").toUpperCase(),
    deliveredCodes: extractCodes(order.notes),
    raw: order,
  };
}

export const item4gamerImplementation: ProviderAdapter = {
  code: "item4gamer",
  async getCategories() {
    const data = await item4gamerRequest<{ categories: Record<string, Category> | Category[] }>("product/get-categories");
    return Object.values(data.categories ?? {}).map((category) => ({
      id: String(category.id), name: category.name, kind: Number(category.id) === 20 ? "gift_card" : "topup",
      category: category.name, requiredFields: [], raw: category as unknown as Record<string, unknown>,
    }));
  },
  async getProducts(kind = "topup") {
    const groups = await Promise.all(CATEGORY_BY_KIND[kind].map(async (categoryId) => {
      const data = await item4gamerRequest<{ products: ProductSummary[] }>(`product/get-products?category_id=${categoryId}`);
      return (data.products ?? []).map((product) => ({
        id: String(product.id), name: product.name, kind, category: String(categoryId), requiredFields: [],
        raw: { ...product, category_id: categoryId } as Record<string, unknown>,
      }));
    }));
    return [...new Map(groups.flat().map((product) => [product.id, product])).values()];
  },
  async getProduct(productId) {
    const data = await item4gamerRequest<{ product: Product }>(`product/get-product?product_id=${encodeURIComponent(productId)}`);
    if (!data.product) return null;
    const variations = data.product.variations ?? [];
    return { id: String(data.product.id), name: data.product.name, kind: kindFromDelivery(variations[0]?.delivery_type), requiredFields: uniqueFields(variations), raw: data.product as unknown as Record<string, unknown> };
  },
  async getVariations(productId) {
    const data = await item4gamerRequest<{ product: Product }>(`product/get-product?product_id=${encodeURIComponent(productId)}`);
    return (data.product?.variations ?? []).map<ProviderVariation>((variation) => ({
      id: String(variation.id), productId: String(data.product.id), name: variation.name,
      cost: Number(variation.price), currency: String(variation.currency ?? "USD").toUpperCase(),
      stock: null, available: variation.in_stock !== false, executionType: variation.delivery_type ?? null,
      requiredFields: mapFields(variation.fields), raw: variation,
    }));
  },
  async getBalance() {
    const data = await item4gamerRequest<{ balance: number | string; currency?: string }>("get-balance");
    return { amount: Number(data.balance), currency: String(data.currency ?? "USD").toUpperCase(), capturedAt: new Date().toISOString() };
  },
  async createOrder(input) {
    const data = await item4gamerRequest<{ order_id: number | string; total?: number | string; currency?: string }>("order/add-order", {
      method: "POST",
      body: JSON.stringify({ variation_id: input.variationId, quantity: input.quantity, data: input.inputValues }),
    });
    return { id: String(data.order_id), status: "pending", cost: Number(data.total ?? 0), currency: String(data.currency ?? "USD").toUpperCase(), deliveredCodes: [], raw: data };
  },
  async getOrderStatus(orderId) {
    const data = await item4gamerRequest<{ order: RemoteOrder }>(`order/get-order?order_id=${encodeURIComponent(orderId)}`);
    return data.order ? normalizeOrder(data.order) : null;
  },
  async testConnection() {
    const started = Date.now();
    try {
      const balance = await this.getBalance();
      return { ok: true, latencyMs: Date.now() - started, message: `Connected · ${balance.currency} balance is available` };
    } catch (error) {
      return { ok: false, latencyMs: Date.now() - started, message: error instanceof Error ? error.message : "Item4Gamer connection failed" };
    }
  },
};
