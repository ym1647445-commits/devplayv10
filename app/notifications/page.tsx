import {
  BellRing,
  CheckCircle2,
} from "lucide-react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { createClient } from "@/lib/supabase/server";
import type { CustomerNotification } from "@/types/notification";

interface NotificationRow {
  id: string;

  type: string;

  title: string;
  message: string;

  entity_type:
    | string
    | null;

  entity_id:
    | string
    | null;

  action_url:
    | string
    | null;

  is_read: boolean;

  created_at: string;

  read_at:
    | string
    | null;
}

export default async function NotificationsPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth");
  }

  const {
    data,
    error,
  } = await supabase
    .from("notifications")
    .select(`
      id,
      type,
      title,
      message,
      entity_type,
      entity_id,
      action_url,
      is_read,
      created_at,
      read_at
    `)
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(100)
    .returns<NotificationRow[]>();

  if (error) {
    console.error(
      "Failed to load notifications:",
      error,
    );
  }

  const notifications: CustomerNotification[] =
    (data ?? []).map(
      (
        notification,
      ): CustomerNotification => ({
        id: notification.id,

        type: notification.type,

        title:
          notification.title,

        message:
          notification.message,

        entityType:
          notification.entity_type,

        entityId:
          notification.entity_id,

        actionUrl:
          notification.action_url,

        isRead:
          notification.is_read,

        createdAt:
          notification.created_at,

        readAt:
          notification.read_at,
      }),
    );

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.isRead,
    ).length;

  return (
    <AppShell>
      <section className="notifications-page">
        <header className="notifications-heading">
          <div>
            <span>
              مركز التنبيهات
            </span>

            <h1>
              الإشعارات
            </h1>

            <p>
              تابعي تحديثات الطلبات
              والمحفظة والكوبونات من مكان
              واحد.
            </p>
          </div>

          <span className="notifications-count">
            {unreadCount > 0 ? (
              <BellRing size={16} />
            ) : (
              <CheckCircle2
                size={16}
              />
            )}

            {unreadCount.toLocaleString(
              "ar-EG",
            )}{" "}
            جديد
          </span>
        </header>

        <NotificationsList
          notifications={
            notifications
          }
        />
      </section>
    </AppShell>
  );
}