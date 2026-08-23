"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface OrganizerResult { success: boolean; message: string }

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول أولًا.");
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single<{role:string;status:string}>();
  if (!profile || profile.status !== "active" || !["admin", "super_admin", "owner"].includes(profile.role)) {
    throw new Error("ليس لديك صلاحية لتنظيم الباقات.");
  }
  return { supabase, adminId: user.id };
}

function refresh(productId: string, slug?: string | null) {
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(`/admin/products/${productId}/organize`);
  if (slug) revalidatePath(`/products/${slug}`);
  revalidatePath("/products");
}

function slugify(value: string) {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/^-|-$/g, "");
  return slug || `group-${Date.now()}`;
}

export async function createOfferGroup(productId: string, nameAr: string): Promise<OrganizerResult> {
  try {
    const name = nameAr.trim();
    if (!name) throw new Error("اكتبي اسم المجموعة.");
    const { supabase, adminId } = await requireAdmin();
    const { data: product } = await supabase.from("store_products").select("slug").eq("id", productId).single<{slug:string}>();
    const { count } = await supabase.from("store_product_offer_groups").select("id", { count: "exact", head: true }).eq("product_id", productId);
    const { error } = await supabase.from("store_product_offer_groups").insert({ product_id: productId, group_key: `${slugify(name)}-${Date.now().toString(36)}`, name_ar: name, sort_order: count ?? 0 });
    if (error) throw error;
    await supabase.from("activity_logs").insert({ actor_id: adminId, action: "offer_group_created", entity_type: "store_product", entity_id: productId, description: `Created offer group ${name}` });
    refresh(productId, product?.slug);
    return { success: true, message: "تم إنشاء المجموعة." };
  } catch (error) { return { success: false, message: error instanceof Error ? error.message : "تعذر إنشاء المجموعة." }; }
}

export async function moveOfferToGroup(productId: string, offerId: string, groupId: string | null): Promise<OrganizerResult> {
  try {
    const { supabase } = await requireAdmin();
    if (groupId) {
      const { data: group } = await supabase.from("store_product_offer_groups").select("id").eq("id", groupId).eq("product_id", productId).maybeSingle();
      if (!group) throw new Error("المجموعة لا تتبع هذا المنتج.");
    }
    const { error } = await supabase.from("store_product_offers").update({ offer_group_id: groupId, updated_at: new Date().toISOString() }).eq("id", offerId).eq("product_id", productId);
    if (error) throw error;
    const { data: product } = await supabase.from("store_products").select("slug").eq("id", productId).single<{slug:string}>();
    refresh(productId, product?.slug);
    return { success: true, message: "تم نقل الباقة." };
  } catch (error) { return { success: false, message: error instanceof Error ? error.message : "تعذر نقل الباقة." }; }
}

export async function deleteOfferGroup(productId: string, groupId: string): Promise<OrganizerResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("store_product_offer_groups").delete().eq("id", groupId).eq("product_id", productId);
    if (error) throw error;
    const { data: product } = await supabase.from("store_products").select("slug").eq("id", productId).single<{slug:string}>();
    refresh(productId, product?.slug);
    return { success: true, message: "تم حذف المجموعة وإرجاع باقاتها إلى غير المصنفة." };
  } catch (error) { return { success: false, message: error instanceof Error ? error.message : "تعذر حذف المجموعة." }; }
}

export async function autoOrganizeOffers(productId: string): Promise<OrganizerResult> {
  try {
    const { supabase, adminId } = await requireAdmin();
    const { data: product } = await supabase.from("store_products").select("slug,name_ar").eq("id", productId).single<{slug:string;name_ar:string}>();
    if (!product) throw new Error("المنتج غير موجود.");
    const definitions = [
      { key: "id-topup", ar: "شحن مباشر بالـ ID", en: "ID Top Up", test: (v:string) => !/(wow|gift|code|redeem|prime|membership|subscription|month)/i.test(v) },
      { key: "wow", ar: "WOW والعملات الخاصة", en: "WOW", test: (v:string) => /wow/i.test(v) },
      { key: "gift-codes", ar: "الأكواد وبطاقات الهدايا", en: "Gift Codes", test: (v:string) => /(gift|code|redeem)/i.test(v) },
      { key: "memberships", ar: "الاشتراكات وPrime", en: "Memberships", test: (v:string) => /(prime|membership|subscription|month)/i.test(v) },
    ];
    const ids = new Map<string,string>();
    for (const [index, definition] of definitions.entries()) {
      const { data, error } = await supabase.from("store_product_offer_groups").upsert({ product_id: productId, group_key: definition.key, name_ar: definition.ar, name_en: definition.en, sort_order: index }, { onConflict: "product_id,group_key" }).select("id").single<{id:string}>();
      if (error) throw error;
      ids.set(definition.key, data.id);
    }
    const { data: offers, error: offersError } = await supabase.from("store_product_offers").select("id,name_ar,name_en,provider_data").eq("product_id", productId);
    if (offersError) throw offersError;
    for (const offer of offers ?? []) {
      const raw = `${offer.name_ar ?? ""} ${offer.name_en ?? ""} ${JSON.stringify(offer.provider_data ?? {})}`;
      const definition = definitions.slice(1).find((item) => item.test(raw)) ?? definitions[0];
      const { error } = await supabase.from("store_product_offers").update({ offer_group_id: ids.get(definition.key), updated_at: new Date().toISOString() }).eq("id", offer.id).eq("product_id", productId);
      if (error) throw error;
    }
    await supabase.from("activity_logs").insert({ actor_id: adminId, action: "offers_auto_organized", entity_type: "store_product", entity_id: productId, description: `Auto organized offers for ${product.name_ar}` });
    refresh(productId, product.slug);
    return { success: true, message: `تم تنظيم ${(offers ?? []).length.toLocaleString("ar-EG")} باقة. يمكنك سحب أي باقة لتصحيح مكانها.` };
  } catch (error) { return { success: false, message: error instanceof Error ? error.message : "تعذر التنظيم التلقائي." }; }
}

