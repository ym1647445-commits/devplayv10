"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  dispatchItem4GamerJobs,
  syncItem4GamerStatuses,
} from "@/lib/providers/item4gamer/worker";
import { reconcileItem4GamerRejectedOrders } from "@/lib/providers/item4gamer/refund-reconciler";

export interface Item4GamerControlResult {
  success: boolean;
  message: string;
  details?: Record<string, number>;
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول أولًا.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role,status")
    .eq("id", user.id)
    .single<{ role: string; status: string }>();
  if (
    !profile ||
    profile.status !== "active" ||
    !["admin", "super_admin", "owner"].includes(profile.role)
  ) throw new Error("ليس لديك صلاحية إدارة الطلبات.");
}

function refreshPages() {
  revalidatePath("/admin/orders");
  revalidatePath("/orders");
  revalidatePath("/wallet");
  revalidatePath("/wallet/transactions");
  revalidatePath("/notifications");
}

export async function sendItem4GamerPendingNow(): Promise<Item4GamerControlResult> {
  try {
    await requireAdmin();
    const result = await dispatchItem4GamerJobs(50);
    refreshPages();
    return {
      success: true,
      message: "skipped" in result&&result.skipped
        ? "إرسال الطلبات إلى المورد متوقف من إعدادات المنصة."
        : result.processed
          ? `تم إرسال ${result.processed} مهمة إلى Item4Gamer.`
          : "لا توجد مهام Item4Gamer جاهزة للإرسال.",
      details: { processed: result.processed },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "تعذر إرسال الطلبات للمورد.",
    };
  }
}

export async function refreshItem4GamerOrdersNow(): Promise<Item4GamerControlResult> {
  try {
    await requireAdmin();
    const synced = await syncItem4GamerStatuses(200);
    const refunds = await reconcileItem4GamerRejectedOrders(200);
    refreshPages();
    return {
      success: true,
      message: `تم فحص ${synced.processed} حالة؛ الاسترداد التلقائي: ${refunds.refunded}.`,
      details: {
        synced: synced.processed,
        refunded: refunds.refunded,
        waiting: refunds.waiting,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "تعذر تحديث حالات Item4Gamer.",
    };
  }
}

export async function runItem4GamerFullCycle(): Promise<Item4GamerControlResult> {
  try {
    await requireAdmin();
    const dispatched = await dispatchItem4GamerJobs(50);
    const synced = await syncItem4GamerStatuses(200);
    const refunds = await reconcileItem4GamerRejectedOrders(200);
    refreshPages();
    return {
      success: true,
      message: `اكتملت الدورة: إرسال ${dispatched.processed}، تحديث ${synced.processed}، استرداد ${refunds.refunded}.`,
      details: {
        dispatched: dispatched.processed,
        synced: synced.processed,
        refunded: refunds.refunded,
        waiting: refunds.waiting,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "تعذر تشغيل دورة المورد.",
    };
  }
}
