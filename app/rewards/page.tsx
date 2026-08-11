import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { RewardsStore } from "@/components/rewards/RewardsStore";
import { createClient } from "@/lib/supabase/server";
import type {
  RewardPointTransaction,
  RewardStoreItem,
} from "@/types/reward";

interface RewardRow {
  id: string;

  title: string;
  description: string | null;
  image_url: string | null;

  points_cost:
    | number
    | string;

  coupon_value_egp:
    | number
    | string;

  minimum_cart_egp:
    | number
    | string;

  expiry_days: number;

  total_limit: number | null;
  redeemed_count: number;
  per_user_limit: number;

  featured: boolean;
  badge: string | null;

  sort_order: number;
  active: boolean;
}

interface RedemptionRow {
  reward_id: string;
}

interface PointTransactionRow {
  id: string;

  type: string;
  direction:
    | "credit"
    | "debit";

  points: number;

  balance_before: number;
  balance_after: number;

  description: string | null;

  created_at: string;
}

export default async function RewardsPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth");
  }

  const [
    profileResult,
    rewardsResult,
    redemptionsResult,
    transactionsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        points,
        customer_level
      `)
      .eq("id", user.id)
      .single<{
        points: number;
        customer_level: string;
      }>(),

    supabase
      .from("reward_store")
      .select(`
        id,
        title,
        description,
        image_url,
        points_cost,
        coupon_value_egp,
        minimum_cart_egp,
        expiry_days,
        total_limit,
        redeemed_count,
        per_user_limit,
        featured,
        badge,
        sort_order,
        active
      `)
      .eq("active", true)
      .order("sort_order", {
        ascending: true,
      })
      .returns<RewardRow[]>(),

    supabase
      .from("reward_redemptions")
      .select("reward_id")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .returns<RedemptionRow[]>(),

    supabase
      .from("points_transactions")
      .select(`
        id,
        type,
        direction,
        points,
        balance_before,
        balance_after,
        description,
        created_at
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(10)
      .returns<PointTransactionRow[]>(),
  ]);

  if (
    profileResult.error ||
    !profileResult.data
  ) {
    redirect("/account");
  }

  if (rewardsResult.error) {
    console.error(
      "Failed to load rewards:",
      rewardsResult.error,
    );
  }

  if (redemptionsResult.error) {
    console.error(
      "Failed to load reward redemptions:",
      redemptionsResult.error,
    );
  }

  if (transactionsResult.error) {
    console.error(
      "Failed to load point transactions:",
      transactionsResult.error,
    );
  }

  const redemptionCounts =
    new Map<string, number>();

  (
    redemptionsResult.data ?? []
  ).forEach((redemption) => {
    redemptionCounts.set(
      redemption.reward_id,
      (
        redemptionCounts.get(
          redemption.reward_id,
        ) ?? 0
      ) + 1,
    );
  });

  const rewards: RewardStoreItem[] =
    (rewardsResult.data ?? []).map(
      (reward) => ({
        id: reward.id,

        title: reward.title,

        description:
          reward.description,

        imageUrl:
          reward.image_url,

        pointsCost: Number(
          reward.points_cost,
        ),

        couponValueEgp: Number(
          reward.coupon_value_egp,
        ),

        minimumCartEgp: Number(
          reward.minimum_cart_egp,
        ),

        expiryDays:
          reward.expiry_days,

        totalLimit:
          reward.total_limit,

        redeemedCount:
          reward.redeemed_count,

        perUserLimit:
          reward.per_user_limit,

        userRedemptionsCount:
          redemptionCounts.get(
            reward.id,
          ) ?? 0,

        featured:
          reward.featured,

        badge:
          reward.badge,

        sortOrder:
          reward.sort_order,

        active:
          reward.active,
      }),
    );

  const transactions:
    RewardPointTransaction[] =
      (
        transactionsResult.data ?? []
      ).map((transaction) => ({
        id: transaction.id,

        type: transaction.type,

        direction:
          transaction.direction,

        points:
          Number(
            transaction.points,
          ),

        balanceBefore:
          Number(
            transaction.balance_before,
          ),

        balanceAfter:
          Number(
            transaction.balance_after,
          ),

        description:
          transaction.description,

        createdAt:
          transaction.created_at,
      }));

  return (
    <AppShell>
      <RewardsStore
        rewards={rewards}
        initialPoints={Number(
          profileResult.data.points,
        )}
        customerLevel={
          profileResult.data
            .customer_level
        }
        transactions={transactions}
      />
    </AppShell>
  );
}
