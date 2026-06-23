export function calculateSellPrice(
  priceBuy: number,
  profitType: string,
  profitValue: number
) {
  if (profitType === "percent") {
    return priceBuy + priceBuy * (profitValue / 100);
  }

  return priceBuy + profitValue;
}