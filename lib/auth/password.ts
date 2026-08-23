import "server-only";

import { createClient } from "@/lib/supabase/server";

export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordUpdateResult {
  success: boolean;
  message: string;
}

function translatePasswordError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("current password") || normalized.includes("invalid login credentials")) {
    return "كلمة المرور الحالية غير صحيحة.";
  }

  if (normalized.includes("should be different from the old password")) {
    return "كلمة المرور الجديدة يجب أن تختلف عن الحالية.";
  }

  if (normalized.includes("should be at least") || normalized.includes("at least 6 characters")) {
    return `كلمة المرور لازم تكون ${PASSWORD_MIN_LENGTH} أحرف على الأقل.`;
  }

  if (normalized.includes("session") || normalized.includes("jwt") || normalized.includes("token")) {
    return "انتهت صلاحية الجلسة. سجّلي الدخول أو اطلبي رابط استعادة جديد.";
  }

  return "تعذر تحديث كلمة المرور. حاولي مرة أخرى.";
}

/**
 * تحديث كلمة المرور للمستخدم صاحب الجلسة الحالية،
 * سواء جلسة تسجيل دخول عادية أو جلسة استعادة (recovery)
 * ناتجة عن رابط "نسيت كلمة المرور".
 *
 * Supabase Auth هو المصدر الوحيد لتخزين كلمة المرور؛
 * لا تُحفظ أو تُسجَّل هنا بأي شكل.
 */
export async function updateAuthenticatedPassword(
  password: string,
  currentPassword?: string,
): Promise<PasswordUpdateResult> {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return {
      success: false,
      message: `كلمة المرور لازم تكون ${PASSWORD_MIN_LENGTH} أحرف على الأقل.`,
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      message: "انتهت صلاحية الجلسة. سجّلي الدخول أو اطلبي رابط استعادة جديد.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password,
    ...(currentPassword ? { current_password: currentPassword } : {}),
  });

  if (error) {
    return { success: false, message: translatePasswordError(error.message) };
  }

  return { success: true, message: "تم تحديث كلمة المرور بنجاح." };
}
