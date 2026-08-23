"use server";

import { revalidatePath } from "next/cache";

import { getProviderAdapter, hasProviderAdapter } from "@/lib/providers";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single<{ role: string; status: string }>();
  if (!profile || profile.status !== "active" || !["admin", "super_admin", "owner"].includes(profile.role)) throw new Error("Admin permission required");
  return { supabase, adminId: user.id };
}

export async function setProviderActive(providerId: string, active: boolean) {
  try {
    const { supabase, adminId } = await requireAdmin();
    const { data: provider, error } = await supabase.from("providers").update({ active, updated_at: new Date().toISOString() }).eq("id", providerId).select("id,code,name").single();
    if (error) throw error;
    await supabase.from("activity_logs").insert({ actor_id: adminId, action: active ? "provider_enabled" : "provider_disabled", entity_type: "provider", entity_id: provider.id, description: `${active ? "Enabled" : "Disabled"} provider ${provider.name}`, new_data: { code: provider.code, active } });
    revalidatePath("/admin/providers");
    return { success: true, message: active ? "تم تفعيل المورد." : "تم تعطيل المورد." };
  } catch (error) { return { success: false, message: error instanceof Error ? error.message : "تعذر تحديث المورد." }; }
}

export async function testProviderConnection(providerId: string) {
  try {
    const { supabase, adminId } = await requireAdmin();
    const { data: provider, error } = await supabase.from("providers").select("id,code,name").eq("id", providerId).single<{ id: string; code: string; name: string }>();
    if (error || !provider) throw error ?? new Error("Provider not found");
    if (!hasProviderAdapter(provider.code)) throw new Error("لا يوجد Adapter مسجل لهذا المورد.");
    const result = await getProviderAdapter(provider.code).testConnection();
    const now = new Date().toISOString();
    await supabase.from("providers").update({ status: result.ok ? "healthy" : "offline", last_health_check_at: now, last_error: result.ok ? null : result.message, updated_at: now }).eq("id", provider.id);
    await supabase.from("activity_logs").insert({ actor_id: adminId, action: "provider_connection_tested", entity_type: "provider", entity_id: provider.id, description: `Tested provider ${provider.name}`, new_data: result });
    revalidatePath("/admin/providers");
    return { success: result.ok, message: `${result.message} · ${result.latencyMs}ms` };
  } catch (error) { return { success: false, message: error instanceof Error ? error.message : "تعذر اختبار المورد." }; }
}

export async function updateProviderOptions(providerId: string, input: { priority: number; selectionMode: "manual" | "auto"; exposeName: boolean }) {
  try {
    const { supabase } = await requireAdmin();
    const priority = Math.max(-1000, Math.min(1000, Math.floor(input.priority)));
    const { error } = await supabase.from("providers").update({ priority, selection_mode: input.selectionMode, expose_name_to_customers: input.exposeName, updated_at: new Date().toISOString() }).eq("id", providerId);
    if (error) throw error;
    revalidatePath("/admin/providers");
    return { success: true, message: "تم حفظ إعدادات المورد." };
  } catch (error) { return { success: false, message: error instanceof Error ? error.message : "تعذر حفظ الإعدادات." }; }
}
