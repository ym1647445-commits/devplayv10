"use server";

import { revalidatePath } from "next/cache";

import { importProviderOfferToStore } from "@/app/admin/provider-offers/actions";
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
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase.rpc("admin_enqueue_item4gamer_catalog_sync", { p_sync_type: "products", p_category_row_id: null });
    if (error) throw error;
    revalidatePath("/admin/item4gamer");
    return { success: true, message: `تم إرسال المزامنة إلى VPS الثابت بأمان. رقم المهمة: ${String(data).slice(0, 8)}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر إرسال مهمة المزامنة.";
    return { success: false, message: message.includes("Could not find the function") ? "شغّلي item4gamer_catalog_sync_worker.sql ثم حدّثي Worker على VPS." : message };
  }
}

export async function syncItem4GamerVariations(categoryRowId: string) {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase.rpc("admin_enqueue_item4gamer_catalog_sync", { p_sync_type: "variations", p_category_row_id: categoryRowId });
    if (error) throw error;
    revalidatePath("/admin/item4gamer");
    revalidatePath("/admin/item4gamer/catalog");
    return { success: true, message: `تم إرسال تحديث الباقات إلى VPS الثابت. رقم المهمة: ${String(data).slice(0, 8)}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر إرسال مهمة تحديث الباقات.";
    return { success: false, message: message.includes("Could not find the function") ? "شغّلي item4gamer_catalog_sync_worker.sql ثم حدّثي Worker على VPS." : message };
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
    const { error: linkError } = await supabase.from("store_product_offers").update({      provider_id: provider?.id ?? null,
      provider_product_id: source.provider_category_id,
      provider_variation_id: source.provider_offer_id,
      provider_currency: "USD",
      provider_status: source.raw_data.in_stock === false ? "out_of_stock" : "available",
      execution_type: typeof source.raw_data.delivery_type === "string" ? source.raw_data.delivery_type : null,
      required_fields: requiredFields,
      last_sync_at: new Date().toISOString(),
    }).eq("id", result.productOfferId);
    if (linkError) throw linkError;
    return { ...result, message: `${result.message} وتم ربط حقول Item4Gamer تلقائيًا.` };
  } catch (error) {
    return { ...result, message: `${result.message} لكن تعذر تحديث ربط Item4Gamer: ${error instanceof Error ? error.message : "خطأ غير معروف"}` };
  }
}
