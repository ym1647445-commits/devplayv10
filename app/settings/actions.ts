"use server";

import { revalidatePath } from "next/cache";

import { updateAuthenticatedPassword } from "@/lib/auth/password";
import { createClient } from "@/lib/supabase/server";
import type { AccentColor, DisplayDensity, FontSize, ThemeMode } from "@/types/theme";
import type { CompanionPreferences } from "@/components/assistant/companionPreferences";

export interface SettingsPayload {
  fullName: string;
  phone: string;
  birthDate: string;
  birthDateLocked: boolean;
  language: "ar" | "en";
  theme: ThemeMode;
  accentColor: AccentColor;
  fontSize: FontSize;
  displayDensity: DisplayDensity;
  reduceMotion: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  orderNotifications: boolean;
  depositNotifications: boolean;
  promotionNotifications: boolean;
  securityNotifications: boolean;
  companion: CompanionPreferences;
}

const themes = new Set<ThemeMode>(["dark", "light", "oled", "high-contrast"]);
const accents = new Set<AccentColor>(["violet", "blue", "cyan", "green", "yellow", "orange", "red", "pink"]);
const fontSizes = new Set<FontSize>(["small", "medium", "large", "xlarge"]);
const densities = new Set<DisplayDensity>(["compact", "comfortable"]);

export async function updateCustomerSettings(payload: SettingsPayload): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, message: "يجب تسجيل الدخول أولًا." };

  const fullName = payload.fullName.trim();
  const phone = payload.phone.trim();
  if (fullName.length < 2 || fullName.length > 100) return { success: false, message: "الاسم يجب أن يكون بين حرفين و100 حرف." };
  if (phone.length > 30) return { success: false, message: "رقم الهاتف أطول من المسموح." };
  if (!payload.birthDateLocked && payload.birthDate) {
    const date = new Date(`${payload.birthDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.birthDate) || Number.isNaN(date.getTime()) || date > new Date() || date.getUTCFullYear() < 1900) {
      return { success: false, message: "تاريخ الميلاد غير صحيح." };
    }
  }
  if (!themes.has(payload.theme) || !accents.has(payload.accentColor) || !fontSizes.has(payload.fontSize) || !densities.has(payload.displayDensity) || !["ar", "en"].includes(payload.language)) {
    return { success: false, message: "إحدى قيم الإعدادات غير صحيحة." };
  }

  const [profileResult, preferencesResult, birthDateResult, companionResult] = await Promise.all([
    supabase.from("profiles").update({
      full_name: fullName,
      phone: phone || null,
      language: payload.language,
      theme: payload.theme,
      accent_color: payload.accentColor,
      font_size: payload.fontSize,
      display_density: payload.displayDensity,
      reduce_motion: payload.reduceMotion,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id),
    supabase.from("notification_preferences").upsert({
      user_id: user.id,
      in_app_enabled: payload.inAppEnabled,
      email_enabled: payload.emailEnabled,
      order_notifications: payload.orderNotifications,
      deposit_notifications: payload.depositNotifications,
      promotion_notifications: payload.promotionNotifications,
      security_notifications: payload.securityNotifications,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }),
    !payload.birthDateLocked && payload.birthDate
      ? supabase.rpc("set_customer_birth_date", { p_birth_date: payload.birthDate })
      : Promise.resolve({ error: null }),
    supabase.from("customer_companion_preferences").upsert({user_id:user.id,name:payload.companion.name.trim().slice(0,18)||"Dev",tone:payload.companion.tone,theme:payload.companion.theme,color:payload.companion.color,size:payload.companion.size,enabled:payload.companion.enabled,roaming_enabled:payload.companion.roamingEnabled,game_invites_enabled:payload.companion.gameInvitesEnabled,onboarding_completed:true,updated_at:new Date().toISOString()},{onConflict:"user_id"}),
  ]);

  if (profileResult.error) return { success: false, message: profileResult.error.message };
  if (companionResult.error) return { success: false, message: companionResult.error.message.includes("customer_companion_preferences") ? "شغّلي ملف devplay_companion_preferences.sql في Supabase أولًا." : companionResult.error.message };
  if (birthDateResult.error) {
    const error = birthDateResult.error.message.toLowerCase();
    return { success: false, message: error.includes("birth date is locked")
      ? "تاريخ الميلاد محفوظ بالفعل. تواصلي مع خدمة العملاء لتصحيحه."
      : error.includes("could not find the function")
        ? "شغّلي ملف birth_date_management.sql في Supabase أولًا."
        : birthDateResult.error.message };
  }
  if (preferencesResult.error) {
    const isRlsError = preferencesResult.error.message
      .toLowerCase()
      .includes("row-level security");

    return {
      success: false,
      message: isRlsError
        ? "تعذر حفظ تفضيلات الإشعارات بسبب صلاحيات قاعدة البيانات. شغّلي ملف notification_preferences_rls.sql أولًا."
        : preferencesResult.error.message,
    };
  }
  revalidatePath("/settings"); revalidatePath("/account");
  return { success: true, message: "تم حفظ إعداداتك بنجاح." };
}

export async function changePassword(newPassword: string, currentPassword?: string) {
  if (!currentPassword) return { success: false, message: "كلمة المرور الحالية مطلوبة." };
  return updateAuthenticatedPassword(newPassword, currentPassword);
}
