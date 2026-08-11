"use server";

import { createClient } from "@/lib/supabase/server";

export interface LoginResult {
  success: boolean;
  message: string;
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<LoginResult> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return { success: false, message: "اكتبي البريد الإلكتروني وكلمة المرور." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error || !data.user || !data.session) {
    return {
      success: false,
      message:
        error?.message === "Invalid login credentials"
          ? "البريد أو كلمة المرور غير صحيحة."
          : error?.message ?? "تعذر تسجيل الدخول.",
    };
  }

  return { success: true, message: "تم تسجيل الدخول بنجاح." };
}
