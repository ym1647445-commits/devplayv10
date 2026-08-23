"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function completeGoogleProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").replace(/\D/g, "");
  if (fullName.length < 3) redirect("/auth/complete-profile?error=name");
  if (!/^01[0125][0-9]{8}$/.test(phone)) redirect("/auth/complete-profile?error=phone");

  const { error } = await supabase.from("profiles").update({
    full_name: fullName,
    phone,
    email: user.email?.toLowerCase() ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);
  if (error) redirect("/auth/complete-profile?error=save");
  redirect("/account");
}
