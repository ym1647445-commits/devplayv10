import {
  ProviderOffersManager,
} from "@/components/admin/provider-offers/ProviderOffersManager";

import {
  createClient,
} from "@/lib/supabase/server";

interface ProviderCategoryRelation {
  id: string;
  name: string;

  catalog_type:
    | "topup"
    | "gc";

  provider_category_id: string;
}

interface ProviderOfferRow {
  id: string;

  provider_name: string;

  catalog_type:
    | "topup"
    | "gc";

  provider_category_id: string;
  provider_offer_id: string;

  name: string;

  price:
    | number
    | string;

  original_price:
    | number
    | string
    | null;

  currency: string;

  stock:
    | number
    | null;

  available: boolean;

  imported_to_store: boolean;

  store_product_id:
    | string
    | null;

  last_synced_at: string;

  provider_categories:
    | ProviderCategoryRelation
    | ProviderCategoryRelation[]
    | null;
}

function getRelation<T>(
  relation:
    | T
    | T[]
    | null,
): T | null {
  if (
    Array.isArray(
      relation,
    )
  ) {
    return (
      relation[0] ??
      null
    );
  }

  return relation;
}

export default async function ProviderOffersPage() {
  const supabase =
    await createClient();

  const [
    offersResult,
    settingsResult,
  ] = await Promise.all([
    supabase
      .from(
        "provider_offers",
      )
      .select(`
        id,
        provider_name,
        catalog_type,
        provider_category_id,
        provider_offer_id,
        name,
        price,
        original_price,
        currency,
        stock,
        available,
        imported_to_store,
        store_product_id,
        last_synced_at,
        provider_categories (
          id,
          name,
          catalog_type,
          provider_category_id
        )
      `)
      .eq(
        "provider_name",
        "flexy",
      )
      .order(
        "last_synced_at",
        {
          ascending: false,
        },
      )
      .returns<
        ProviderOfferRow[]
      >(),

    supabase
      .from(
        "platform_settings",
      )
      .select(`
        usd_to_egp_rate,
        api_pricing_mode,
        default_profit_usd,
        default_markup_percentage,
        profit_per_usd_egp
      `)
      .eq("id", 1)
      .single(),
  ]);

  const offers =
    offersResult.error
      ? []
      : (
          offersResult.data ??
          []
        ).map(
          (offer) => {
            const category =
              getRelation(
                offer.provider_categories,
              );

            return {
              id:
                offer.id,

              providerName:
                offer.provider_name,

              catalogType:
                offer.catalog_type,

              providerCategoryId:
                offer.provider_category_id,

              providerOfferId:
                offer.provider_offer_id,

              name:
                offer.name,

              categoryName:
                category?.name ??
                "قسم غير معروف",

              price:
                Number(
                  offer.price,
                ),

              originalPrice:
                offer.original_price ===
                null
                  ? null
                  : Number(
                      offer.original_price,
                    ),

              currency:
                offer.currency,

              stock:
                offer.stock,

              available:
                offer.available,

              importedToStore:
                offer.imported_to_store,

              storeProductId:
                offer.store_product_id,

              lastSyncedAt:
                offer.last_synced_at,
            };
          },
        );

  const settings = {
    usdToEgpRate:
      Number(
        settingsResult.data
          ?.usd_to_egp_rate ??
          57,
      ),

    apiPricingMode:
      (
        settingsResult.data
          ?.api_pricing_mode ??
        "fixed_usd"
      ) as
        | "fixed_usd"
        | "percentage"
        | "manual",

    defaultProfitUsd:
      Number(
        settingsResult.data
          ?.default_profit_usd ??
          0.2,
      ),

    defaultMarkupPercentage:
      Number(
        settingsResult.data
          ?.default_markup_percentage ??
          15,
      ),

    profitPerUsdEgp:
      Number(
        settingsResult.data
          ?.profit_per_usd_egp ??
          15,
      ),
  };

  return (
    <ProviderOffersManager
      offers={offers}
      pricingSettings={
        settings
      }
      loadError={
        offersResult.error
          ?.message ??
        null
      }
    />
  );
}