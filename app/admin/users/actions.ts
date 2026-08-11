"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type {
  AdminUserActionResult,
  AdminUserStatus,
} from "@/types/adminUser";

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
    .select("role, status")
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
    !allowedRoles.includes(profile.role)
  ) {
    throw new Error(
      "ليس لديك صلاحية لإدارة العملاء.",
    );
  }

  return {
    supabase,
    userId: user.id,
  };
}

function translateUserError(
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
      "customer profile not found",
    )
  ) {
    return "حساب العميل غير موجود.";
  }

  if (
    normalized.includes(
      "customer wallet not found",
    )
  ) {
    return "محفظة العميل غير موجودة.";
  }

  if (
    normalized.includes(
      "insufficient customer points",
    )
  ) {
    return "رصيد نقاط العميل غير كافٍ.";
  }

  if (
    normalized.includes(
      "adjustment reason is required",
    )
  ) {
    return "يجب كتابة سبب تعديل النقاط.";
  }

  if (
    normalized.includes(
      "wallet freeze reason is required",
    )
  ) {
    return "يجب كتابة سبب تجميد المحفظة.";
  }

  if (
    normalized.includes(
      "you cannot change your own account status",
    )
  ) {
    return "لا يمكنك تغيير حالة حسابك الإداري من هذه الصفحة.";
  }

  return message;
}

function revalidateUserPages(): void {
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/account");
  revalidatePath("/wallet");
  revalidatePath("/rewards");
  revalidatePath("/notifications");
}

export async function updateAdminUserStatus({
  userId,
  status,
  reason,
}: {
  userId: string;
  status: AdminUserStatus;
  reason: string | null;
}): Promise<AdminUserActionResult> {
  try {
    const { supabase } =
      await requireAdmin();

    const {
      data,
      error,
    } = await supabase.rpc(
      "admin_update_customer_status",
      {
        p_user_id: userId,
        p_status: status,
        p_reason:
          reason?.trim() || null,
      },
    );

    if (error) {
      throw error;
    }

    revalidateUserPages();

    return {
      success: true,
      message:
        "تم تحديث حالة العميل.",
      data:
        (data as Record<
          string,
          unknown
        >) ?? undefined,
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? translateUserError(
              error.message,
            )
          : "تعذر تحديث حالة العميل.",
    };
  }
}

export async function adjustAdminUserPoints({
  userId,
  direction,
  points,
  reason,
}: {
  userId: string;
  direction: "credit" | "debit";
  points: number;
  reason: string;
}): Promise<AdminUserActionResult> {
  try {
    const { supabase } =
      await requireAdmin();

    if (
      !Number.isInteger(points) ||
      points <= 0
    ) {
      return {
        success: false,
        message:
          "عدد النقاط غير صحيح.",
      };
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "admin_adjust_customer_points",
      {
        p_user_id: userId,
        p_direction: direction,
        p_points: points,
        p_reason: reason.trim(),
      },
    );

    if (error) {
      throw error;
    }

    revalidateUserPages();

    return {
      success: true,

      message:
        direction === "credit"
          ? "تمت إضافة النقاط."
          : "تم خصم النقاط.",

      data:
        (data as Record<
          string,
          unknown
        >) ?? undefined,
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? translateUserError(
              error.message,
            )
          : "تعذر تعديل النقاط.",
    };
  }
}

export async function setAdminUserWalletFreeze({
  userId,
  frozen,
  reason,
}: {
  userId: string;
  frozen: boolean;
  reason: string | null;
}): Promise<AdminUserActionResult> {
  try {
    const { supabase } =
      await requireAdmin();

    const {
      data,
      error,
    } = await supabase.rpc(
      "admin_set_customer_wallet_freeze",
      {
        p_user_id: userId,
        p_frozen: frozen,
        p_reason:
          reason?.trim() || null,
      },
    );

    if (error) {
      throw error;
    }

    revalidateUserPages();

    return {
      success: true,

      message: frozen
        ? "تم تجميد محفظة العميل."
        : "تم إلغاء تجميد المحفظة.",

      data:
        (data as Record<
          string,
          unknown
        >) ?? undefined,
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? translateUserError(
              error.message,
            )
          : "تعذر تحديث حالة المحفظة.",
    };
  }
}

