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

  return (
    <AppShell>
      <ProductDetails
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

                finalPriceUsd:
                  Number(
                    offer.supplier_price_usd,
                  ) +
                  Number(
                    offer.profit_usd,
                  ),

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
