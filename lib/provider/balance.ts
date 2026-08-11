import { providerFetch } from "./client";
import type { ProviderBalance } from "./types";

interface BalanceResponse {
  success: boolean;

  balance: number;

  debt: number;

  currency: string;

  client_name: string;
}

export async function getProviderBalance(): Promise<ProviderBalance> {
  const data =
    await providerFetch<BalanceResponse>(
      "balance.php",
    );

  if (!data.success) {
    throw new Error(
      "Failed to load provider balance.",
    );
  }

  return {
    balance: Number(data.balance),

    currency: data.currency,

    clientName: data.client_name,
  };
}