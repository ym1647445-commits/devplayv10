"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type {
  AdminNotificationActionResult,
  NotificationAudienceType,
  SendAdminNotificationInput,
} from "@/types/adminNotification";

const AUDIENCE_TYPES:
  NotificationAudienceType[] = [
    "all",
    "single_user",
    "status",
    "level",
    "minimum_points",
    "birthday_today",
  ];

async function requireAdmin() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "يجب تسجيل الدخول أولًا.",
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      role,
      status
    `)
    .eq("id", user.id)
    .single<{
      role: string;
      status: string;
    }>();

  const allowedRoles = [
    "admin",
    "super_admin",
    "owner",
  ];

  if (
    profileError ||
    !profile ||
    profile.status !== "active" ||
    !allowedRoles.includes(
      profile.role,
    )
  ) {
    throw new Error(
      "ليس لديك صلاحية لإرسال الإشعارات.",
    );
  }

  return {
    supabase,
  };
}

function translateNotificationError(
  message: string,
): string {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "authentication required",
    )
  ) {
    return "يجب تسجيل الدخول أولًا.";
  }

  if (
    normalized.includes(
      "admin permission required",
    )
  ) {
    return "ليس لديك صلاحية لتنفيذ العملية.";
  }

  if (
    normalized.includes(
      "notification title is required",
    )
  ) {
    return "اكتبي عنوان الإشعار.";
  }

  if (
    normalized.includes(
      "notification message is required",
    )
  ) {
    return "اكتبي نص الإشعار.";
  }

  if (
    normalized.includes(
      "invalid audience type",
    )
  ) {
    return "نوع الجمهور غير صحيح.";
  }

  if (
    normalized.includes(
      "audience value is required",
    )
  ) {
    return "اختاري الجمهور المطلوب.";
  }

  if (
    normalized.includes(
      "invalid input syntax for type uuid",
    )
  ) {
    return "العميل المختار غير صحيح.";
  }

  if (
    normalized.includes(
      "invalid input syntax for type integer",
    )
  ) {
    return "الحد الأدنى للنقاط غير صحيح.";
  }

  return message;
}

export async function sendAdminNotification(
  input: SendAdminNotificationInput,
): Promise<AdminNotificationActionResult> {
  try {
    if (!input.title.trim()) {
      return {
        success: false,
        message:
          "اكتبي عنوان الإشعار.",
      };
    }

    if (!input.message.trim()) {
      return {
        success: false,
        message:
          "اكتبي نص الإشعار.",
      };
    }

    if (
      !AUDIENCE_TYPES.includes(
        input.audienceType,
      )
    ) {
      return {
        success: false,
        message:
          "نوع الجمهور غير صحيح.",
      };
    }

    if (
      input.audienceType !== "all" &&
      input.audienceType !==
        "birthday_today" &&
      !input.audienceValue?.trim()
    ) {
      return {
        success: false,
        message:
          "اختاري الجمهور المطلوب.",
      };
    }

    const { supabase } =
      await requireAdmin();

    const {
      data,
      error,
    } = await supabase.rpc(
      "admin_send_notification_campaign",
      {
        p_title:
          input.title.trim(),

        p_message:
          input.message.trim(),

        p_notification_type:
          input.notificationType.trim() ||
          "admin_broadcast",

        p_action_url:
          input.actionUrl?.trim() ||
          null,

        p_audience_type:
          input.audienceType,

        p_audience_value:
          input.audienceValue?.trim() ||
          null,
      },
    );

    if (error) {
      throw error;
    }

    const rawResult =
      Array.isArray(data)
        ? data[0]
        : data;

    const result =
      rawResult as {
        success?: boolean;
        campaign_id?: string;
        recipients_count?: number;
      } | null;

    if (!result?.success) {
      return {
        success: false,
        message:
          "تعذر إرسال الإشعار.",
      };
    }

    revalidatePath(
      "/admin/notifications",
    );

    revalidatePath(
      "/notifications",
    );

    revalidatePath("/admin");

    return {
      success: true,

      message:
        result.recipients_count === 0
          ? "تم إنشاء الحملة لكن لا يوجد مستخدمون مطابقون للجمهور."
          : `تم إرسال الإشعار إلى ${Number(
              result.recipients_count,
            ).toLocaleString(
              "ar-EG",
            )} مستخدم.`,

      campaignId:
        result.campaign_id,

      recipientsCount:
        Number(
          result.recipients_count ??
            0,
        ),
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? translateNotificationError(
              error.message,
            )
          : "تعذر إرسال الإشعار.",
    };
  }
}