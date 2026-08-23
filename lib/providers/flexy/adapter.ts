import "server-only";

import { getProviderBalance } from "@/lib/provider/balance";
import { getProviderOffers } from "@/lib/provider/offers";
import { createProviderOrder, getProviderOrders } from "@/lib/provider/orders";
import { getProviderProducts } from "@/lib/provider/products";
import type { ProviderCatalogType } from "@/lib/provider/types";
import type {
  ProviderAdapter,
  ProviderCatalogKind,
  ProviderOrder,
  ProviderProduct,
  ProviderVariation,
} from "@/lib/providers/types";

function legacyKind(kind: ProviderCatalogKind = "topup"): ProviderCatalogType {
  return kind === "gift_card" ? "gc" : "topup";
}

function normalizeOrder(order: Awaited<ReturnType<typeof getProviderOrders>>[number]): ProviderOrder {
  return {
    id: order.fazerOrderId || order.id,
    status: order.status,
    cost: order.cost,
    currency: "USD",
    deliveredCodes: order.deliveredCodes,
    raw: { ...order },
  };
}

export const flexyAdapter: ProviderAdapter = {
  code: "flexy",

  async getCategories() {
    const [topup, giftCards] = await Promise.all([
      getProviderProducts("topup"),
      getProviderProducts("gc"),
    ]);
    return [...topup, ...giftCards].map<ProviderProduct>((product) => ({
      id: product.id,
      name: product.name,
      kind: product.catalogType === "gc" ? "gift_card" : "topup",
      category: product.category,
      requiredFields: [],
      raw: product.rawData,
    }));
  },

  async getProducts(kind = "topup") {
    const products = await getProviderProducts(legacyKind(kind));
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      kind,
      category: product.category,
      requiredFields: [],
      raw: product.rawData,
    }));
  },

  async getProduct(productId) {
    const products = await this.getCategories();
    return products.find((product) => product.id === productId) ?? null;
  },

  async getVariations(productId, kind = "topup") {
    const offers = await getProviderOffers(productId, legacyKind(kind));
    return offers.map<ProviderVariation>((offer) => ({
      id: offer.cardId,
      productId,
      name: offer.name,
      cost: offer.price,
      currency: offer.currency,
      stock: offer.stock,
      available: offer.stock === null || offer.stock > 0,
      requiredFields: [],
      raw: offer.rawData,
    }));
  },

  async getBalance() {
    const balance = await getProviderBalance();
    return { amount: balance.balance, currency: balance.currency, capturedAt: new Date().toISOString() };
  },

  async createOrder(input) {
    const targetAccount = Object.values(input.inputValues).find((value) => value.trim())?.trim();
    const result = await createProviderOrder({
      type: legacyKind(input.catalogKind),
      productId: input.productId,
      offerId: input.variationId,
      quantity: input.quantity,
      targetAccount: input.catalogKind === "topup" ? targetAccount : undefined,
    });
    return normalizeOrder(result.order);
  },

  async getOrderStatus(orderId) {
    for (let page = 1; page <= 5; page += 1) {
      const orders = await getProviderOrders(page, 100);
      const match = orders.find((order) => order.fazerOrderId === orderId || order.id === orderId);
      if (match) return normalizeOrder(match);
      if (orders.length < 100) break;
    }
    return null;
  },

  async testConnection() {
    const startedAt = Date.now();
    try {
      await getProviderBalance();
      return { ok: true, latencyMs: Date.now() - startedAt, message: "FlexyGlobal connected" };
    } catch (error) {
      return { ok: false, latencyMs: Date.now() - startedAt, message: error instanceof Error ? error.message : "FlexyGlobal unavailable" };
    }
  },
};
