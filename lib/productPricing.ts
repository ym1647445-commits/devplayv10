import type { Product } from "@/types/product";

/**
 * السعر النهائي بالدولار:
 * سعر المورد + ربح المنصة.
 *
 * price موجود مؤقتًا لدعم المنتجات القديمة
 * لحد ما ننقل كل المنتجات للنظام الجديد.
 */
export function getProductPriceUsd(
  product: Product,
): number {
  if (
    product.supplierPriceUsd !== undefined &&
    product.profitUsd !== undefined
  ) {
    return roundCurrency(
      product.supplierPriceUsd +
        product.profitUsd,
    );
  }

  if (product.priceUsd !== undefined) {
    return roundCurrency(product.priceUsd);
  }

  if (product.currency === "USD") {
    return roundCurrency(product.price);
  }

  /*
   * دعم مؤقت للمنتجات القديمة المسعرة بالجنيه.
   * بعد تحويل constants/products.ts للدولار
   * لن يتم استخدام هذا الجزء.
   */
  return roundCurrency(
    product.price /
      (product.fallbackUsdRate ?? 57),
  );
}

export function getProductCostUsd(
  product: Product,
): number {
  if (
    product.supplierPriceUsd !== undefined
  ) {
    return roundCurrency(
      product.supplierPriceUsd,
    );
  }

  if (product.currency === "USD") {
    return roundCurrency(
      product.costPrice,
    );
  }

  return roundCurrency(
    product.costPrice /
      (product.fallbackUsdRate ?? 57),
  );
}

export function getProductOldPriceUsd(
  product: Product,
): number | null {
  if (
    product.oldPriceUsd !== undefined
  ) {
    return roundCurrency(
      product.oldPriceUsd,
    );
  }

  if (
    product.oldPrice === undefined
  ) {
    return null;
  }

  if (product.currency === "USD") {
    return roundCurrency(
      product.oldPrice,
    );
  }

  return roundCurrency(
    product.oldPrice /
      (product.fallbackUsdRate ?? 57),
  );
}

export function formatUsd(
  value: number,
  maximumFractionDigits = 3,
): string {
  return `$${Number(value).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits,
    },
  )}`;
}

function roundCurrency(
  value: number,
): number {
  return (
    Math.round(
      (Number(value) +
        Number.EPSILON) *
        10000,
    ) / 10000
  );
}