import "server-only";

import { createClient } from "@supabase/supabase-js";

interface CandidateJob {
  order_id: string;
  supplier_order_id: string | null;
  supplier_status: string | null;
  status: string;
}

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials are missing");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function reconcileItem4GamerRejectedOrders(limit = 100) {
  const db = database();
  const safeLimit = Math.min(200, Math.max(1, Math.floor(limit)));
  const { data, error } = await db
    .from("product_supplier_jobs")
    .select("order_id,supplier_order_id,supplier_status,status")
    .eq("provider_code", "item4gamer")
    .in("status", ["failed", "refunded"])
    .order("updated_at", { ascending: true })
    .limit(safeLimit)
    .returns<CandidateJob[]>();

  if (error) throw error;

  const orderIds = [...new Set((data ?? []).map((row) => row.order_id))];
  let refunded = 0;
  let waiting = 0;

  for (const orderId of orderIds) {
    const evidence = (data ?? [])
      .filter((row) => row.order_id === orderId)
      .map((row) => ({
        supplier_order_id: row.supplier_order_id,
        supplier_status: row.supplier_status,
        job_status: row.status,
      }));

    const { error: refundError } = await db.rpc(
      "auto_refund_product_order_after_supplier_rejection",
      {
        p_order_id: orderId,
        p_supplier_evidence: {
          provider: "item4gamer",
          checked_at: new Date().toISOString(),
          jobs: evidence,
        },
      },
    );

    if (!refundError) {
      refunded += 1;
      continue;
    }

    const message = refundError.message.toLowerCase();
    if (
      message.includes("not confirmed for every job") ||
      message.includes("partially completed")
    ) {
      waiting += 1;
      continue;
    }

    throw refundError;
  }

  return { candidates: orderIds.length, refunded, waiting };
}
