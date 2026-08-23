import "server-only";

import { flexyAdapter } from "@/lib/providers/flexy/adapter";
import { item4gamerAdapter } from "@/lib/providers/item4gamer/adapter";
import type { ProviderAdapter, ProviderCode } from "@/lib/providers/types";

const adapters = new Map<ProviderCode, ProviderAdapter>([
  [flexyAdapter.code, flexyAdapter],
  [item4gamerAdapter.code, item4gamerAdapter],
]);

export function getProviderAdapter(code: ProviderCode): ProviderAdapter {
  const adapter = adapters.get(code);
  if (!adapter) throw new Error(`Provider adapter is not registered: ${code}`);
  return adapter;
}

export function hasProviderAdapter(code: ProviderCode): boolean {
  return adapters.has(code);
}

export function listRegisteredProviderCodes(): ProviderCode[] {
  return [...adapters.keys()];
}
