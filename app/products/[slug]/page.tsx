import {
  notFound,
} from "next/navigation";

import {
  AppShell,
} from "@/components/layout/AppShell";

import {
  ProductDetails,
} from "@/components/product/ProductDetails";

import {
  createClient,
} from "@/lib/supabase/server";

import type {
  ProductRequiredField,
} from "@/types/product";
import type { SavedGameAccount } from "@/app/account/game-accounts/types";
import { resolveGameAccountFields } from "@/lib/game-accounts/catalog";

interface StoreOfferRow {
  id: string;

  provider_offer_id: string;

  name_ar: string;
  name_en: string | null;

  supplier_price_usd:
    | number
    | string;

  profit_usd:
    | number
    | string;

  manual_selling_price_usd: number | string | null;

  old_price_usd:
    | number
    | string
    | null;

  stock:
    | number
    | null;

  available: boolean;
  active: boolean;

  required_fields:
    | ProductRequiredField[]
    | null;

  provider_data:
    | Record<string, unknown>
    | null;

  instructions_ar:
    | string
    | null;

  customer_note_ar:
    | string
    | null;

  sort_order: number;
}

interface StoreCategoryRow {
  id: string;
  name_ar: string;
  slug: string;
}

interface StoreProductRow {
  id: string;

  slug: string;

  name_ar: string;
  name_en: string | null;

  short_description_ar:
    | string
    | null;

  description_ar:
    | string
    | null;

  image_url:
    | string
    | null;

  active: boolean;
  featured: boolean;
  instant_delivery: boolean;

  delivery_time:
    | string
    | null;

  badge:
    | string
    | null;

  required_fields:
    | ProductRequiredField[]
    | null;

  category:
    | StoreCategoryRow
    | StoreCategoryRow[]
    | null;

  store_product_offers:
    StoreOfferRow[];
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

export default async function ProductPage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const {
    slug,
  } = await params;

  const supabase =
    await createClient();

  const [
    productResult,
    settingsResult,
    userResult,
  ] = await Promise.all([
    supabase
      .from(
        "store_products",
      )
      .select(`
        id,
        slug,
        name_ar,
        name_en,
        short_description_ar,
        description_ar,
        image_url,
        active,
        featured,
        instant_delivery,
        delivery_time,
        badge,
        required_fields,

        category:store_categories(
          id,
          name_ar,
          slug
        ),

        store_product_offers(
          id,
          provider_offer_id,
          name_ar,
          name_en,
          supplier_price_usd,
          profit_usd,
          manual_selling_price_usd,
          old_price_usd,
          stock,
          available,
          active,
          required_fields,
          provider_data,
          instructions_ar,
          customer_note_ar,
          sort_order
        )
      `)
      .eq(
        "slug",
        slug,
      )
      .eq(
        "active",
        true,
      )
      .single<StoreProductRow>(),

    supabase
      .from(
        "platform_settings",
      )
      .select(
        "usd_to_egp_rate",
      )
      .eq(
        "id",
        1,
      )
      .maybeSingle<{
        usd_to_egp_rate:
          | number
          | string
          | null;
      }>(),
    supabase.auth.getUser(),
  ]);

  const product =
    productResult.data;

  if (
    productResult.error ||
    !product
  ) {
    console.error(
      "PRODUCT DETAILS LOAD ERROR:",
      productResult.error,
    );

    notFound();
  }

  const usdToEgpRate =
    Number(
      settingsResult.data
        ?.usd_to_egp_rate ??
        50,
    );

  const safeUsdRate =
    Number.isFinite(
      usdToEgpRate,
    ) &&
    usdToEgpRate > 0
      ? usdToEgpRate
      : 50;

  const category =
    getRelation(
      product.category,
    );

  const offers =
    (
      product
        .store_product_offers ??
      []
    )
      .filter(
        (offer) =>
          offer.active &&
          offer.available,
      )
      .sort(
        (
          a,
          b,
        ) =>
          a.sort_order -
          b.sort_order,
      );

  const compatibleFields = resolveGameAccountFields(product.required_fields, offers);
  let savedAccounts: SavedGameAccount[] = [];
  const user = userResult.data.user;
  if (user && compatibleFields.length > 0) {
    const { data } = await supabase
      .from("saved_game_accounts")
      .select("id, product_id, nickname, identifiers, is_default, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false });
    savedAccounts = (data ?? []).map((row) => ({
      id: row.id,
      productId: row.product_id,
      nickname: row.nickname,
      identifiers: row.identifiers as Record<string, string>,
      isDefault: row.is_default,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
  return (
    <AppShell>
      <ProductDetails
        authenticated={Boolean(user)}
        savedAccounts={savedAccounts}
        savedFieldIds={compatibleFields.map((field) => field.id)}
        product={{
          id:
            product.id,

          slug:
            product.slug,

          nameAr:
            product.name_ar,

          nameEn:
            product.name_en,

          shortDescriptionAr:
            product.short_description_ar,

          descriptionAr:
            product.description_ar,

          imageUrl:
            product.image_url,

          featured:
            product.featured,

          instantDelivery:
            product.instant_delivery,

          deliveryTime:
            product.delivery_time,

          badge:
            product.badge,

          usdToEgpRate:
            safeUsdRate,

          category:
            category
              ? {
                  id:
                    category.id,

                  nameAr:
                    category.name_ar,

                  slug:
                    category.slug,
                }
              : null,

          defaultRequiredFields:
            product.required_fields ??
            [],

          offers:
            offers.map(
              (offer) => ({
                id:
                  offer.id,

                providerOfferId:
                  offer.provider_offer_id,

                nameAr:
                  offer.name_ar,

                nameEn:
                  offer.name_en,

                supplierPriceUsd:
                  Number(
                    offer.supplier_price_usd,
                  ),

                profitUsd:
                  Number(
                    offer.profit_usd,
                  ),

                manualSellingPriceUsd:
                  offer.manual_selling_price_usd === null ? null : Number(offer.manual_selling_price_usd),

                finalPriceUsd:
                  offer.manual_selling_price_usd === null
                    ? Number(offer.supplier_price_usd) + Number(offer.profit_usd)
                    : Number(offer.manual_selling_price_usd),

                oldPriceUsd:
                  offer.old_price_usd ===
                  null
                    ? null
                    : Number(
                        offer.old_price_usd,
                      ),

                stock:
                  offer.stock,

                requiredFields:
                  offer.required_fields ??
                  [],

                catalogType:
                  offer.provider_data?.catalog_type === "topup" ||
                  offer.provider_data?.catalog_type === "gc"
                    ? offer.provider_data.catalog_type
                    : null,

                instructionsAr:
                  offer.instructions_ar,

                customerNoteAr:
                  offer.customer_note_ar,
              }),
            ),
        }}
      />
    </AppShell>
  );
}
