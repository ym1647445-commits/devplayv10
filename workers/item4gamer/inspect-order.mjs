import { createClient } from "@supabase/supabase-js";

const orderNumber = process.argv[2];
if (!orderNumber) throw new Error("Usage: node workers/item4gamer/inspect-order.mjs DP-O-000024");
const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: order, error } = await db.from("product_orders")
  .select("id,order_id,status,created_at,product_supplier_jobs(id,status,delivery_state,supplier_order_id,supplier_status,attempts_count,idempotency_key,last_error)")
  .eq("order_id", orderNumber)
  .maybeSingle();
if (error) throw error;
process.stdout.write(`${JSON.stringify(order ?? { order_id: orderNumber, found: false }, null, 2)}\n`);
