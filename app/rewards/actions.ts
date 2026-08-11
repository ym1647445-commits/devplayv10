"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { RewardRedemptionResult } from "@/types/reward";

interface RedeemRewardRpcResult {
  success: boolean;

  coupon_id: string;
  coupon_code: string;

  coupon_value_egp:
    | number
    | string;

  minimum_cart_egp:
    | number
    | string;

  points_spent: number;
  points_remaining: number;

  expires_at: string;
}

function translateRewardError(
  message: string,
): string {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "authentication required",
    )
  ) {
    return "يجب تسجيل الدخول أولًا.";
  }

  if (
    normalized.includes(
      "customer profile not found",
    )
  ) {
    return "تعذر العثور على بيانات الحساب.";
  }

  if (
    normalized.includes(
      "customer account is not active",
    )
  ) {
    return "الحساب غير متاح لاستخدام المكافآت حاليًا.";
  }

  if (
    normalized.includes(
      "reward not found",
    )
  ) {
    return "المكافأة غير موجودة.";
  }

  if (
    normalized.includes(
      "reward is currently unavailable",
    )
  ) {
    return "المكافأة غير متاحة حاليًا.";
  }

  if (
    normalized.includes(
      "reward redemption limit reached",
    )
  ) {
    return "انتهى العدد المتاح من هذه المكافأة.";
  }

  if (
    normalized.includes(
      "customer reward redemption limit reached",
    )
  ) {
    return "وصلتِ للحد الأقصى المسموح من هذه المكافأة.";
  }

  if (
    normalized.includes(
      "insufficient points",
    )
  ) {
    return "رصيد النقاط غير كافٍ لاستبدال هذه المكافأة.";
  }

  if (
    normalized.includes(
      "could not generate a unique coupon code",
    )
  ) {
    return "تعذر إنشاء كود الكوبون، جربي مرة أخرى.";
  }

  return message;
}

export async function redeemReward(
  rewardId: string,
): Promise<RewardRedemptionResult> {
  try {
    if (!rewardId) {
      return {
        success: false,
        message:
          "بيانات المكافأة غير صحيحة.",
      };
    }

    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        message:
          "يجب تسجيل الدخول أولًا.",
      };
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "redeem_reward",
      {
        p_reward_id: rewardId,
      },
    );

    if (error) {
      return {
        success: false,

        message:
          translateRewardError(
            error.message,
          ),
      };
    }

    const rawResult =
      Array.isArray(data)
        ? data[0]
        : data;

    if (!rawResult) {
      return {
        success: false,
        message:
          "تم تنفيذ العملية لكن تعذر قراءة النتيجة.",
      };
    }

    const result =
      rawResult as RedeemRewardRpcResult;

    revalidatePath("/rewards");
    revalidatePath("/coupons");
    revalidatePath("/notifications");
    revalidatePath("/account");
    revalidatePath("/admin/customers");

    return {
      success: true,

      message:
        "تم استبدال المكافأة وإضافة الكوبون إلى حسابك.",

      coupon: {
        id: result.coupon_id,

        code:
          result.coupon_code,

        valueEgp: Number(
          result.coupon_value_egp,
        ),

        minimumCartEgp: Number(
          result.minimum_cart_egp,
        ),

        pointsSpent: Number(
          result.points_spent,
        ),

        pointsRemaining: Number(
          result.points_remaining,
        ),

        expiresAt:
          result.expires_at,
      },
    };
  } catch (error) {
    console.error(
      "Redeem reward error:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? translateRewardError(
              error.message,
            )
          : "حدث خطأ أثناء استبدال المكافأة.",
    };
  }
}
