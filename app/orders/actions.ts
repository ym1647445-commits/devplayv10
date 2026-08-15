"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

interface RedemptionRequestInput {
  orderId: string;
  accountIdentifier: string;
  customerNote?: string;
}

interface RedemptionRequestResult {
  success: boolean;
  message: string;
  ticketId?: string;
}

function extractDeliveredCodes(value: unknown, result = new Set<string>()): string[] {
  if (Array.isArray(value)) {
    value.forEach((item) => extractDeliveredCodes(item, result));
    return [...result];
  }
  if (!value || typeof value !== "object") return [...result];
  const row = value as Record<string, unknown>;
  for (const key of ["delivered_code", "deliveredCode"]) {
    if (typeof row[key] === "string" && row[key]) result.add(row[key] as string);
  }
  for (const key of ["delivered_codes", "deliveredCodes"]) {
    const codes = row[key];
    if (Array.isArray(codes)) codes.forEach((code) => {
      if (typeof code === "string" && code) result.add(code);
    });
  }
  Object.values(row).forEach((item) => extractDeliveredCodes(item, result));
  return [...result];
}

export async function requestCodeRedemption(
  input: RedemptionRequestInput,
): Promise<RedemptionRequestResult> {
  try {
    const accountIdentifier = input.accountIdentifier.trim();
    const customerNote = input.customerNote?.trim() ?? "";

    if (!input.orderId.trim()) return { success: false, message: "رقم الطلب غير صحيح." };
    if (accountIdentifier.length < 2 || accountIdentifier.length > 500) {
      return { success: false, message: "اكتبي معرف الحساب أو رابطه بصورة صحيحة." };
    }
    if (customerNote.length > 1000) return { success: false, message: "الملاحظة طويلة جدًا." };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "يجب تسجيل الدخول أولًا." };

    const { data: order, error: orderError } = await supabase
      .from("product_orders")
      .select("id,order_id,user_id,product_order_items(id,product_id,offer_id,product_name,offer_name,supplier_response)")
      .eq("id", input.orderId)
      .eq("user_id", user.id)
      .single<{
        id: string;
        order_id: string;
        user_id: string;
        product_order_items: Array<{
          id: string;
          product_id: string;
          offer_id: string | null;
          product_name: string;
          offer_name: string | null;
          supplier_response: unknown;
        }> | null;
      }>();

    if (orderError || !order) return { success: false, message: "لم يتم العثور على الطلب." };

    const items = order.product_order_items ?? [];
    const deliveredCodes = items.flatMap((item) => extractDeliveredCodes(item.supplier_response));
    if (!deliveredCodes.length) {
      return { success: false, message: "لا يوجد كود مستلم في هذا الطلب حتى الآن." };
    }

    const productIds = [...new Set(items.map((item) => item.product_id).filter(Boolean))];
    const { data: products, error: productsError } = productIds.length
      ? await supabase.from("store_products").select("id,provider_data").in("id", productIds)
      : { data: [], error: null };
    if (productsError) return { success: false, message: "تعذر التحقق من خدمة تنفيذ الكود." };

    const redemptionProduct = (products ?? []).find((product) => {
      const data = product.provider_data as Record<string, unknown> | null;
      return data?.redemption_assisted_enabled === true || data?.redemption_mode === "assisted";
    });
    if (!redemptionProduct) return { success: false, message: "خدمة تنفيذ الكود غير مفعلة لهذا المنتج." };
    const redemptionData = redemptionProduct.provider_data as Record<string, unknown> | null;
    const redemptionSteps = Array.isArray(redemptionData?.redemption_steps)
      ? redemptionData.redemption_steps.filter((step): step is string => typeof step === "string" && Boolean(step.trim()))
      : typeof redemptionData?.redemption_instructions_ar === "string"
        ? redemptionData.redemption_instructions_ar.split("\n").filter(Boolean)
        : [];
    const redemptionUrl = typeof redemptionData?.redemption_url === "string" ? redemptionData.redemption_url : null;

    const subject = `طلب تنفيذ كود - ${order.order_id}`;
    const { data: existingTicket } = await supabase
      .from("support_tickets")
      .select("id")
      .eq("user_id", user.id)
      .eq("subject", subject)
      .not("status", "in", "(resolved,closed)")
      .maybeSingle<{ id: string }>();

    if (existingTicket) {
      return {
        success: true,
        message: "لديك طلب تنفيذ مفتوح بالفعل. يمكنك متابعته من شات خدمة العملاء.",
        ticketId: existingTicket.id,
      };
    }

    const itemSummary = items
      .map((item) => `${item.product_name}${item.offer_name ? ` - ${item.offer_name}` : ""}`)
      .join("، ");
    const message = [
      "طلب تنفيذ كود بواسطة إدارة DevPlay.",
      `رقم الطلب: ${order.order_id}`,
      `المنتج: ${itemSummary}`,
      `بيانات الحساب: ${accountIdentifier}`,
      customerNote ? `ملاحظة العميل: ${customerNote}` : null,
      redemptionSteps.length ? `خطوات التنفيذ:\n${redemptionSteps.map((step,index)=>`${index+1}. ${step}`).join("\n")}` : null,
      redemptionUrl ? `فتح موقع الاسترداد: ${redemptionUrl}` : null,
      "الكود موجود داخل الطلب الأصلي ولا تتم كتابته في المحادثة حفاظًا عليه.",
    ].filter(Boolean).join("\n");

    const { data: ticket, error: ticketError } = await supabase.rpc("create_support_ticket", {
      p_category: "order",
      p_subject: subject,
      p_message: message,
    });
    if (ticketError) return { success: false, message: ticketError.message };

    const rawTicket = Array.isArray(ticket) ? ticket[0] : ticket;
    const ticketId = rawTicket && typeof rawTicket === "object" && "id" in rawTicket
      ? String((rawTicket as { id: unknown }).id)
      : undefined;

    revalidatePath("/orders");
    revalidatePath("/support");
    revalidatePath("/admin/support");

    return { success: true, message: "تم إرسال طلب تنفيذ الكود إلى الإدارة بنجاح.", ticketId };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "تعذر إرسال طلب تنفيذ الكود." };
  }
}
