import {
  providerFetch,
} from "./client";

import type {
  ProviderCatalogType,
  ProviderCategory,
} from "./types";

interface ProviderProductRow {
  id:
    | string
    | number;

  name: string;

  category?:
    | string
    | null;

  [key: string]:
    unknown;
}

interface ProductsResponse {
  success: boolean;

  products?:
    ProviderProductRow[];

  data?:
    ProviderProductRow[];

  message?: string;
}

export async function getProviderProducts(
  catalogType:
    ProviderCatalogType = "topup",
): Promise<ProviderCategory[]> {
  const data =
    await providerFetch<ProductsResponse>(
      `products.php?type=${encodeURIComponent(
        catalogType,
      )}`,
    );

  if (!data.success) {
    throw new Error(
      data.message ||
        "Failed to load provider products.",
    );
  }

  const products =
    data.products ??
    data.data ??
    [];

  if (!Array.isArray(products)) {
    throw new Error(
      "Invalid provider products response.",
    );
  }

  return products.map(
    (item) => ({
      id: String(item.id),

      name:
        String(
          item.name ?? "",
        ).trim(),

      category:
        String(
          item.category ??
            item.name ??
            "",
        ).trim(),

      catalogType,

      rawData:
        item as Record<
          string,
          unknown
        >,
    }),
  );
}