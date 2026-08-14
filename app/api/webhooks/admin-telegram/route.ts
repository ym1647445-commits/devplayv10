import { timingSafeEqual } from "node:crypto";
import {
  buildAdminTelegramMessage,
  sendAdminTelegramMessage,
  type DatabaseWebhookPayload,
} from "@/lib/admin/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validSecret(received: string | null) {
  const expected = process.env.TELEGRAM_ADMIN_WEBHOOK_SECRET;
  if (!expected || !received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  if (!validSecret(request.headers.get("x-devplay-webhook-secret"))) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let payload: DatabaseWebhookPayload;
  try {
    payload = (await request.json()) as DatabaseWebhookPayload;
  } catch {
    return Response.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    const message = await buildAdminTelegramMessage(payload);
    if (!message) return Response.json({ success: true, ignored: true });
    await sendAdminTelegramMessage(message);
    return Response.json({ success: true, sent: true });
  } catch (error) {
    console.error("Admin Telegram webhook failed", error);
    return Response.json({ success: false, error: "Telegram notification failed" }, { status: 500 });
  }
}
