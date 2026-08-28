"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface Item4GamerControlResult {
  success: boolean;
  message: string;
  details?: Record<string, number>;
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("يجب تسجيل الدخول أولًا.");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role,status").eq("id", user.id).single<{ role: string; status: string }>();
  if (profileError || !profile || profile.status !== "active" || !["admin", "super_admin", "owner"].includes(profile.role)) throw new Error("ليس لديك صلاحية إدارة الطلبات.");
  return supabase;
}

function refreshPages() {
  for (const path of ["/admin/orders", "/orders", "/wallet", "/wallet/transactions", "/notifications"]) revalidatePath(path);
}

async function readWorkerState() {
  const supabase = await requireAdmin();
  const { data, error } = await supabase.from("product_supplier_jobs").select("status,delivery_state,supplier_order_id,last_error").eq("provider_code", "item4gamer");
  if (error) throw error;
  const jobs = data ?? [];
  return {
    waiting: jobs.filter((job) => job.delivery_state === "not_sent" && job.supplier_order_id === null).length,
    processing: jobs.filter((job) => ["sending", "supplier_pending"].includes(job.status)).length,
    completed: jobs.filter((job) => job.status === "completed").length,
    failed: jobs.filter((job) => ["failed", "refunded"].includes(job.status)).length,
    unknown: jobs.filter((job) => job.delivery_state === "unknown" || String(job.last_error ?? "").includes("UNKNOWN_DELIVERY_STATE")).length,
  };
}

export async function sendItem4GamerPendingNow(): Promise<Item4GamerControlResult> {
  try {
    const state = await readWorkerState();
    refreshPages();
    return { success: true, message: state.waiting ? `${state.waiting} مهمة تنتظر Worker الـVPS وستُلتقط تلقائيًا خلال نحو 5 ثوانٍ.` : "لا توجد مهام تنتظر الإرسال. Worker الـVPS يعمل تلقائيًا.", details: state };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "تعذر فحص طابور المورد." };
  }
}

export async function refreshItem4GamerOrdersNow(): Promise<Item4GamerControlResult> {
  try {
    const state = await readWorkerState();
    refreshPages();
    return { success: true, message: `قيد المتابعة: ${state.processing}، مكتمل: ${state.completed}، يحتاج مراجعة: ${state.failed}. التحديث من المورد ينفذه VPS تلقائيًا.`, details: state };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "تعذر فحص حالات Item4Gamer." };
  }
}

export async function runItem4GamerFullCycle(): Promise<Item4GamerControlResult> {
  try {
    const state = await readWorkerState();
    refreshPages();
    const warning = state.unknown ? ` يوجد ${state.unknown} بحالة إرسال غير مؤكدة ولن تُعاد تلقائيًا.` : "";
    return { success: true, message: `حالة الدورة: انتظار ${state.waiting}، متابعة ${state.processing}، مكتمل ${state.completed}، فشل/استرداد ${state.failed}.${warning}`, details: state };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "تعذر فحص دورة المورد." };
  }
}
