import { createClient } from "@/lib/supabase/server";

import { NotificationsManager } from "@/components/admin/notifications/NotificationsManager";

export default async function NotificationsPage() {
  const supabase =
    await createClient();

  const [
    campaignsResult,
    usersResult,
  ] = await Promise.all([
    supabase
      .from(
        "admin_notification_campaigns",
      )
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(20),

    supabase
      .from("profiles")
      .select(`
        id,
        customer_id,
        full_name,
        email,
        phone,
        status,
        customer_level,
        points,
        birth_date
      `)
      .eq("role", "customer")
      .order("points", {
        ascending: false,
      }),
  ]);

  return (
    <NotificationsManager
      campaigns={
        campaignsResult.data ??
        []
      }
      users={
        usersResult.data ??
        []
      }
    />
  );
}