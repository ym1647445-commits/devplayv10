"use server";

import { revalidatePath } from "next/cache";

import { importProviderOfferToStore } from "@/app/admin/provider-offers/actions";
import { item4gamerAdapter } from "@/lib/providers/item4gamer/adapter";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول أولًا.");
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single<{ role: string; status: string }>();
  if (!profile || profile.status !== "active" || !["admin", "super_admin", "owner"].includes(profile.role)) throw new Error("ليس لديك صلاحية الإدارة.");
  return { supabase, adminId: user.id };
}

export async function syncItem4GamerProducts() {
  try {
    const { supabase, adminId } = await requireAdmin();
    const now = new Date().toISOString();
    let count = 0;
    for (const kind of ["topup", "gift_card"] as const) {
      const products = await item4gamerAdapter.getProducts(kind);
      const catalogType = kind === "gift_card" ? "gc" : "topup";
      for (const product of products) {
        const { data: existing, error: readError } = await supabase.from("provider_categories").select("id").eq("provider_name", "item4gamer").eq("catalog_type", catalogType).eq("provider_category_id", product.id).maybeSingle<{ id: string }>();
        if (readError) throw readError;
        const payload = {
          provider_name: "item4gamer", catalog_type: catalogType, provider_category_id: product.id,
          name: product.name, provider_category: product.category ?? null, active: true,
          raw_data: product.raw, last_synced_at: now,
        };
        const { error } = existing
          ? await supabase.from("provider_categories").update(payload).eq("id", existing.id)
          : await supabase.from("provider_categories").insert(payload);
        if (error) throw error;
        count += 1;
      }
    }
    const balance = await item4gamerAdapter.getBalance();
    await supabase.from("providers").update({ active: true, status: "healthy", current_balance: balance.amount, balance_currency: balance.currency, last_balance_at: balance.capturedAt, last_sync_at: now, last_error: null, updated_at: now }).eq("code", "item4gamer");
    await supabase.from("activity_logs").insert({ actor_id: adminId, action: "item4gamer_products_synced", entity_type: "provider", description: "Synced Item4Gamer products", new_data: { products_count: count } });
    revalidatePath("/admin/item4gamer");
    return { success: true, message: `تمت مزامنة ${count} خدمة من Item4Gamer.` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "تعذرت المزامنة." };
  }
}

export async function syncItem4GamerVariations(categoryRowId: string) {
  try {
    const { supabase, adminId } = await requireAdmin();
    const { data: category, error: categoryError } = await supabase.from("provider_categories").select("id,provider_category_id,catalog_type,name").eq("id", categoryRowId).eq("provider_name", "item4gamer").single<{ id: string; provider_category_id: string; catalog_type: "topup" | "gc"; name: string }>();
    if (categoryError || !category) throw categoryError ?? new Error("الخدمة غير موجودة.");
    const variations = await item4gamerAdapter.getVariations(category.provider_category_id);
    const existingResult = await supabase.from("provider_offers").select("id,provider_offer_id").eq("provider_name", "item4gamer").eq("catalog_type", category.catalog_type).eq("provider_category_id", category.provider_category_id).returns<Array<{ id: string; provider_offer_id: string }>>();
    if (existingResult.error) throw existingResult.error;
    const existing = new Map((existingResult.data ?? []).map((row) => [row.provider_offer_id, row.id]));
    const now = new Date().toISOString();
    for (const variation of variations) {
      const payload = {
        provider_name: "item4gamer", catalog_type: category.catalog_type,
        provider_category_row_id: category.id, provider_category_id: category.provider_category_id,
        provider_offer_id: variation.id, name: variation.name, price: variation.cost,
        original_price: null, currency: variation.currency, stock: variation.stock,
        available: variation.available, raw_data: variation.raw, last_synced_at: now,
      };
      const rowId = existing.get(variation.id);
      const { error } = rowId
        ? await supabase.from("provider_offers").update(payload).eq("id", rowId)
        : await supabase.from("provider_offers").insert(payload);
      if (error) throw error;
    }
    await supabase.from("activity_logs").insert({ actor_id: adminId, action: "item4gamer_variations_synced", entity_type: "provider_category", entity_id: category.id, description: `Synced Item4Gamer variations for ${category.name}`, new_data: { variations_count: variations.length } });
    revalidatePath("/admin/item4gamer");
    revalidatePath("/admin/provider-offers");
    return { success: true, message: `تمت مزامنة ${variations.length} باقة لخدمة ${category.name}.` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "تعذرت مزامنة الباقات." };
  }
}

export async function importItem4GamerOffer(providerOfferRowId: string) {
  const result = await importProviderOfferToStore(providerOfferRowId);
  if (!result.success || !result.productOfferId) return result;
  try {
    const { supabase } = await requireAdmin();
    const { data: source } = await supabase.from("provider_offers").select("provider_category_id,provider_offer_id,raw_data").eq("id", providerOfferRowId).single<{ provider_category_id: string; provider_offer_id: string; raw_data: Record<string, unknown> }>();
    if (!source) return result;
    const fields = Array.isArray(source.raw_data?.fields) ? source.raw_data.fields : [];
    const requiredFields = fields.map((field) => {
      const value = field as { data_name?: string; name?: string; type?: string; required?: boolean };
      return { id: String(value.data_name ?? ""), label: String(value.name ?? value.data_name ?? ""), type: ["number", "email", "url", "tel"].includes(String(value.type)) ? value.type : "text", required: Boolean(value.required) };
    }).filter((field) => field.id);
    const { data: provider } = await supabase.from("providers").select("id").eq("code", "item4gamer").single<{ id: string }>();
    await supabase.from("store_product_offers").update({
      provider_id: provider?.id ?? null,
      provider_product_id: source.provider_category_id,
      provider_variation_id: source.provider_offer_id,
      provider_currency: "USD",
      provider_status: source.raw_data.in_stock === false ? "out_of_stock" : "available",
      execution_type: typeof source.raw_data.delivery_type === "string" ? source.raw_data.delivery_type : null,
      required_fields: requiredFields,
      last_sync_at: new Date().toISOString(),
    }).eq("id", result.productOfferId);
    return { ...result, message: `${result.message} وتم ربط حقول Item4Gamer تلقائيًا.` };
  } catch (error) {
    return { ...result, message: `${result.message} لكن تعذر تحديث ربط Item4Gamer: ${error instanceof Error ? error.message : "خطأ غير معروف"}` };
  }
}
