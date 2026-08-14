import { createClient } from "@supabase/supabase-js";

type DatabaseWebhookPayload = {
  type?: "INSERT" | "UPDATE" | "DELETE";
  table?: string;
  schema?: string;
  record?: Record<string, unknown> | null;
  old_record?: Record<string, unknown> | null;
};

type AdminTelegramMessage = {
  text: string;
  actionUrl?: string;
};

type Customer = {
  id: string;
  customer_id: string | null;
  full_name: string | null;
  email: string | null;
};

const appUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://devplaystudio.com").replace(/\/$/, "");

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function value(record: Record<string, unknown>, key: string) {
  return record[key] == null ? "—" : String(record[key]);
}

function money(valueToFormat: unknown, currency = "USD") {
  const numeric = Number(valueToFormat ?? 0);
  return `${Number.isFinite(numeric) ? numeric.toLocaleString("en-US", { maximumFractionDigits: 4 }) : "0"} ${currency}`;
}

async function loadCustomer(userId: unknown): Promise<Customer | null> {
  if (!userId) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await db
    .from("profiles")
    .select("id,customer_id,full_name,email")
    .eq("id", String(userId))
    .maybeSingle<Customer>();
  return data ?? null;
}

function customerLines(customer: Customer | null, fallbackId: unknown) {
  return [
    `👤 <b>${escapeHtml(customer?.full_name || customer?.email || "عميل DevPlay")}</b>`,
    `🆔 <code>${escapeHtml(customer?.customer_id || fallbackId)}</code>`,
    customer?.email ? `✉️ ${escapeHtml(customer.email)}` : null,
  ].filter(Boolean);
}

export async function buildAdminTelegramMessage(payload: DatabaseWebhookPayload): Promise<AdminTelegramMessage | null> {
  const record = payload.record ?? {};
  const oldRecord = payload.old_record ?? {};
  const event = payload.type;

  if (payload.schema !== "public" || !event) return null;

  if (payload.table === "profiles" && event === "INSERT") {
    return {
      text: [
        "🟣 <b>عميل جديد في DevPlay</b>",
        "",
        `👤 <b>${escapeHtml(value(record, "full_name"))}</b>`,
        `🆔 <code>${escapeHtml(value(record, "customer_id"))}</code>`,
        `✉️ ${escapeHtml(value(record, "email"))}`,
      ].join("\n"),
      actionUrl: `${appUrl}/admin/users/${encodeURIComponent(value(record, "id"))}`,
    };
  }

  if (payload.table === "deposit_requests" && event === "INSERT") {
    const customer = await loadCustomer(record.user_id);
    return {
      text: [
        "💰 <b>طلب إضافة رصيد جديد</b>",
        "",
        ...customerLines(customer, record.user_id),
        `🧾 الطلب: <code>${escapeHtml(value(record, "deposit_id"))}</code>`,
        `💵 المطلوب: <b>${escapeHtml(money(record.requested_amount, value(record, "requested_currency")))}</b>`,
        `➕ سيُضاف: <b>${escapeHtml(money(record.credit_usd))}</b>`,
        `📌 الحالة: ${escapeHtml(value(record, "status"))}`,
      ].join("\n"),
      actionUrl: `${appUrl}/admin/deposits`,
    };
  }

  if (payload.table === "product_orders" && event === "INSERT") {
    const customer = await loadCustomer(record.user_id);
    return {
      text: [
        "🛒 <b>طلب شحن جديد</b>",
        "",
        ...customerLines(customer, record.user_id),
        `📦 الطلب: <code>${escapeHtml(value(record, "order_id"))}</code>`,
        `💵 الإجمالي: <b>${escapeHtml(money(record.total_usd))}</b>`,
        `🏷 الخصم: ${escapeHtml(money(record.discount_usd))}`,
        `📌 الحالة: ${escapeHtml(value(record, "status"))}`,
      ].join("\n"),
      actionUrl: `${appUrl}/admin/orders`,
    };
  }

  if (payload.table === "product_orders" && event === "UPDATE" && record.status !== oldRecord.status) {
    const customer = await loadCustomer(record.user_id);
    const status = value(record, "status");
    const icon = status === "completed" ? "✅" : ["failed", "cancelled", "refunded"].includes(status) ? "🚨" : "🔄";
    return {
      text: [
        `${icon} <b>تحديث حالة طلب</b>`,
        "",
        ...customerLines(customer, record.user_id),
        `📦 الطلب: <code>${escapeHtml(value(record, "order_id"))}</code>`,
        `📌 ${escapeHtml(value(oldRecord, "status"))} ← <b>${escapeHtml(status)}</b>`,
        record.failure_reason ? `⚠️ ${escapeHtml(record.failure_reason)}` : null,
      ].filter(Boolean).join("\n"),
      actionUrl: `${appUrl}/admin/orders`,
    };
  }

  if (payload.table === "support_tickets" && event === "INSERT") {
    const customer = await loadCustomer(record.user_id);
    return {
      text: [
        "💬 <b>رسالة جديدة لخدمة العملاء</b>",
        "",
        ...customerLines(customer, record.user_id),
        `🎫 التذكرة: <code>${escapeHtml(value(record, "ticket_id"))}</code>`,
        `📝 ${escapeHtml(value(record, "subject"))}`,
        `⚡ الأولوية: ${escapeHtml(value(record, "priority"))}`,
      ].join("\n"),
      actionUrl: `${appUrl}/admin/support`,
    };
  }

  return null;
}

export async function sendAdminTelegramMessage(message: AdminTelegramMessage) {
  const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) throw new Error("Telegram admin credentials are missing");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message.text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: message.actionUrl
        ? { inline_keyboard: [[{ text: "فتح لوحة الإدارة", url: message.actionUrl }]] }
        : undefined,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram API failed (${response.status}): ${body.slice(0, 300)}`);
  }
}

export type { DatabaseWebhookPayload };
