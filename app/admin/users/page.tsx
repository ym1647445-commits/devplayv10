import {
  UsersRound,
} from "lucide-react";

import {
  UsersManager,
} from "@/components/admin/users/UsersManager";
import { createClient } from "@/lib/supabase/server";
import type {
  AdminUser,
  AdminUserStats,
} from "@/types/adminUser";

interface RawWallet {
  id: string;

  balance_usd:
    | number
    | string;

  balance_egp:
    | number
    | string;

  frozen_balance_usd:
    | number
    | string;

  frozen_balance_egp:
    | number
    | string;

  usd_to_egp_rate:
    | number
    | string;

  is_frozen: boolean;
  freeze_reason: string | null;
}

interface RawProfile {
  id: string;

  customer_id: string;
  full_name: string | null;

  email: string | null;
  phone: string | null;
  avatar_url: string | null;

  role: string;
  status: AdminUser["status"];

  trust_score: number;
  suspicious_score: number;
  warnings_count: number;

  successful_orders_count: number;
  failed_orders_count: number;
  fake_deposit_count: number;

  points: number;
  points_debt: number;

  customer_level: string;

  birth_date: string | null;
  birth_date_locked: boolean;

  total_spent_usd:
    | number
    | string;

  orders_restricted_until:
    | string
    | null;

  deposits_restricted_until:
    | string
    | null;

  ban_reason: string | null;
  internal_notes: string | null;

  last_login_at: string | null;
  created_at: string;
  updated_at: string;

  wallet:
    | RawWallet
    | RawWallet[]
    | null;
}

interface OrderCountRow {
  user_id: string;
  status: string;
}

interface CouponCountRow {
  user_id: string;
}

function getRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function isBirthdayToday(
  birthDate: string | null,
): boolean {
  if (!birthDate) {
    return false;
  }

  const date =
    new Date(`${birthDate}T00:00:00`);

  const today = new Date();

  return (
    date.getDate() ===
      today.getDate() &&
    date.getMonth() ===
      today.getMonth()
  );
}

