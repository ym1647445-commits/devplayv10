import {
  Gift,
  TicketPercent,
} from "lucide-react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { CustomerCoupons } from "@/components/coupons/CustomerCoupons";
import { createClient } from "@/lib/supabase/server";
import type {
  CustomerCoupon,
  CustomerCouponState,
} from "@/types/customerCoupon";

interface CouponRow {
  id: string;
  code: string;
  title: string;
  description: string | null;

  type: "fixed" | "percentage";
  value: number | string;
  currency: "USD" | "EGP";

  minimum_cart_amount:
    | number
    | string;

  maximum_discount:
    | number
    | string
    | null;

  minimum_items_count: number;

  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number;

  first_order_only: boolean;
  auto_apply: boolean;

  application_scope:
    | "cart"
    | "categories"
    | "products";

  audience_type:
    | "all_users"
    | "specific_users"
    | "new_users"
    | "selected_levels";

  selected_levels: string[];

  starts_at: string;
  expires_at: string | null;

  active: boolean;
}

interface CouponUsageRow {
  coupon_id: string;
}

function resolveCouponState({
  coupon,
  userUsageCount,
  successfulOrders,
}: {
  coupon: CouponRow;
  userUsageCount: number;
  successfulOrders: number;
}): CustomerCouponState {
  const now = Date.now();

  if (!coupon.active) {
    return "unavailable";
  }

  if (
    new Date(
      coupon.starts_at,
    ).getTime() > now
  ) {
    return "upcoming";
  }

  if (
    coupon.expires_at &&
    new Date(
      coupon.expires_at,
    ).getTime() <= now
  ) {
    return "expired";
  }

  if (
    userUsageCount >=
    coupon.per_user_limit
  ) {
    return "used";
  }

  if (
    coupon.usage_limit !== null &&
    coupon.usage_count >=
      coupon.usage_limit
  ) {
    return "unavailable";
  }

  if (
    coupon.first_order_only &&
    successfulOrders > 0
  ) {
    return "unavailable";
  }

  return "available";
}

export default async function CouponsPage() {
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
    publicCouponsResult,
    assignedCouponsResult,
    usageResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        customer_level,
        successful_orders_count,
        created_at
      `)
      .eq("id", user.id)
      .single<{
        customer_level: string;
        successful_orders_count: number;
        created_at: string;
      }>(),

    supabase
      .from("checkout_coupons")
      .select(`
        id,
        code,
        title,
        description,
        type,
        value,
        currency,
        minimum_cart_amount,
        maximum_discount,
        minimum_items_count,
        usage_limit,
        usage_count,
        per_user_limit,
        first_order_only,
        auto_apply,
        application_scope,
        audience_type,
        selected_levels,
        starts_at,
        expires_at,
        active
      `)
      .eq("visibility", "public")
      .returns<CouponRow[]>(),

    supabase
      .from("checkout_coupon_users")
      .select(`
        checkout_coupons(
          id,
          code,
          title,
          description,
          type,
          value,
          currency,
          minimum_cart_amount,
          maximum_discount,
          minimum_items_count,
          usage_limit,
          usage_count,
          per_user_limit,
          first_order_only,
          auto_apply,
          application_scope,
          audience_type,
          selected_levels,
          starts_at,
          expires_at,
          active
        )
      `)
      .eq("user_id", user.id),

    supabase
      .from("checkout_coupon_usage")
      .select("coupon_id")
      .eq("user_id", user.id)
      .returns<CouponUsageRow[]>(),
  ]);

  const profile =
    profileResult.data;

  if (!profile) {
    redirect("/account");
  }

  const publicCoupons =
    publicCouponsResult.data ?? [];

  const assignedCoupons =
    (
      assignedCouponsResult.data ??
      []
    )
      .map((row) => {
        const relation =
          row.checkout_coupons;

        if (Array.isArray(relation)) {
          return relation[0] ?? null;
        }

        return relation ?? null;
      })
      .filter(
        (
          coupon,
        ): coupon is CouponRow =>
          Boolean(coupon),
      );

  const allCoupons =
    Array.from(
      new Map(
        [
          ...publicCoupons,
          ...assignedCoupons,
        ].map((coupon) => [
          coupon.id,
          coupon,
        ]),
      ).values(),
    );

  const usageCounts =
    new Map<string, number>();

  (
    usageResult.data ?? []
  ).forEach((usage) => {
    usageCounts.set(
      usage.coupon_id,
      (usageCounts.get(
        usage.coupon_id,
      ) ?? 0) + 1,
    );
  });

  // مؤشر عرض فقط؛ مدة الـ30 يومًا تُفحص بدقة على السيرفر عند تطبيق الكوبون.
  const isNewUser =
    profile.successful_orders_count === 0;

  const visibleCoupons =
    allCoupons.filter(
      (coupon) => {
        if (
          coupon.audience_type ===
          "all_users"
        ) {
          return true;
        }

        if (
          coupon.audience_type ===
          "specific_users"
        ) {
          return assignedCoupons.some(
            (assignedCoupon) =>
              assignedCoupon.id ===
              coupon.id,
          );
        }

        if (
          coupon.audience_type ===
          "new_users"
        ) {
          return isNewUser;
        }

        if (
          coupon.audience_type ===
          "selected_levels"
        ) {
          return (
            coupon.selected_levels ??
            []
          ).includes(
            profile.customer_level,
          );
        }

        return false;
      },
    );

  const coupons: CustomerCoupon[] =
    visibleCoupons.map((coupon) => {
      const userUsageCount =
        usageCounts.get(coupon.id) ??
        0;

      return {
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        description:
          coupon.description,

        type: coupon.type,
        value: Number(
          coupon.value,
        ),
        currency: coupon.currency,

        minimumCartAmount: Number(
          coupon.minimum_cart_amount,
        ),

        maximumDiscount:
          coupon.maximum_discount ===
          null
            ? null
            : Number(
                coupon.maximum_discount,
              ),

        minimumItemsCount:
          coupon.minimum_items_count,

        usageLimit:
          coupon.usage_limit,

        usageCount:
          coupon.usage_count,

        perUserLimit:
          coupon.per_user_limit,

        userUsageCount,

        firstOrderOnly:
          coupon.first_order_only,

        autoApply:
          coupon.auto_apply,

        applicationScope:
          coupon.application_scope,

        startsAt:
          coupon.starts_at,

        expiresAt:
          coupon.expires_at,

        state:
          resolveCouponState({
            coupon,
            userUsageCount,
            successfulOrders:
              profile.successful_orders_count,
          }),
      };
    });

  const availableCount =
    coupons.filter(
      (coupon) =>
        coupon.state === "available",
    ).length;

  return (
    <AppShell>
      <section className="coupons-page">
        <header className="coupons-heading">
          <div>
            <span>
              عروض مخصصة ليك
            </span>

            <h1>
              كوبوناتي
            </h1>

            <p>
              استخدمي الكوبونات المتاحة
              أثناء إتمام الطلب، وتابعي
              مدة الصلاحية والشروط.
            </p>
          </div>

          <span className="coupons-count">
            <Gift size={16} />

            {availableCount.toLocaleString(
              "ar-EG",
            )}{" "}
            متاح
          </span>
        </header>

        <section className="coupons-info">
          <TicketPercent size={18} />

          <p>
            بعض الكوبونات تكون عامة،
            وبعضها مخصص لحسابك أو مستواك
            فقط. الخصم النهائي يُراجع
            داخل السيرفر قبل إتمام الطلب.
          </p>
        </section>

        <CustomerCoupons
          coupons={coupons}
        />
      </section>
    </AppShell>
  );
}
