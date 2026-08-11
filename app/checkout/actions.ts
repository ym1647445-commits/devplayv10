"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { dispatchCreatedOrder } from "@/lib/provider/automatic-dispatch";
import { createClient } from "@/lib/supabase/server";
import type {
  CheckoutActionResult,
  CreateCheckoutPayload,
} from "@/types/checkout";

interface StoreProductReference {
  id: string;
  name_ar: string;
  active: boolean;
  status: "available" | "busy" | "unavailable";
  minimum_quantity: number;
  maximum_quantity: number;
}

interface StoreOfferReference {
  id: string;
  product_id: string;
  name_ar: string;
  supplier_price_usd: number | string;
  profit_usd: number | string;
  stock: number | null;
  available: boolean;
  active: boolean;
}

interface CreatedOrderRow {
  id: string;
  order_id: string;
  subtotal_usd: number | string;
  discount_usd: number | string;
  total_usd: number | string;
  total_egp_snapshot: number | string;
  status: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function translateCheckoutError(message: string): string {
  const normalized = message.toLowerCase();
  const translations: Array<[string, string]> = [
    ["insufficient wallet balance", "رصيد المحفظة غير كافٍ لإتمام الطلب."],
    ["customer wallet is frozen", "المحفظة مجمدة مؤقتًا ولا يمكن إتمام الطلب."],
    ["offer does not belong to product", "الباقة المختارة لا تتبع المنتج المطلوب."],
    ["offer is unavailable", "إحدى الباقات لم تعد متاحة حاليًا."],
    ["offer stock is insufficient", "الكمية المطلوبة غير متوفرة حاليًا."],
    ["product is unavailable", "أحد المنتجات لم يعد متاحًا حاليًا."],
    ["invalid quantity", "الكمية المطلوبة غير مسموح بها لإحدى الباقات."],
    ["missing required field", "بعض بيانات تنفيذ الباقات ناقصة."],
    ["coupon is invalid or expired", "الكوبون غير صالح أو انتهت صلاحيته."],
    ["coupon usage limit reached", "وصل الكوبون إلى الحد الأقصى للاستخدام."],
    ["coupon user limit reached", "استخدمتِ هذا الكوبون بالعدد المسموح بالفعل."],
    ["cart does not meet coupon minimum", "السلة لا تحقق الحد الأدنى المطلوب للكوبون."],
    ["coupon discount exceeds safe profit", "لا يمكن تطبيق الكوبون لأن الخصم يتجاوز الحد الآمن."],
    ["authentication required", "يجب تسجيل الدخول أولًا."],
  ];

  return (
    translations.find(([needle]) => normalized.includes(needle))?.[1] ??
    message
  );
}

export async function createCheckoutOrder(
  payload: CreateCheckoutPayload,
): Promise<CheckoutActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "يجب تسجيل الدخول أولًا." };
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return { success: false, message: "السلة فارغة." };
    }

    if (payload.items.length > 50) {
      return {
        success: false,
        message: "عدد عناصر السلة أكبر من الحد المسموح.",
      };
    }

    for (const item of payload.items) {
      if (!UUID_PATTERN.test(item.productId) || !UUID_PATTERN.test(item.offerId)) {
        return { success: false, message: "بيانات المنتج أو الباقة غير صحيحة." };
      }

      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return { success: false, message: "كمية إحدى الباقات غير صحيحة." };
      }

      if (
        !item.inputValues ||
        typeof item.inputValues !== "object" ||
        Array.isArray(item.inputValues)
      ) {
        return { success: false, message: "بيانات تنفيذ إحدى الباقات غير صحيحة." };
      }
    }

    const productIds = [...new Set(payload.items.map((item) => item.productId))];
    const offerIds = [...new Set(payload.items.map((item) => item.offerId))];

    const [productsResult, offersResult] = await Promise.all([
      supabase
        .from("store_products")
        .select("id, name_ar, active, status, minimum_quantity, maximum_quantity")
        .in("id", productIds)
        .returns<StoreProductReference[]>(),
      supabase
        .from("store_product_offers")
        .select(
          "id, product_id, name_ar, supplier_price_usd, profit_usd, stock, available, active",
        )
        .in("id", offerIds)
        .returns<StoreOfferReference[]>(),
    ]);

    if (productsResult.error) throw new Error(productsResult.error.message);
    if (offersResult.error) throw new Error(offersResult.error.message);

    const products = new Map(
      (productsResult.data ?? []).map((product) => [product.id, product]),
    );
    const offers = new Map(
      (offersResult.data ?? []).map((offer) => [offer.id, offer]),
    );

    const rpcItems = payload.items.map((item) => {
      const product = products.get(item.productId);
      const offer = offers.get(item.offerId);

      if (!product || !product.active || product.status === "unavailable") {
        throw new Error("Product is unavailable");
      }

      if (!offer || !offer.active || !offer.available) {
        throw new Error("Offer is unavailable");
      }

      if (offer.product_id !== product.id) {
        throw new Error("Offer does not belong to product");
      }

      if (
        item.quantity < product.minimum_quantity ||
        item.quantity > product.maximum_quantity
      ) {
        throw new Error("Invalid quantity");
      }

      if (offer.stock !== null && offer.stock < item.quantity) {
        throw new Error("Offer stock is insufficient");
      }

      const supplierPrice = Number(offer.supplier_price_usd);
      const profit = Number(offer.profit_usd);
      if (
        !Number.isFinite(supplierPrice) ||
        supplierPrice < 0 ||
        !Number.isFinite(profit) ||
        profit < 0 ||
        supplierPrice + profit <= 0
      ) {
        throw new Error("Offer price is invalid");
      }

      return {
        product_id: product.id,
        offer_id: offer.id,
        quantity: item.quantity,
        input_values: item.inputValues,
      };
    });

    const { data, error: orderError } = await supabase.rpc(
      "create_product_order",
      {
        p_items: rpcItems,
        p_coupon_code: payload.couponCode?.trim() || null,
        p_customer_note: payload.customerNote?.trim() || null,
      },
    );

    if (orderError) {
      return {
        success: false,
        message: translateCheckoutError(orderError.message),
      };
    }

    const rawOrder = Array.isArray(data) ? data[0] : data;
    if (!rawOrder) {
      return {
        success: false,
        message: "تم تنفيذ العملية لكن تعذرت قراءة بيانات الطلب.",
      };
    }

    const order = rawOrder as CreatedOrderRow;

    after(async()=>{try{await dispatchCreatedOrder(order.id)}catch(error){console.error("Automatic Flexy dispatch failed",error)}});

    for (const path of [
      "/wallet",
      "/wallet/transactions",
      "/orders",
      "/notifications",
      "/account",
      "/admin",
      "/admin/orders",
    ]) {
      revalidatePath(path);
    }

    return {
      success: true,
      message: "تم إنشاء الطلب وخصم الرصيد بنجاح.",
      order: {
        id: order.id,
        orderId: order.order_id,
        subtotalUsd: Number(order.subtotal_usd),
        discountUsd: Number(order.discount_usd),
        totalUsd: Number(order.total_usd),
        totalEgp: Number(order.total_egp_snapshot),
        status: order.status,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء الطلب.";
    return { success: false, message: translateCheckoutError(message) };
  }
}
