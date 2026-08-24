import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { item4gamerAdapter } from "./adapter";
import { readPlatformStatus } from "@/lib/platform-status";

interface Job {
  id: string; order_id: string; order_item_id: string; supplier_product_id: string | null;
  provider_offer_id: string | null; input_values: Record<string, string> | null;
  attempts_count: number; idempotency_key: string | null; supplier_order_id?: string | null;
}

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials are missing");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function refreshOrder(db: SupabaseClient, job: Job) {
  const { data: itemJobs } = await db.from("product_supplier_jobs").select("id,status,supplier_order_id,supplier_status,supplier_response,last_error").eq("order_item_id", job.order_item_id);
  const itemRows = itemJobs ?? [];
  const itemStatus = itemRows.length > 0 && itemRows.every((row) => row.status === "completed") ? "completed" : itemRows.some((row) => row.status === "failed") ? "manual_review" : "supplier_pending";
  await db.from("product_order_items").update({ status: itemStatus, supplier_response: { jobs: itemRows }, updated_at: new Date().toISOString() }).eq("id", job.order_item_id);
  const { data: orderJobs } = await db.from("product_supplier_jobs").select("status").eq("order_id", job.order_id);
  const rows = orderJobs ?? [];
  const orderStatus = rows.length > 0 && rows.every((row) => row.status === "completed") ? "completed" : rows.some((row) => row.status === "failed") ? "manual_review" : "supplier_pending";
  const { data: order } = await db.from("product_orders").select("user_id,order_id,status").eq("id", job.order_id).single<{ user_id: string; order_id: string; status: string }>();
  if (!order) return;
  if (order.status !== orderStatus) {
    await db.from("product_orders").update({ status: orderStatus, completed_at: orderStatus === "completed" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", job.order_id);
    await db.from("product_order_status_history").insert({ order_id: job.order_id, old_status: order.status, new_status: orderStatus, changed_by: null, note: "Item4Gamer status updated automatically" });
  }
  if (orderStatus === "completed") {
    const { data: existing } = await db.from("notifications").select("id").eq("user_id", order.user_id).eq("type", "product_order_completed").eq("entity_id", job.order_id).maybeSingle();
    if (!existing) await db.from("notifications").insert({ user_id: order.user_id, type: "product_order_completed", title: "طلبك جاهز", message: `اكتمل تنفيذ الطلب ${order.order_id}. افتحي تفاصيل الطلب لعرض بيانات الشحن أو الكود.`, entity_type: "product_order", entity_id: job.order_id, action_url: `/orders/${job.order_id}` });
  }
}

function finalState(status: string) {
  const normalized = status.toLowerCase();
  if (["completed", "complete", "success", "successful", "processing_complete"].includes(normalized)) return "completed";
  if (["failed", "cancelled", "canceled", "rejected"].includes(normalized)) return "failed";
  if (["refunded"].includes(normalized)) return "refunded";
  return "supplier_pending";
}

export async function dispatchItem4GamerJobs(limit = 25) {
  const db = database();
  const platformStatus=await readPlatformStatus(db);
  if(platformStatus.maintenanceMode||!platformStatus.supplierDispatchEnabled)return {processed:0,skipped:true};
  const { data: jobs, error } = await db.from("product_supplier_jobs")
    .select("id,order_id,order_item_id,supplier_product_id,provider_offer_id,input_values,attempts_count,idempotency_key,supplier_order_id")
    .eq("provider_code", "item4gamer").eq("status", "sending").eq("delivery_state", "not_sent")
    .order("created_at", { ascending: true }).limit(Math.min(50, Math.max(1, limit))).returns<Job[]>();
  if (error) throw error;
  let processed = 0;
  for (const job of jobs ?? []) {
    if (!job.provider_offer_id || !job.supplier_product_id) continue;
    const { data: claimed } = await db.from("product_supplier_jobs").update({ delivery_state: "dispatching", attempts_count: job.attempts_count + 1, last_error: null, updated_at: new Date().toISOString() }).eq("id", job.id).eq("delivery_state", "not_sent").select("id").maybeSingle();
    if (!claimed) continue;
    try {
      const order = await item4gamerAdapter.createOrder({ productId: job.supplier_product_id, variationId: job.provider_offer_id, quantity: 1, inputValues: job.input_values ?? {}, idempotencyKey: job.idempotency_key ?? job.id, catalogKind: "topup" });
      await db.from("product_supplier_jobs").update({ status: "supplier_pending", delivery_state: "sent", supplier_order_id: order.id, supplier_status: order.status, supplier_response: order.raw, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", job.id);
      await refreshOrder(db, job);
      processed += 1;
    } catch (error) {
      await db.from("product_supplier_jobs").update({ status: "sending", delivery_state: "unknown", last_error: `UNKNOWN_DELIVERY_STATE: ${error instanceof Error ? error.message : "Item4Gamer request failed"}`, updated_at: new Date().toISOString() }).eq("id", job.id);
    }
  }
  return { processed };
}

export async function syncItem4GamerStatuses(limit = 100) {
  const db = database();
  const { data: jobs, error } = await db.from("product_supplier_jobs")
    .select("id,order_id,order_item_id,supplier_product_id,provider_offer_id,input_values,attempts_count,idempotency_key,supplier_order_id")
    .eq("provider_code", "item4gamer").eq("status", "supplier_pending").not("supplier_order_id", "is", null)
    .order("updated_at", { ascending: true }).limit(Math.min(200, Math.max(1, limit))).returns<Job[]>();
  if (error) throw error;
  let processed = 0;
  for (const job of jobs ?? []) {
    if (!job.supplier_order_id) continue;
    const order = await item4gamerAdapter.getOrderStatus(job.supplier_order_id);
    if (!order) continue;
    const status = finalState(order.status);
    await db.from("product_supplier_jobs").update({ status, supplier_status: order.status, supplier_response: { ...order.raw, delivered_codes: order.deliveredCodes }, completed_at: status === "completed" || status === "refunded" ? new Date().toISOString() : null, last_error: status === "failed" ? `Provider status: ${order.status}` : null, updated_at: new Date().toISOString() }).eq("id", job.id);
    await refreshOrder(db, job);
    processed += 1;
  }
  return { processed };
}
