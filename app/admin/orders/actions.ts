"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type {
  AdminOrderActionResult,
  AdminOrderStatus,
  UpdateAdminOrderStatusInput,
} from "@/types/adminOrder";

interface RpcStatusResult {
  success: boolean;
  changed: boolean;

  order_id: string;

  old_status: string;
  new_status: string;

  reward_points: number;

  points_credited: number;
  points_deducted: number;

  debt_paid: number;
  new_debt: number;
}

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
      id,
      role,
      status
    `)
    .eq("id", user.id)
    .single<{
      id: string;
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
    !allowedRoles.includes(profile.role)
  ) {
    throw new Error(
      "ليس لديك صلاحية لإدارة الطلبات.",
    );
  }

  return {
    supabase,
    userId: user.id,
  };
}

function isValidStatus(
  value: string,
): value is AdminOrderStatus {
  const statuses:
    AdminOrderStatus[] = [
      "pending",
      "processing",
      "supplier_pending",
      "completed",
      "failed",
      "cancelled",
      "refunded",
      "manual_review",
    ];

  return statuses.includes(
    value as AdminOrderStatus,
  );
}

function translateOrderError(
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
      "product order not found",
    )
  ) {
    return "الطلب غير موجود.";
  }

  if (
    normalized.includes(
      "customer profile not found",
    )
  ) {
    return "تعذر العثور على حساب العميل.";
  }

  if (
    normalized.includes(
      "invalid input value for enum",
    )
  ) {
    return "حالة الطلب المختارة غير صحيحة.";
  }

  return message;
}

export async function updateAdminOrderStatus(
  input: UpdateAdminOrderStatusInput,
): Promise<AdminOrderActionResult> {
  try {
    if (!input.orderId) {
      return {
        success: false,
        message:
          "رقم الطلب الداخلي غير موجود.",
      };
    }

    if (
      !isValidStatus(input.status)
    ) {
      return {
        success: false,
        message:
          "حالة الطلب غير صحيحة.",
      };
    }

    const { supabase } =
      await requireAdmin();

    const {
      data,
      error,
    } = await supabase.rpc(
      "admin_update_product_order_status",
      {
        p_order_id:
          input.orderId,

        p_new_status:
          input.status,

        p_note:
          input.note?.trim() ||
          null,
      },
    );

    if (error) {
      return {
        success: false,

        message:
          translateOrderError(
            error.message,
          ),
      };
    }

    const rawResult =
      Array.isArray(data)
        ? data[0]
        : data;

    if (!rawResult) {
      return {
        success: false,
        message:
          "تم تحديث الطلب لكن تعذر قراءة النتيجة.",
      };
    }

    const result =
      rawResult as RpcStatusResult;

    revalidatePath(
      "/admin/orders",
    );

    revalidatePath(
      "/admin",
    );

    revalidatePath(
      "/orders",
    );

    revalidatePath(
      "/rewards",
    );

    revalidatePath(
      "/notifications",
    );

    revalidatePath(
      "/account",
    );

    revalidatePath(
      "/wallet",
    );

    return {
      success: true,

      message:
        result.changed === false
          ? "الطلب موجود بالفعل بنفس الحالة."
          : "تم تحديث حالة الطلب بنجاح.",

      data: {
        orderId:
          result.order_id,

        oldStatus:
          result.old_status,

        newStatus:
          result.new_status,

        rewardPoints:
          Number(
            result.reward_points ??
              0,
          ),

        pointsCredited:
          Number(
            result.points_credited ??
              0,
          ),

        pointsDeducted:
          Number(
            result.points_deducted ??
              0,
          ),

        debtPaid:
          Number(
            result.debt_paid ?? 0,
          ),

        newDebt:
          Number(
            result.new_debt ?? 0,
          ),
      },
    };
  } catch (error) {
    console.error(
      "Update admin order status error:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? translateOrderError(
              error.message,
            )
          : "تعذر تحديث حالة الطلب.",
    };
  }
}

export async function updateOrderAdminNote(
  orderId: string,
  note: string,
): Promise<AdminOrderActionResult> {
  try {
    const {
      supabase,
      userId,
    } = await requireAdmin();

    if (!orderId) {
      return {
        success: false,
        message:
          "الطلب غير موجود.",
      };
    }

    const cleanedNote =
      note.trim();

    const {
      data: order,
      error,
    } = await supabase
      .from("product_orders")
      .update({
        admin_note:
          cleanedNote || null,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", orderId)
      .select(`
        id,
        order_id
      `)
      .single<{
        id: string;
        order_id: string;
      }>();

    if (error || !order) {
      throw (
        error ??
        new Error(
          "تعذر تحديث الملاحظة.",
        )
      );
    }

    await supabase
      .from("activity_logs")
      .insert({
        actor_id: userId,

        action:
          "product_order_admin_note_updated",

        entity_type:
          "product_order",

        entity_id:
          order.id,

        description:
          `Admin updated note for order ${order.order_id}`,

        new_data: {
          admin_note:
            cleanedNote || null,
        },
      });

    revalidatePath(
      "/admin/orders",
    );

    return {
      success: true,
      message:
        "تم حفظ ملاحظة الإدارة.",
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "تعذر حفظ الملاحظة.",
    };
  }
}