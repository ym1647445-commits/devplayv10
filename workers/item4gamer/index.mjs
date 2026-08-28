import { createClient } from "@supabase/supabase-js";

const API_BASE_URL = "https://item4gamer.com/wp-json/reseller/v1";
const FINAL_SUCCESS = new Set(["completed", "complete", "success", "successful", "processing_complete"]);
const FINAL_FAILURE = new Set(["failed", "rejected", "cancelled", "canceled"]);
const FINAL_REFUND = new Set(["refunded"]);

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const config = {
  supabaseUrl: requiredEnvironment("SUPABASE_URL"),
  supabaseServiceRoleKey: requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
  item4gamerApiKey: requiredEnvironment("ITEM4GAMER_API_KEY"),
  pollIntervalMs: Math.max(2_000, Number(process.env.WORKER_POLL_INTERVAL_MS ?? 5_000)),
  dispatchBatchSize: Math.min(50, Math.max(1, Number(process.env.WORKER_DISPATCH_BATCH_SIZE ?? 10))),
  syncBatchSize: Math.min(200, Math.max(1, Number(process.env.WORKER_SYNC_BATCH_SIZE ?? 100))),
};

const db = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let stopping = false;
process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

function log(event, details = {}) {
  process.stdout.write(`${JSON.stringify({ at: new Date().toISOString(), event, ...details })}\n`);
}

class ProviderError extends Error {
  constructor(message, { status = 0, payload = null, confirmedRejection = false } = {}) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
    this.payload = payload;
    this.confirmedRejection = confirmedRejection;
  }
}

