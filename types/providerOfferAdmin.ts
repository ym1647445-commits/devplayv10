export type ProviderCatalogType =
  | "topup"
  | "gc";

export type ApiPricingMode =
  | "fixed_usd"
  | "percentage"
  | "manual";

export interface AdminProviderOffer {
  id: string;

  providerName: string;

  catalogType:
    ProviderCatalogType;

  providerCategoryId: string;
  providerOfferId: string;

  name: string;
  categoryName: string;

  price: number;

  originalPrice:
    | number
    | null;

  currency: string;

  stock:
    | number
    | null;

  available: boolean;

  importedToStore: boolean;

  storeProductId:
    | string
    | null;

  lastSyncedAt: string;
}

export interface ProviderPricingSettings {
  usdToEgpRate: number;

  apiPricingMode:
    ApiPricingMode;

  defaultProfitUsd: number;

  defaultMarkupPercentage:
    number;

  profitPerUsdEgp: number;
}