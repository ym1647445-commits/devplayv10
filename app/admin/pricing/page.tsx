import { createClient } from "@/lib/supabase/server";
import { PricingManager } from "@/components/admin/pricing/PricingManager";

export default async function PricingPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("platform_settings")
    .select(`
      usd_to_egp_rate,
      profit_per_usd_egp,
      minimum_profit_egp,
      api_pricing_mode,
      default_profit_usd,
      default_markup_percentage,
      low_supplier_balance_usd,
      auto_disable_over_balance,
      points_per_usd,
      egp_deposit_fee_per_1000,
      egp_deposit_minimum_fee,
      usd_deposit_fixed_fee,
      pricing_updated_at,
      updated_at
    `)
    .eq("id", 1)
    .single();

  return (
    <PricingManager
      initialSettings={{
        usdToEgpRate:
          Number(data?.usd_to_egp_rate ?? 57),

        profitPerUsdEgp:
          Number(data?.profit_per_usd_egp ?? 15),

        minimumProfitEgp:
          Number(data?.minimum_profit_egp ?? 5),

        apiPricingMode:
          data?.api_pricing_mode ??
          "fixed_usd",

        defaultProfitUsd:
          Number(
            data?.default_profit_usd ?? 0.20,
          ),

        defaultMarkupPercentage:
          Number(
            data?.default_markup_percentage ??
              15,
          ),

        lowSupplierBalanceUsd:
          Number(
            data?.low_supplier_balance_usd ??
              20,
          ),

        autoDisableOverBalance:
          data?.auto_disable_over_balance ??
          true,

        pointsPerUsd:
          Number(data?.points_per_usd ?? 100),

        egpDepositFeePer1000:
          Number(
            data?.egp_deposit_fee_per_1000 ??
              5,
          ),

        egpDepositMinimumFee:
          Number(
            data?.egp_deposit_minimum_fee ??
              5,
          ),

        usdDepositFixedFee:
          Number(
            data?.usd_deposit_fixed_fee ??
              0.30,
          ),

        pricingUpdatedAt:
          data?.pricing_updated_at ??
          null,

        updatedAt:
          data?.updated_at ??
          new Date().toISOString(),
      }}
    />
  );
}