export async function updateAdminUserNotes({
  userId,
  notes,
}: {
  userId: string;
  notes: string;
}): Promise<AdminUserActionResult> {
  try {
    const {
      supabase,
      userId: adminId,
    } = await requireAdmin();

    const cleanedNotes =
      notes.trim();

    const {
      data: customer,
      error,
    } = await supabase
      .from("profiles")
      .update({
        internal_notes:
          cleanedNotes || null,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id, customer_id")
      .single<{
        id: string;
        customer_id: string;
      }>();

    if (error || !customer) {
      throw (
        error ??
        new Error(
          "تعذر تحديث الملاحظات.",
        )
      );
    }

    await supabase
      .from("activity_logs")
      .insert({
        user_id: userId,
        actor_id: adminId,

        action:
          "customer_internal_notes_updated",

        entity_type: "profile",
        entity_id: userId,

        description:
          `Admin updated internal notes for ${customer.customer_id}`,

        new_data: {
          internal_notes:
            cleanedNotes || null,
        },
      });

    revalidatePath("/admin/users");

    return {
      success: true,
      message:
        "تم حفظ ملاحظات العميل.",
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "تعذر حفظ الملاحظات.",
    };
  }
}

export async function adjustAdminUserWallet({
  userId,
  direction,
  amountUsd,
  reason,
}: {
  userId: string;
  direction: "credit" | "debit";
  amountUsd: number;
  reason: string;
}): Promise<AdminUserActionResult> {
  try {
    const { supabase } = await requireAdmin();
    if (!Number.isFinite(amountUsd) || amountUsd <= 0 || amountUsd > 100000) {
      return { success: false, message: "قيمة تعديل الرصيد غير صحيحة." };
    }
    if (reason.trim().length < 3) {
      return { success: false, message: "يجب كتابة سبب واضح لتعديل الرصيد." };
    }

    const { data, error } = await supabase.rpc("admin_adjust_customer_wallet", {
      p_user_id: userId,
      p_direction: direction,
      p_amount_usd: amountUsd,
      p_reason: reason.trim(),
    });
    if (error) throw error;

    revalidateUserPages();
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/wallet/transactions");

    return {
      success: true,
      message: direction === "credit" ? "تمت إضافة الرصيد وتسجيل الحركة." : "تم خصم الرصيد وتسجيل الحركة.",
      data: (data as Record<string, unknown>) ?? undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تعديل الرصيد.";
    const normalized = message.toLowerCase();
    return {
      success: false,
      message: normalized.includes("insufficient customer wallet balance")
        ? "رصيد العميل لا يسمح بعملية الخصم."
        : normalized.includes("could not find the function")
          ? "شغّلي ملف admin_adjust_customer_wallet.sql في Supabase أولًا."
          : message,
    };
  }
}

export async function updateAdminUserBirthDate({userId,birthDate,reason}:{userId:string;birthDate:string;reason:string}): Promise<AdminUserActionResult> {
  try {
    const {supabase}=await requireAdmin();
    const parsed=new Date(`${birthDate}T00:00:00Z`);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)||Number.isNaN(parsed.getTime())||parsed>new Date()||parsed.getUTCFullYear()<1900){return{success:false,message:"تاريخ الميلاد غير صحيح."}}
    if(reason.trim().length<5){return{success:false,message:"اكتبي سببًا واضحًا لتصحيح تاريخ الميلاد."}}
    const{data,error}=await supabase.rpc("admin_update_customer_birth_date",{p_user_id:userId,p_birth_date:birthDate,p_reason:reason.trim()});
    if(error)throw error;
    revalidateUserPages();revalidatePath(`/admin/users/${userId}`);revalidatePath("/settings");
    return{success:true,message:"تم تصحيح تاريخ الميلاد وتسجيل العملية.",data:(data as Record<string,unknown>)??undefined};
  }catch(error){const message=error instanceof Error?error.message:"تعذر تعديل تاريخ الميلاد.";return{success:false,message:message.toLowerCase().includes("could not find the function")?"شغّلي ملف birth_date_management.sql في Supabase أولًا.":message}}
}
