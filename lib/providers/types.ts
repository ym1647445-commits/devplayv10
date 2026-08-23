export type ProviderCode = "flexy" | "item4gamer" | (string & {});
export type ProviderCatalogKind = "topup" | "gift_card";
export type ProviderHealth = "healthy" | "degraded" | "offline" | "unknown";
export type ProviderSelectionMode = "manual" | "auto";

export interface Provider {
  id: string;
  code: ProviderCode;
  name: string;
  active: boolean;
  priority: number;
  health: ProviderHealth;
  selectionMode: ProviderSelectionMode;
  exposeNameToCustomers: boolean;
}

export interface ProviderProduct {
  id: string;
  name: string;
  kind: ProviderCatalogKind;
  category?: string | null;
  region?: string | null;
  countryCode?: string | null;
  requiredFields: ProviderRequiredField[];
  raw: Record<string, unknown>;
}

export interface ProviderRequiredField {
  id: string;
  label: string;
  type: "text" | "number" | "email" | "url" | "tel";
  required: boolean;
  placeholder?: string;
  pattern?: string;
}

export interface ProviderVariation {
  id: string;
  productId: string;
  name: string;
  cost: number;
  currency: string;
  stock: number | null;
  available: boolean;
  executionType?: string | null;
  estimatedSeconds?: number | null;
  requiredFields: ProviderRequiredField[];
  raw: Record<string, unknown>;
}

export interface InternalProduct {
  id: string;
  slug: string;
  name: string;
  type: string;
  regionMode: "none" | "country" | "region";
  requiredFields: ProviderRequiredField[];
}

export interface InternalPackage {
  id: string;
  productId: string;
  canonicalKey: string;
  name: string;
  countryCode?: string | null;
  regionCode?: string | null;
  faceValue?: number | null;
  faceValueCurrency?: string | null;
}

export interface ProductMapping {
  id: string;
  providerId: string;
  internalProductId: string;
  internalPackageId: string;
  providerProductId: string;
  providerVariationId: string;
  providerCost: number;
  providerCurrency: string;
  stock: number | null;
  available: boolean;
}

export interface ProviderBalance {
  amount: number;
  currency: string;
  capturedAt: string;
}

export interface ProviderOrderInput {
  productId: string;
  variationId: string;
  quantity: number;
  inputValues: Record<string, string>;
  idempotencyKey: string;
  catalogKind: ProviderCatalogKind;
}

export interface ProviderOrder {
  id: string;
  status: string;
  cost: number;
  currency: string;
  deliveredCodes: string[];
  raw: Record<string, unknown>;
}

export interface ProviderAdapter {
  readonly code: ProviderCode;
  getCategories(): Promise<ProviderProduct[]>;
  getProducts(kind?: ProviderCatalogKind): Promise<ProviderProduct[]>;
  getProduct(productId: string): Promise<ProviderProduct | null>;
  getVariations(productId: string, kind?: ProviderCatalogKind): Promise<ProviderVariation[]>;
  getBalance(): Promise<ProviderBalance>;
  createOrder(input: ProviderOrderInput): Promise<ProviderOrder>;
  getOrderStatus(orderId: string): Promise<ProviderOrder | null>;
  testConnection(): Promise<{ ok: boolean; latencyMs: number; message: string }>;
}
