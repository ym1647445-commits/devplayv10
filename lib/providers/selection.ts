import type { ProviderSelectionMode } from "@/lib/providers/types";

export interface SelectableProviderVariation {
  id: string;
  available: boolean;
  providerActive: boolean;
  providerHealth: "healthy" | "degraded" | "offline" | "unknown";
  stock: number | null;
  providerBalanceUsd: number | null;
  providerCostUsd: number;
  sellingPriceUsd: number;
  priority: number;
  successRate: number | null;
  averageExecutionSeconds: number | null;
}

export function providerUnavailableReason(variation: SelectableProviderVariation): string | null {
  if (!variation.providerActive) return "المورد متوقف حاليًا";
  if (variation.providerHealth === "offline") return "اتصال المورد غير متاح";
  if (!variation.available) return "الباقة غير متاحة حاليًا";
  if (variation.stock !== null && variation.stock <= 0) return "نفد المخزون";
  if (variation.providerBalanceUsd !== null && variation.providerBalanceUsd < variation.providerCostUsd) return "رصيد المورد غير كافٍ";
  if (variation.sellingPriceUsd < variation.providerCostUsd) return "السعر غير آمن";
  return null;
}

export function chooseProviderVariation(
  variations: SelectableProviderVariation[],
  mode: ProviderSelectionMode,
  requestedId?: string | null,
): SelectableProviderVariation {
  const available = variations.filter((variation) => providerUnavailableReason(variation) === null);
  if (!available.length) throw new Error("No provider is currently available for this package");
  if (mode === "manual") {
    const selected = available.find((variation) => variation.id === requestedId);
    if (!selected) throw new Error("Selected provider is unavailable");
    return selected;
  }
  return [...available].sort((a, b) => {
    const price = a.sellingPriceUsd - b.sellingPriceUsd;
    if (price !== 0) return price;
    const priority = b.priority - a.priority;
    if (priority !== 0) return priority;
    const success = (b.successRate ?? 0) - (a.successRate ?? 0);
    if (success !== 0) return success;
    return (a.averageExecutionSeconds ?? Number.MAX_SAFE_INTEGER) - (b.averageExecutionSeconds ?? Number.MAX_SAFE_INTEGER);
  })[0];
}
