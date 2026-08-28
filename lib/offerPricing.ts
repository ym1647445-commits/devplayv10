export interface OfferPriceLike {
  supplier_price_usd: number | string;
  profit_usd: number | string;
  manual_selling_price_usd?: number | string | null;
}

export function getEffectiveOfferPriceUsd(offer: OfferPriceLike): number {
  const supplierCost = Number(offer.supplier_price_usd);
  const manual = offer.manual_selling_price_usd;
  if (manual !== null && manual !== undefined && String(manual).trim() !== "") {
    return Number(manual);
  }
  return supplierCost + Number(offer.profit_usd);
}

export function isOfferPriceSafe(offer: OfferPriceLike): boolean {
  const cost = Number(offer.supplier_price_usd);
  const price = getEffectiveOfferPriceUsd(offer);
  return Number.isFinite(cost) && cost >= 0 && Number.isFinite(price) && price >= cost;
}