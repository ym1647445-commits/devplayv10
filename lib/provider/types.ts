export type ProviderCatalogType = "topup" | "gc";

export interface ProviderBalance {
  balance: number;
  currency: string;
  clientName: string;
}

export interface ProviderCategory {
  id: string;
  name: string;
  category: string;
  catalogType: ProviderCatalogType;
  rawData: Record<string, unknown>;
}

export interface ProviderOffer {
  cardId: string;
  name: string;

  price: number;
  originalPrice: number;

  currency: string;

  stock: number | null;

  rawData:
    Record<string, unknown>;
}