export default async function AdminUsersPage() {
  const supabase =
    await createClient();

  const [
    profilesResult,
    ordersResult,
    couponsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        id,
        customer_id,
        full_name,
        email,
        phone,
        avatar_url,
        role,
        status,
        trust_score,
        suspicious_score,
        warnings_count,
        successful_orders_count,
        failed_orders_count,
        fake_deposit_count,
        points,
        points_debt,
        customer_level,
        birth_date,
        birth_date_locked,
        total_spent_usd,
        orders_restricted_until,
        deposits_restricted_until,
        ban_reason,
        internal_notes,
        last_login_at,
        created_at,
        updated_at,

        wallet:account_wallet_balances(
          id,
          balance_usd,
          balance_egp,
          frozen_balance_usd,
          frozen_balance_egp,
          usd_to_egp_rate,
          is_frozen,
          freeze_reason
        )
      `)
      .order("created_at", {
        ascending: false,
      })
      .returns<RawProfile[]>(),

    supabase
      .from("product_orders")
      .select(`
        user_id,
        status
      `)
      .returns<OrderCountRow[]>(),

    supabase
      .from("checkout_coupon_users")
      .select("user_id")
      .returns<CouponCountRow[]>(),
  ]);

  if (profilesResult.error) {
    console.error(
      "Failed to load admin users:",
      profilesResult.error,
    );
  }

  if (ordersResult.error) {
    console.error(
      "Failed to load user orders:",
      ordersResult.error,
    );
  }

  if (couponsResult.error) {
    console.error(
      "Failed to load user coupons:",
      couponsResult.error,
    );
  }

  const orderRows =
    ordersResult.data ?? [];

  const couponRows =
    couponsResult.data ?? [];

  const users: AdminUser[] =
    (profilesResult.data ?? [])
      .filter(
        (profile) =>
          profile.role === "customer",
      )
      .map((profile) => {
        const wallet =
          getRelation(profile.wallet);

        const userOrders =
          orderRows.filter(
            (order) =>
              order.user_id ===
              profile.id,
          );

        const couponsCount =
          couponRows.filter(
            (coupon) =>
              coupon.user_id ===
              profile.id,
          ).length;

        return {
          id: profile.id,

          customerId:
            profile.customer_id,

          fullName:
            profile.full_name,

          email:
            profile.email,

          phone:
            profile.phone,

          avatarUrl:
            profile.avatar_url,

          role: profile.role,
          status: profile.status,

          trustScore:
            Number(
              profile.trust_score,
            ),

          suspiciousScore:
            Number(
              profile.suspicious_score,
            ),

          warningsCount:
            Number(
              profile.warnings_count,
            ),

          successfulOrdersCount:
            Number(
              profile.successful_orders_count,
            ),

          failedOrdersCount:
            Number(
              profile.failed_orders_count,
            ),

          fakeDepositCount:
            Number(
              profile.fake_deposit_count,
            ),

          points:
            Number(profile.points),

          pointsDebt:
            Number(
              profile.points_debt,
            ),

          customerLevel:
            profile.customer_level,

          birthDate:
            profile.birth_date,

          birthDateLocked:
            profile.birth_date_locked,

          totalSpentUsd:
            Number(
              profile.total_spent_usd,
            ),

          ordersRestrictedUntil:
            profile.orders_restricted_until,

          depositsRestrictedUntil:
            profile.deposits_restricted_until,

          banReason:
            profile.ban_reason,

          internalNotes:
            profile.internal_notes,

          lastLoginAt:
            profile.last_login_at,

          createdAt:
            profile.created_at,

          updatedAt:
            profile.updated_at,

          ordersCount:
            userOrders.length,

          completedOrdersCount:
            userOrders.filter(
              (order) =>
                order.status ===
                "completed",
            ).length,

          couponsCount,

          wallet: wallet
            ? {
                id: wallet.id,

                balanceUsd: Number(
                  wallet.balance_usd,
                ),

                balanceEgp: Number(
                  wallet.balance_egp,
                ),

                frozenBalanceUsd:
                  Number(
                    wallet.frozen_balance_usd,
                  ),

                frozenBalanceEgp:
                  Number(
                    wallet.frozen_balance_egp,
                  ),

                exchangeRate: Number(
                  wallet.usd_to_egp_rate,
                ),

                isFrozen:
                  wallet.is_frozen,

                freezeReason:
                  wallet.freeze_reason,
              }
            : null,
        };
      });

  const stats: AdminUserStats = {
    total: users.length,

    active:
      users.filter(
        (user) =>
          user.status === "active",
      ).length,

    suspended:
      users.filter(
        (user) =>
          user.status ===
          "suspended",
      ).length,

    banned:
      users.filter(
        (user) =>
          user.status === "banned",
      ).length,

    birthdaysToday:
      users.filter((user) =>
        isBirthdayToday(
          user.birthDate,
        ),
      ).length,

    walletsFrozen:
      users.filter(
        (user) =>
          user.wallet?.isFrozen,
      ).length,

    totalWalletBalanceUsd:
      users.reduce(
        (total, user) =>
          total +
          (user.wallet
            ?.balanceUsd ?? 0),
        0,
      ),

    totalCustomerPoints:
      users.reduce(
        (total, user) =>
          total + user.points,
        0,
      ),
  };

  return (
    <section className="admin-users-page">
      <header className="admin-users-heading">
        <div>
          <span>
            CUSTOMER CONTROL CENTER
          </span>

          <h1>
            إدارة العملاء
          </h1>

          <p>
            متابعة الحسابات والمحافظ
            وحالة الحساب ومستويات العملاء.
          </p>
        </div>

        <span>
          <UsersRound size={17} />

          {users.length.toLocaleString(
            "ar-EG",
          )}{" "}
          عميل
        </span>
      </header>

      <UsersManager
        users={users}
        stats={stats}
      />
    </section>
  );
}