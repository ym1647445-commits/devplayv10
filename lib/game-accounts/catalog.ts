import type { SupabaseClient } from "@supabase/supabase-js";

import type { GameAccountProduct } from "@/app/account/game-accounts/types";
import type { ProductRequiredField } from "@/types/product";

interface CatalogOfferRow {
  required_fields: ProductRequiredField[] | null;
  provider_data: Record<string, unknown> | null;
  active: boolean;
  available: boolean;
  sort_order: number;
}

interface CatalogProductRow {
  id: string;
  slug: string;
  name_ar: string;
  image_url: string | null;
  required_fields: ProductRequiredField[] | null;
  provider_data: Record<string, unknown> | null;
  store_product_offers: CatalogOfferRow[] | null;
}

export function safeGameAccountFields(fields: ProductRequiredField[] | null | undefined): ProductRequiredField[] {
  if (!Array.isArray(fields)) return [];
  const valid = fields.filter((field) => Boolean(field?.id && field?.label));
  const containsSensitiveCredential = valid.some((field) =>
    /password|passcode|otp|2fa|token|recovery|secret|كلمة\s*المرور|رمز\s*التحقق|استرداد/i.test(`${field.id} ${field.label}`),
  );
  return containsSensitiveCredential ? [] : valid;
}

export function resolveGameAccountFields(
  defaultFields: ProductRequiredField[] | null | undefined,
  offers: CatalogOfferRow[] | null | undefined,
): ProductRequiredField[] {
  const defaults = safeGameAccountFields(defaultFields);
  if (defaults.length > 0) return defaults;

  const topupOffers = (offers ?? [])
    .filter((offer) => offer.active && offer.available && offer.provider_data?.catalog_type !== "gc")
    .sort((a, b) => a.sort_order - b.sort_order);

  for (const offer of topupOffers) {
    const fields = safeGameAccountFields(offer.required_fields);
    if (fields.length > 0) return fields;
  }

  return [];
}

export async function loadGameAccountProducts(
  supabase: SupabaseClient,
  productId?: string,
): Promise<GameAccountProduct[]> {
  let query = supabase
    .from("store_products")
    .select(`
      id,
      slug,
      name_ar,
      image_url,
      required_fields,
      provider_data,
      store_product_offers(
        required_fields,
        provider_data,
        active,
        available,
        sort_order
      )
    `)
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("name_ar");

  if (productId) query = query.eq("id", productId);
  const { data, error } = await query.returns<CatalogProductRow[]>();

  if (error) throw error;

  return (data ?? []).flatMap((product) => {
    if (product.provider_data?.catalog_type === "gc") return [];
    const fields = resolveGameAccountFields(product.required_fields, product.store_product_offers);
    if (fields.length === 0) return [];
    return [{ id: product.id, slug: product.slug, name: product.name_ar, imageUrl: product.image_url, fields }];
  });
}
