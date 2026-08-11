"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface NotificationActionResult {
  success: boolean;
  message: string;
}

async function getAuthenticatedClient() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error(
      "يجب تسجيل الدخول أولًا.",
    );
  }

  return {
    supabase,
    user,
  };
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<NotificationActionResult> {
  try {
    const {
      supabase,
      user,
    } =
      await getAuthenticatedClient();

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    revalidatePath("/notifications");
    revalidatePath("/");

    return {
      success: true,
      message:
        "تم تعليم الإشعار كمقروء.",
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "تعذر تحديث الإشعار.",
    };
  }
}

export async function markAllNotificationsAsRead(): Promise<NotificationActionResult> {
  try {
    const {
      supabase,
      user,
    } =
      await getAuthenticatedClient();

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      throw error;
    }

    revalidatePath("/notifications");
    revalidatePath("/");

    return {
      success: true,
      message:
        "تم تعليم جميع الإشعارات كمقروءة.",
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "تعذر تحديث الإشعارات.",
    };
  }
}