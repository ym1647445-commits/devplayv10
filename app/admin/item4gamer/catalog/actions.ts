"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

interface SourceOffer {
  id: string; provider_offer_id: string; name: string; price: number | string;
  original_price: number | string | null; currency: string; stock: number | null;
  available: boolean; raw_data: Record<string, unknown>;
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول أولًا.");
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single<{ role: string; status: string }>();
  if (!profile || profile.status !== "active" || !["admin", "super_admin", "owner"].includes(profile.role)) throw new Error("ليس لديك صلاحية الإدارة.");
  return { supabase, adminId: user.id };
}

function cleanProductName(name: string) {
  const cleaned = name
    .replace(/\b(top[ -]?up|diamonds?|golds?|gems?|credits?|tokens?\s*&\s*packages?|genesis crystals?|lattices|wallet)\b/gi, " ")
    .replace(/\bUC\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || name.trim();
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/&amp;/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function requiredFields(raw: Record<string, unknown>) {
  if (!Array.isArray(raw.fields)) return [];
  return raw.fields.map((entry) => {
    const field = entry as { data_name?: string; name?: string; type?: string; required?: boolean };
    const rawType = String(field.type ?? "text").toLowerCase();
    const type = ["number", "email", "url", "tel"].includes(rawType) ? rawType : "text";
    return { id: String(field.data_name ?? ""), label: String(field.name ?? field.data_name ?? ""), type, required: Boolean(field.required) };
  }).filter((field) => field.id);
}

async function profitFor(supabase: Awaited<ReturnType<typeof createClient>>, cost: number) {
  const { data } = await supabase.from("platform_settings").select("api_pricing_mode,default_profit_usd,default_markup_percentage,usd_to_egp_rate,profit_per_usd_egp").eq("id", 1).maybeSingle<Record<string, number | string | null>>();
  if (data?.api_pricing_mode === "percentage") return Math.max(0, cost * Number(data.default_markup_percentage ?? 0) / 100);
  if (data?.api_pricing_mode === "manual") return 0;
  const rate = Number(data?.usd_to_egp_rate ?? 0);
  const perDollar = Number(data?.profit_per_usd_egp ?? 0);
  return Math.max(0, rate > 0 ? cost * perDollar / rate : Number(data?.default_profit_usd ?? 0.2));
}

export async function importAllItem4GamerOffers(categoryRowId: string) {
  try {
    const { supabase, adminId } = await requireAdmin();
    const { data: category, error: categoryError } = await supabase.from("provider_categories").select("id,provider_category_id,name,catalog_type").eq("id", categoryRowId).eq("provider_name", "item4gamer").single<{ id: string; provider_category_id: string; name: string; catalog_type: "topup" | "gc" }>();
    if (categoryError || !category) throw categoryError ?? new Error("الخدمة غير موجودة.");
    const { data: offers, error: offersError } = await supabase.from("provider_offers").select("id,provider_offer_id,name,price,original_price,currency,stock,available,raw_data").eq("provider_name", "item4gamer").eq("catalog_type", category.catalog_type).eq("provider_category_id", category.provider_category_id).eq("available", true).order("price").returns<SourceOffer[]>();
    if (offersError) throw offersError;
    if (!offers?.length) return { success: false, message: "زامني باقات الخدمة أولًا.", productId: null, importedCount: 0 };

    const productName = cleanProductName(category.name);
    const productSlug = slugify(productName) || `item4gamer-${category.provider_category_id}`;
    const categorySlug = category.catalog_type === "gc" ? "gift-cards" : "games";
    const categoryTitle = category.catalog_type === "gc" ? "بطاقات رقمية" : "الألعاب";
    let { data: storeCategory } = await supabase.from("store_categories").select("id").eq("slug", categorySlug).maybeSingle<{ id: string }>();
    if (!storeCategory) {
      const created = await supabase.from("store_categories").insert({ slug: categorySlug, name_ar: categoryTitle, name_en: categorySlug === "games" ? "Games" : "Gift Cards", active: true }).select("id").single<{ id: string }>();
      if (created.error || !created.data) throw created.error ?? new Error("تعذر إنشاء قسم المتجر.");
      storeCategory = created.data;
    }

    let { data: product } = await supabase.from("store_products").select("id").eq("slug", productSlug).maybeSingle<{ id: string }>();
    if (!product) {
      const created = await supabase.from("store_products").insert({
        external_id: `item4gamer:${category.catalog_type}:${category.provider_category_id}`,
        supplier_product_id: category.provider_category_id,
        category_id: storeCategory.id,
        slug: productSlug,
        name_ar: productName,
        name_en: productName,
        short_description_ar: `جميع باقات ${productName} المتاحة`,
        description_ar: `اختر باقة ${productName} المناسبة وأدخل بيانات الحساب المطلوبة بدقة.`,
        supplier_price_usd: 0, profit_usd: 0, minimum_quantity: 1, maximum_quantity: 1,
        required_fields: [], status: "available", active: true, featured: false, instant_delivery: true,
        provider_data: { provider: "item4gamer", provider_product_id: category.provider_category_id, catalog_type: category.catalog_type, product_type: "provider_group" },
      }).select("id").single<{ id: string }>();
      if (created.error || !created.data) throw created.error ?? new Error("تعذر إنشاء المنتج الرئيسي.");
      product = created.data;
    }

    const { data: provider } = await supabase.from("providers").select("id").eq("code", "item4gamer").single<{ id: string }>();
    if (!provider) throw new Error("إعداد Item4Gamer غير موجود في جدول providers.");
    let importedCount = 0;
    for (const offer of offers) {
      const cost = Number(offer.price);
      if (!Number.isFinite(cost) || cost < 0) continue;
      const profit = await profitFor(supabase, cost);
      const fields = requiredFields(offer.raw_data ?? {});
      const payload = {
        product_id: product.id, provider_name: "item4gamer", provider_id: provider.id,
        provider_offer_row_id: offer.id, provider_offer_id: offer.provider_offer_id,
        provider_product_id: category.provider_category_id, provider_variation_id: offer.provider_offer_id,
        provider_currency: offer.currency || "USD", provider_status: offer.available ? "available" : "out_of_stock",
        name_ar: offer.name, name_en: offer.name, supplier_price_usd: cost, profit_usd: profit,
        old_price_usd: offer.original_price === null ? null : Number(offer.original_price), stock: offer.stock,
        available: offer.available, active: true, required_fields: fields,
        execution_type: typeof offer.raw_data.delivery_type === "string" ? offer.raw_data.delivery_type : null,
        provider_data: { provider: "item4gamer", catalog_type: category.catalog_type, provider_product_id: category.provider_category_id, provider_variation_id: offer.provider_offer_id, raw_data: offer.raw_data },
        last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase.from("store_product_offers").select("id").eq("provider_offer_row_id", offer.id).maybeSingle<{ id: string }>();
      const { error } = existing
        ? await supabase.from("store_product_offers").update(payload).eq("id", existing.id)
        : await supabase.from("store_product_offers").insert(payload);
      if (error) throw error;
      await supabase.from("provider_offers").update({ imported_to_store: true, updated_at: new Date().toISOString() }).eq("id", offer.id);
      importedCount += 1;
    }
    await supabase.from("activity_logs").insert({ actor_id: adminId, action: "item4gamer_product_imported", entity_type: "store_product", entity_id: product.id, description: `Imported all Item4Gamer offers for ${productName}`, new_data: { provider_product_id: category.provider_category_id, imported_count: importedCount } });
    for (const path of ["/admin/item4gamer", "/admin/item4gamer/catalog", "/admin/products", "/products", `/products/${productSlug}`]) revalidatePath(path);
    return { success: true, message: `تم وضع ${importedCount} باقة تحت منتج ${productName}.`, productId: product.id, importedCount };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "تعذر الاستيراد الجماعي.", productId: null, importedCount: 0 };
  }
}
