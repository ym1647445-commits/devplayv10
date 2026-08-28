"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type {
  AdminPricingActionResult,
  AdminPricingFormInput,
  AdminPricingSettings,
  ApiPricingMode,
} from "@/types/adminPricing";

interface PricingRpcResult {
  success: boolean;

  usd_to_egp_rate:
    | number
    | string;

  profit_per_usd_egp:
    | number
    | string;

  minimum_profit_egp:
    | number
    | string;

  api_pricing_mode:
    ApiPricingMode;

  default_profit_usd:
    | number
    | string;

  default_markup_percentage:
    | number
    | string;

  low_supplier_balance_usd:
    | number
    | string;

  auto_disable_over_balance:
    boolean;

  points_per_usd:
    number;

  egp_deposit_fee_per_1000:
    | number
    | string;

  egp_deposit_minimum_fee:
    | number
    | string;

  usd_deposit_fixed_fee:
    | number
    | string;

  pricing_updated_at:
    string | null;
}

async function requireAdmin() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "يجب تسجيل الدخول أولًا.",
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      role,
      status
    `)
    .eq("id", user.id)
    .single<{
      role: string;
      status: string;
    }>();

  const allowedRoles = [
    "admin",
    "super_admin",
    "owner",
  ];

  if (
    profileError ||
    !profile ||
    profile.status !== "active" ||
    !allowedRoles.includes(
      profile.role,
    )
  ) {
    throw new Error(
      "ليس لديك صلاحية لإدارة التسعير.",
    );
  }

  return {
    supabase,
  };
}

function isValidNumber(
  value: number,
  minimum = 0,
): boolean {
  return (
    Number.isFinite(value) &&
    value >= minimum
  );
}

function validatePricingInput(
  input: AdminPricingFormInput,
): string | null {
  if (
    !isValidNumber(
      input.usdToEgpRate,
      0.0001,
    )
  ) {
    return "سعر الدولار غير صحيح.";
  }

  if (
    !isValidNumber(
      input.profitPerUsdEgp,
    )
  ) {
    return "الربح لكل دولار غير صحيح.";
  }

  if (
    !isValidNumber(
      input.minimumProfitEgp,
    )
  ) {
    return "أقل ربح مسموح غير صحيح.";
  }

  if (
    ![
      "fixed_usd",
      "percentage",
      "manual",
    ].includes(
      input.apiPricingMode,
    )
  ) {
    return "طريقة تسعير الـAPI غير صحيحة.";
  }

  if (
    !isValidNumber(
      input.defaultProfitUsd,
    )
  ) {
    return "الربح الافتراضي بالدولار غير صحيح.";
  }

  if (
    !isValidNumber(
      input.defaultMarkupPercentage,
    ) ||
    input.defaultMarkupPercentage >
      1000
  ) {
    return "نسبة الربح غير صحيحة.";
  }

  if (
    !isValidNumber(
      input.lowSupplierBalanceUsd,
    )
  ) {
    return "حد تنبيه رصيد المورد غير صحيح.";
  }

  if (
    !Number.isInteger(
      input.pointsPerUsd,
    ) ||
    input.pointsPerUsd < 0
  ) {
    return "عدد نقاط الدولار غير صحيح.";
  }

  if (
    !isValidNumber(
      input.egpDepositFeePer1000,
    )
  ) {
    return "رسوم الإيداع بالجنيه غير صحيحة.";
  }

  if (
    !isValidNumber(
      input.egpDepositMinimumFee,
    )
  ) {
    return "الحد الأدنى للرسوم غير صحيح.";
  }

  if (
    !isValidNumber(
      input.usdDepositFixedFee,
    )
  ) {
    return "رسوم الإيداع بالدولار غير صحيحة.";
  }

  return null;
}

function translatePricingError(
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
      "admin permission required",
    )
  ) {
    return "ليس لديك صلاحية لتنفيذ العملية.";
  }

  if (
    normalized.includes(
      "invalid usd exchange rate",
    )
  ) {
    return "سعر الدولار غير صحيح.";
  }

  if (
    normalized.includes(
      "invalid api pricing mode",
    )
  ) {
    return "طريقة التسعير غير صحيحة.";
  }

  if (normalized.includes("could not find the function") || normalized.includes("pgrst202")) {
    return "دالة حفظ التسعير غير مثبتة بعد. شغّلي ملف pricing_manual_override_safe_v2.sql كاملًا في Supabase SQL Editor ثم أعيدي المحاولة.";
  }

  return message;
}

function revalidatePricingPages(): void {
  revalidatePath("/admin/pricing");
  revalidatePath("/admin");
  revalidatePath("/admin/products");

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/categories/[slug]", "page");
  revalidatePath("/search");
  revalidatePath("/offers");
  revalidatePath("/games-topup");
  revalidatePath("/gift-cards-egypt");

  revalidatePath("/wallet");
  revalidatePath("/wallet/deposit");

  revalidatePath("/cart");
  revalidatePath("/checkout");

  revalidatePath("/rewards");
}

export async function updateAdminPricing(
  input: AdminPricingFormInput,
): Promise<AdminPricingActionResult> {
  try {
    const validation =
      validatePricingInput(input);

    if (validation) {
      return {
        success: false,
        message: validation,
      };
    }

    const { supabase } =
      await requireAdmin();

    const {
      data,
      error,
    } = await supabase.rpc(
      "admin_update_platform_pricing_v2",
      {
        p_usd_to_egp_rate:
          input.usdToEgpRate,

        p_profit_per_usd_egp:
          input.profitPerUsdEgp,

        p_minimum_profit_egp:
          input.minimumProfitEgp,

        p_api_pricing_mode:
          input.apiPricingMode,

        p_default_profit_usd:
          input.defaultProfitUsd,

        p_default_markup_percentage:
          input.defaultMarkupPercentage,

        p_low_supplier_balance_usd:
          input.lowSupplierBalanceUsd,

        p_auto_disable_over_balance:
          input.autoDisableOverBalance,

        p_points_per_usd:
          input.pointsPerUsd,

        p_egp_deposit_fee_per_1000:
          input.egpDepositFeePer1000,

        p_egp_deposit_minimum_fee:
          input.egpDepositMinimumFee,

        p_usd_deposit_fixed_fee:
          input.usdDepositFixedFee,
      },
    );

    if (error) {
      throw error;
    }

    const rawResult =
      Array.isArray(data)
        ? data[0]
        : data;

    if (!rawResult) {
      return {
        success: false,
        message:
          "تم تنفيذ التحديث لكن تعذر قراءة الإعدادات.",
      };
    }

    const result =
      rawResult as PricingRpcResult;

    const { error: repriceError } = await supabase.rpc(
      "admin_reprice_provider_offers_v2",
    );

    if (repriceError) {
      return {
        success: false,
        message: "تم حفظ الإعدادات، لكن تعذر إعادة تسعير الباقات الحالية. شغّلي ملف pricing_manual_override_safe_v2.sql ثم احفظي مرة أخرى.",
      };
    }

    const settings:
      AdminPricingSettings = {
        usdToEgpRate:
          Number(
            result.usd_to_egp_rate,
          ),

        profitPerUsdEgp:
          Number(
            result.profit_per_usd_egp,
          ),

        minimumProfitEgp:
          Number(
            result.minimum_profit_egp,
          ),

        apiPricingMode:
          result.api_pricing_mode,

        defaultProfitUsd:
          Number(
            result.default_profit_usd,
          ),

        defaultMarkupPercentage:
          Number(
            result.default_markup_percentage,
          ),

        lowSupplierBalanceUsd:
          Number(
            result.low_supplier_balance_usd,
          ),

        autoDisableOverBalance:
          result.auto_disable_over_balance,

        pointsPerUsd:
          Number(
            result.points_per_usd,
          ),

        egpDepositFeePer1000:
          Number(
            result.egp_deposit_fee_per_1000,
          ),

        egpDepositMinimumFee:
          Number(
            result.egp_deposit_minimum_fee,
          ),

        usdDepositFixedFee:
          Number(
            result.usd_deposit_fixed_fee,
          ),

        pricingUpdatedAt:
          result.pricing_updated_at,

        updatedAt:
          result.pricing_updated_at ??
          new Date().toISOString(),
      };

    revalidatePricingPages();

    return {
      success: true,
      message:
        "تم حفظ إعدادات التسعير بنجاح.",

      settings,
    };
  } catch (error) {
    return {
      success: false,

      message: translatePricingError(
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "تعذر حفظ إعدادات التسعير.",
      ),
    };
  }
}
