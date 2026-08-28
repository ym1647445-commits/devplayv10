"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function replyTicket(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول أولًا.");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role,status").eq("id", user.id).single<{ role: string; status: string }>();
  if (profileError || !profile || profile.status !== "active" || !["admin","super_admin","owner"].includes(profile.role)) throw new Error("ليس لديك صلاحية إدارة الدعم.");
  const ticketId = String(form.get("ticketId"));
  const { error } = await supabase.rpc("reply_support_ticket", {
    p_ticket_id: ticketId,
    p_message: String(form.get("message")),
    p_status: String(form.get("status") || "waiting_customer"),
  });
  if (error) throw new Error(error.message);
  const { error: readError } = await supabase.rpc("mark_support_ticket_read", { p_ticket_id: ticketId });
  if (readError) throw new Error(readError.message);
  revalidatePath("/admin/support");
  revalidatePath("/support");
  redirect(`/admin/support?ticket=${ticketId}`);
}