async function providerRequest(path, { method = "GET", body, idempotencyKey } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/${path.replace(/^\/+/, "")}`, {
      method,
      body,
      signal: AbortSignal.timeout(20_000),
      headers: {
        Accept: "application/json",
        "User-Agent": "DevPlayStudio-SupplierWorker/1.0",
        "api-key": config.item4gamerApiKey,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
    });
  } catch (error) {
    throw new ProviderError(error instanceof Error ? error.message : "Provider network failure");
  }

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new ProviderError(`Provider returned non-JSON HTTP ${response.status}`, {
      status: response.status,
      payload: { contentType: response.headers.get("content-type") ?? "unknown" },
    });
  }

  const data = payload?.data;
  const apiStatus = Number(data?.status ?? response.status);
  if (!response.ok || !data || apiStatus < 200 || apiStatus >= 300) {
    const confirmedRejection = [400, 422].includes(apiStatus) && Boolean(data?.message || payload?.message);
    throw new ProviderError(data?.message || payload?.message || `Provider request failed (${apiStatus})`, {
      status: apiStatus,
      payload,
      confirmedRejection,
    });
  }
  return data;
}

function extractCodes(value) {
  const found = new Set();
  const visit = (entry) => {
    if (typeof entry === "string") {
      for (const code of entry.match(/\b[A-Z0-9][A-Z0-9-]{5,}\b/gi) ?? []) found.add(code);
    } else if (Array.isArray(entry)) {
      entry.forEach(visit);
    } else if (entry && typeof entry === "object") {
      Object.values(entry).forEach(visit);
    }
  };
  visit(value);
  return [...found];
}

function normalizedStatus(value) {
  return String(value ?? "pending").trim().toLowerCase();
}

function localStatus(providerStatus) {
  if (FINAL_SUCCESS.has(providerStatus)) return "completed";
  if (FINAL_FAILURE.has(providerStatus)) return "failed";
  if (FINAL_REFUND.has(providerStatus)) return "refunded";
  return "supplier_pending";
}

async function platformAllowsDispatch() {
  const { data, error } = await db
    .from("platform_settings")
    .select("maintenance_mode,supplier_dispatch_enabled")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data && !data.maintenance_mode && data.supplier_dispatch_enabled);
}

async function refreshOrder(job) {
  const { data: itemJobs, error: itemJobsError } = await db
    .from("product_supplier_jobs")
    .select("id,status,supplier_order_id,supplier_status,supplier_response,last_error")
    .eq("order_item_id", job.order_item_id);
  if (itemJobsError) throw itemJobsError;
  const itemRows = itemJobs ?? [];
  const itemStatus = itemRows.length > 0 && itemRows.every((row) => row.status === "completed")
    ? "completed"
    : itemRows.some((row) => row.status === "failed")
      ? "manual_review"
      : itemRows.some((row) => row.status === "refunded")
        ? "manual_review"
        : "supplier_pending";
  const { error: itemError } = await db.from("product_order_items").update({
    status: itemStatus,
    supplier_response: { jobs: itemRows },
    updated_at: new Date().toISOString(),
  }).eq("id", job.order_item_id);
  if (itemError) throw itemError;

  const { data: orderJobs, error: orderJobsError } = await db
    .from("product_supplier_jobs").select("status").eq("order_id", job.order_id);
  if (orderJobsError) throw orderJobsError;
  const rows = orderJobs ?? [];
  const orderStatus = rows.length > 0 && rows.every((row) => row.status === "completed")
    ? "completed"
    : rows.some((row) => row.status === "failed")
      ? "manual_review"
      : rows.some((row) => row.status === "refunded")
        ? "manual_review"
        : "supplier_pending";
  const { data: order, error: orderError } = await db
    .from("product_orders").select("user_id,order_id,status").eq("id", job.order_id).single();
  if (orderError) throw orderError;
  if (order.status === orderStatus || order.status === "refunded") return;

  const { error: updateError } = await db.from("product_orders").update({
    status: orderStatus,
    completed_at: orderStatus === "completed" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", job.order_id).eq("status", order.status);
  if (updateError) throw updateError;
  const { error: historyError } = await db.from("product_order_status_history").insert({
    order_id: job.order_id,
    old_status: order.status,
    new_status: orderStatus,
    changed_by: null,
    note: "Item4Gamer VPS worker synchronized supplier status",
  });
  if (historyError) throw historyError;

  if (orderStatus === "completed") {
    const { data: existing } = await db.from("notifications").select("id")
      .eq("user_id", order.user_id).eq("type", "product_order_completed")
      .eq("entity_id", job.order_id).maybeSingle();
    if (!existing) {
      const { error: notificationError } = await db.from("notifications").insert({
        user_id: order.user_id,
        type: "product_order_completed",
        title: "طلبك جاهز",
        message: `اكتمل تنفيذ الطلب ${order.order_id}. افتحي تفاصيل الطلب لعرض بيانات الشحن أو الكود.`,
        entity_type: "product_order",
        entity_id: job.order_id,
        action_url: `/orders/${job.order_id}`,
      });
      if (notificationError) throw notificationError;
    }
  }
}

async function claimJobs() {
  const { data, error } = await db.rpc("claim_item4gamer_supplier_jobs", {
    p_limit: config.dispatchBatchSize,
  });
  if (error) throw error;
  return data ?? [];
}

async function dispatch() {
  if (!(await platformAllowsDispatch())) {
    log("dispatch_paused_by_platform_settings");
    return 0;
  }
  const jobs = await claimJobs();
  let processed = 0;
  for (const job of jobs) {
    try {
      const response = await providerRequest("order/add-order", {
        method: "POST",
        idempotencyKey: job.idempotency_key,
        body: JSON.stringify({
          variation_id: job.provider_offer_id,
          quantity: 1,
          data: job.input_values ?? {},
        }),
      });
      const supplierOrderId = response.order_id == null ? "" : String(response.order_id);
      if (!supplierOrderId) throw new ProviderError("Provider response is missing order_id");
      const { error } = await db.from("product_supplier_jobs").update({
        status: "supplier_pending",
        delivery_state: "sent",
        supplier_order_id: supplierOrderId,
        supplier_status: "pending",
        supplier_response: response,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", job.id).eq("delivery_state", "dispatching");
      if (error) throw error;
      await refreshOrder(job);
      processed += 1;
      log("job_dispatched", { jobId: job.id, supplierOrderId });
    } catch (error) {
      const providerError = error instanceof ProviderError ? error : null;
      if (providerError?.confirmedRejection) {
        const { error: updateError } = await db.from("product_supplier_jobs").update({
          status: "failed",
          delivery_state: "not_sent",
          supplier_status: "rejected",
          supplier_response: providerError.payload,
          last_error: `CONFIRMED_REJECTION: ${providerError.message}`,
          updated_at: new Date().toISOString(),
        }).eq("id", job.id).eq("delivery_state", "dispatching");
        if (updateError) throw updateError;
        await refreshOrder(job);
        log("job_rejected", { jobId: job.id, status: providerError.status });
      } else {
        const message = error instanceof Error ? error.message : "Provider request failed";
        const { error: updateError } = await db.from("product_supplier_jobs").update({
          status: "sending",
          delivery_state: "unknown",
          last_error: `UNKNOWN_DELIVERY_STATE: ${message}`,
          updated_at: new Date().toISOString(),
        }).eq("id", job.id).eq("delivery_state", "dispatching");
        if (updateError) throw updateError;
        log("job_delivery_unknown", { jobId: job.id });
      }
    }
  }
  return processed;
}

async function syncStatuses() {
  const { data: jobs, error } = await db.from("product_supplier_jobs")
    .select("id,order_id,order_item_id,supplier_order_id")
    .eq("provider_code", "item4gamer")
    .eq("status", "supplier_pending")
    .not("supplier_order_id", "is", null)
    .order("updated_at", { ascending: true })
    .limit(config.syncBatchSize);
  if (error) throw error;
  let processed = 0;
  for (const job of jobs ?? []) {
    try {
      const response = await providerRequest(`order/get-order?order_id=${encodeURIComponent(job.supplier_order_id)}`);
      if (!response.order) continue;
      const supplierStatus = normalizedStatus(response.order.status);
      const status = localStatus(supplierStatus);
      const deliveredCodes = extractCodes(response.order);
      const { error: updateError } = await db.from("product_supplier_jobs").update({
        status,
        supplier_status: supplierStatus,
        supplier_response: { ...response.order, delivered_codes: deliveredCodes },
        completed_at: status === "completed" || status === "refunded" ? new Date().toISOString() : null,
        last_error: status === "failed" ? `Provider status: ${supplierStatus}` : null,
        updated_at: new Date().toISOString(),
      }).eq("id", job.id).eq("supplier_order_id", job.supplier_order_id);
      if (updateError) throw updateError;
      await refreshOrder(job);
      processed += 1;
      log("job_status_synced", { jobId: job.id, supplierStatus, deliveredCodes: deliveredCodes.length });
    } catch (error) {
      log("status_sync_failed", { jobId: job.id, message: error instanceof Error ? error.message : "unknown" });
    }
  }
  return processed;
}

async function reconcileRefunds() {
  const { data, error } = await db.from("product_supplier_jobs")
    .select("order_id,supplier_order_id,supplier_status,status")
    .eq("provider_code", "item4gamer")
    .in("status", ["failed", "refunded"])
    .order("updated_at", { ascending: true })
    .limit(config.syncBatchSize);
  if (error) throw error;
  const orderIds = [...new Set((data ?? []).map((row) => row.order_id))];
  let refunded = 0;
  for (const orderId of orderIds) {
    const { data: order, error: orderError } = await db.from("product_orders")
      .select("status").eq("id", orderId).maybeSingle();
    if (orderError) throw orderError;
    if (!order || order.status === "refunded" || order.status === "completed") continue;
    const evidence = (data ?? []).filter((row) => row.order_id === orderId);
    const { error: refundError } = await db.rpc("auto_refund_product_order_after_supplier_rejection", {
      p_order_id: orderId,
      p_supplier_evidence: { provider: "item4gamer", checked_at: new Date().toISOString(), jobs: evidence },
    });
    if (!refundError) {
      refunded += 1;
      log("order_refund_reconciled", { orderId });
      continue;
    }
    const message = refundError.message.toLowerCase();
    if (message.includes("not confirmed for every job") || message.includes("partially completed")) continue;
    throw refundError;
  }
  return refunded;
}

const CATALOG_IDS = { topup: [19, 18], gc: [20] };
async function syncCatalogProducts() {
  let count = 0;
  const now = new Date().toISOString();
  for (const [kind, categoryIds] of Object.entries(CATALOG_IDS)) {
    const catalogType = kind === "gift_card" ? "gc" : "topup";
    for (const categoryId of categoryIds) {
      const response = await providerRequest(`product/get-products?category_id=${categoryId}`);
      for (const product of response.products ?? []) {
        const providerCategoryId = String(product.id ?? "").trim();
        const name = String(product.name ?? "").trim();
        if (!providerCategoryId || !name) continue;
        const { data: existing, error: readError } = await db.from("provider_categories").select("id").eq("provider_name", "item4gamer").eq("catalog_type", catalogType).eq("provider_category_id", providerCategoryId).maybeSingle();
        if (readError) throw readError;
        const payload = { provider_name: "item4gamer", catalog_type: catalogType, provider_category_id: providerCategoryId, name, provider_category: String(categoryId), active: true, raw_data: { ...product, category_id: categoryId }, last_synced_at: now };
        const query = existing ? db.from("provider_categories").update(payload).eq("id", existing.id) : db.from("provider_categories").insert({ ...payload, first_synced_at: now });
        const { error } = await query;
        if (error) throw error;
        count += 1;
      }
    }
  }
  const balance = await providerRequest("get-balance");
  const { error: providerError } = await db.from("providers").update({ active: true, status: "healthy", current_balance: Number(balance.balance ?? 0), balance_currency: String(balance.currency ?? "USD"), last_balance_at: now, last_sync_at: now, last_error: null, updated_at: now }).eq("code", "item4gamer");
  if (providerError) throw providerError;
  return { products_count: count };
}

async function syncCatalogVariations(job) {
  const { data: category, error: categoryError } = await db.from("provider_categories").select("id,provider_category_id,catalog_type,name").eq("id", job.category_row_id).eq("provider_name", "item4gamer").single();
  if (categoryError || !category) throw categoryError ?? new Error("Item4Gamer category not found");
  const response = await providerRequest(`product/get-product?product_id=${encodeURIComponent(category.provider_category_id)}`);
  const variations = response.product?.variations ?? [];
  const { data: current, error: currentError } = await db.from("provider_offers").select("id,provider_offer_id").eq("provider_name", "item4gamer").eq("catalog_type", category.catalog_type).eq("provider_category_id", category.provider_category_id);
  if (currentError) throw currentError;
  const existing = new Map((current ?? []).map((row) => [row.provider_offer_id, row.id]));
  const now = new Date().toISOString();
  for (const variation of variations) {
    const providerOfferId = String(variation.id ?? "").trim();
    if (!providerOfferId) continue;
    const payload = { provider_name: "item4gamer", catalog_type: category.catalog_type, provider_category_row_id: category.id, provider_category_id: category.provider_category_id, provider_offer_id: providerOfferId, name: String(variation.name ?? providerOfferId), price: Number(variation.price ?? 0), original_price: null, currency: String(variation.currency ?? "USD"), stock: null, available: variation.in_stock !== false, raw_data: variation, last_synced_at: now };
    const rowId = existing.get(providerOfferId);
    const query = rowId ? db.from("provider_offers").update(payload).eq("id", rowId) : db.from("provider_offers").insert(payload);
    const { error } = await query;
    if (error) throw error;
  }
  return { category: category.name, variations_count: variations.length };
}

async function processCatalogSyncJobs() {
  const { data: jobs, error } = await db.rpc("claim_item4gamer_catalog_sync_jobs", { p_limit: 3, p_worker: "item4gamer-vps" });
  if (error) {
    if (error.message.includes("Could not find the function")) return 0;
    throw error;
  }
  let processed = 0;
  for (const job of jobs ?? []) {
    try {
      const result = job.sync_type === "products" ? await syncCatalogProducts(job) : await syncCatalogVariations(job);
      const now = new Date().toISOString();
      const { error: finishError } = await db.from("item4gamer_catalog_sync_jobs").update({ status: "completed", result, error_message: null, completed_at: now, updated_at: now }).eq("id", job.id).eq("status", "running");
      if (finishError) throw finishError;
      const { error: logError } = await db.from("activity_logs").insert({ user_id: job.requested_by, actor_id: job.requested_by, action: "item4gamer_catalog_sync_completed", entity_type: "item4gamer_catalog_sync_job", entity_id: job.id, description: "Item4Gamer catalog sync completed on static-IP VPS", new_data: result });
      if (logError) throw logError;
      processed += 1;
      log("catalog_sync_completed", { jobId: job.id, syncType: job.sync_type, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Catalog sync failed";
      const now = new Date().toISOString();
      const { error: failError } = await db.from("item4gamer_catalog_sync_jobs").update({ status: "failed", error_message: message, completed_at: now, updated_at: now }).eq("id", job.id).eq("status", "running");
      if (failError) log("catalog_sync_failure_persist_failed", { jobId: job.id, message: failError.message });
      log("catalog_sync_failed", { jobId: job.id, message });
    }
  }
  return processed;
}
async function cycle() {
  const catalogSynced = await processCatalogSyncJobs();
  const dispatched = await dispatch();
  const synced = await syncStatuses();
  const refunded = await reconcileRefunds();
  if (catalogSynced || dispatched || synced || refunded) log("cycle_complete", { catalogSynced, dispatched, synced, refunded });
}

async function main() {
  log("worker_started", { pollIntervalMs: config.pollIntervalMs });
  while (!stopping) {
    try {
      await cycle();
    } catch (error) {
      log("cycle_failed", { message: error instanceof Error ? error.message : "unknown" });
    }
    if (!stopping) await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
  }
  log("worker_stopped");
}

await main();
