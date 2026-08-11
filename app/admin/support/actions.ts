"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function replyTicket(form: FormData) {
  const supabase = await createClient();
  const ticketId = String(form.get("ticketId"));
  const { error } = await supabase.rpc("reply_support_ticket", {
    p_ticket_id: ticketId,
    p_message: String(form.get("message")),
    p_status: String(form.get("status") || "waiting_customer"),
  });
  if (error) throw new Error(error.message);
  await supabase.rpc("mark_support_ticket_read", { p_ticket_id: ticketId });
  revalidatePath("/admin/support");
  revalidatePath("/support");
  redirect(`/admin/support?ticket=${ticketId}`);
}
