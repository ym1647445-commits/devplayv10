import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { loadGameAccountProducts } from "@/lib/game-accounts/catalog";
import { createClient } from "@/lib/supabase/server";

import { GameAccountsClient } from "./GameAccountsClient";
import type { SavedGameAccount } from "./types";

interface SavedGameAccountRow {
  id: string;
  product_id: string;
  nickname: string;
  identifiers: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export default async function GameAccountsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/auth?next=/account/game-accounts");

  const [productsResult, accountsResult] = await Promise.allSettled([
    loadGameAccountProducts(supabase),
    supabase
      .from("saved_game_accounts")
      .select("id, product_id, nickname, identifiers, is_default, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .returns<SavedGameAccountRow[]>(),
  ]);

  const products = productsResult.status === "fulfilled" ? productsResult.value : [];
  const accountResponse = accountsResult.status === "fulfilled" ? accountsResult.value : null;
  const setupRequired = Boolean(accountResponse?.error?.message.includes("saved_game_accounts"));
  const accounts: SavedGameAccount[] = (accountResponse?.data ?? []).map((row) => ({
    id: row.id,
    productId: row.product_id,
    nickname: row.nickname,
    identifiers: Object.fromEntries(
      Object.entries(row.identifiers ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    ),
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return (
    <AppShell>
      <GameAccountsClient
        initialAccounts={accounts}
        products={products}
        setupRequired={setupRequired}
      />
    </AppShell>
  );
}
