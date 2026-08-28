"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  after,
} from "next/server";

import {
  dispatchCreatedOrder,
} from "@/lib/provider/automatic-dispatch";

import {
  createClient,
} from "@/lib/supabase/server";
import { assertOperationEnabled } from "@/lib/platform-status";
import { getEffectiveOfferPriceUsd, isOfferPriceSafe } from "@/lib/offerPricing";

import type {
  CheckoutActionResult,
  CreateCheckoutPayload,
} from "@/types/checkout";

interface StoreProductReference {
  id: string;

  name_ar: string;

  active: boolean;

  status:
    | "available"
    | "busy"
    | "unavailable";

  minimum_quantity: number;

  maximum_quantity: number;
}

interface StoreOfferReference {
  id: string;

  product_id: string;

  provider_offer_id: string;

  name_ar: string;

  supplier_price_usd:
    | number
    | string;

  profit_usd:
    | number
    | string;

  manual_selling_price_usd: number | string | null;

  stock:
    | number
    | null;

  available: boolean;

  active: boolean;
}

interface CreatedOrderRow {
  id: string;

  order_id: string;

  subtotal_usd:
    | number
    | string;

  discount_usd:
    | number
    | string;

  total_usd:
    | number
    | string;

  total_egp_snapshot:
    | number
    | string;

  status: string;
}

function translateCheckoutError(
  message: string,
): string {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "insufficient wallet balance",
    )
  ) {
    return "رصيد المحفظة غير كافٍ لإتمام الطلب.";
  }

  if (
    normalized.includes(
      "customer wallet is frozen",
    )
  ) {
    return "المحفظة مجمدة مؤقتًا ولا يمكن إتمام الطلب.";
  }

  if (
    normalized.includes(
      "product is unavailable",
    )
  ) {
    return "أحد المنتجات لم يعد متاحًا حاليًا.";
  }

  if (
    normalized.includes(
      "offer is unavailable",
    )
  ) {
    return "إحدى الباقات لم تعد متاحة حاليًا.";
  }

  if (
    normalized.includes(
      "offer does not belong to product",
    )
  ) {
    return "الباقة المختارة غير مرتبطة بالمنتج الصحيح.";
  }

  if (
    normalized.includes(
      "invalid offer id",
    )
  ) {
    return "معرّف إحدى الباقات غير صحيح.";
  }

  if (
    normalized.includes(
      "invalid quantity",
    )
  ) {
    return "الكمية المطلوبة غير صحيحة.";
  }

  if (
    normalized.includes(
      "missing required field",
    )
  ) {
    return "بعض بيانات تنفيذ الباقات ناقصة.";
  }

  if (
    normalized.includes(
      "coupon is invalid or expired",
    )
  ) {
    return "الكوبون غير صالح أو انتهت صلاحيته.";
  }

  if (
    normalized.includes(
      "coupon usage limit reached",
    )
  ) {
    return "وصل الكوبون إلى الحد الأقصى للاستخدام.";
  }

  if (
    normalized.includes(
      "coupon user limit reached",
    )
  ) {
    return "استخدمتِ هذا الكوبون بالفعل بالعدد المسموح.";
  }

  if (
    normalized.includes(
      "cart does not meet coupon minimum",
    )
  ) {
    return "السلة لا تحقق الحد الأدنى المطلوب للكوبون.";
  }

  if (
    normalized.includes(
      "coupon discount exceeds safe profit",
    )
  ) {
    return "لا يمكن تطبيق الكوبون لأن الخصم يتجاوز الحد الآمن.";
  }

  if (normalized.includes("platform_maintenance") || normalized.includes("orders_paused")) {
    return "إنشاء الطلبات متوقف مؤقتًا. يمكنك متابعة طلباتك السابقة من صفحة طلباتي.";
  }

  if (
    normalized.includes(
      "authentication required",
    )
  ) {
    return "يجب تسجيل الدخول أولًا.";
  }

  if (
    normalized.includes(
      "invalid cart subtotal",
    )
  ) {
    return "تعذر حساب قيمة السلة من الباقات الحالية.";
  }

  return message;
}

export async function createCheckoutOrder(
  payload:
    CreateCheckoutPayload,
): Promise<CheckoutActionResult> {
  try {
    const supabase =
      await createClient();

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return {
        success: false,

        message:
          "يجب تسجيل الدخول أولًا.",
      };
    }

    await assertOperationEnabled(supabase,"orders");

    if (
      !payload.items ||
      payload.items.length ===
        0
    ) {
      return {
        success: false,

        message:
          "السلة فارغة.",
      };
    }

    if (
      payload.items.length >
      50
    ) {
      return {
        success: false,

        message:
          "عدد عناصر السلة أكبر من الحد المسموح.",
      };
    }

    /*
     * =========================================
     * 1. فحص Payload
     * =========================================
     */

    for (
      const item
      of payload.items
    ) {
      if (
        !item.productId ||
        !item.productId.trim()
      ) {
        return {
          success: false,

          message:
            "يوجد منتج غير صالح داخل السلة.",
        };
      }

      if (
        !item.offerId ||
        !item.offerId.trim()
      ) {
        return {
          success: false,

          message:
            "يوجد عنصر بدون باقة محددة داخل السلة.",
        };
      }

      const quantity =
        Math.floor(
          Number(
            item.quantity,
          ),
        );

      if (
        !Number.isFinite(
          quantity,
        ) ||
        quantity <
          1
      ) {
        return {
          success: false,

          message:
            "يوجد عنصر بكمية غير صحيحة.",
        };
      }

      if (
        !item.inputValues ||
        typeof item.inputValues !==
          "object" ||
        Array.isArray(
          item.inputValues,
        )
      ) {
        return {
          success: false,

          message:
            "بيانات تنفيذ إحدى الباقات غير صحيحة.",
        };
      }
    }

    /*
     * =========================================
     * 2. تحميل المنتجات والباقات
     * =========================================
     */

    const productIds =
      [
        ...new Set(
          payload.items.map(
            (
              item,
            ) =>
              item.productId,
          ),
        ),
      ];

    const offerIds =
      [
        ...new Set(
          payload.items.map(
            (
              item,
            ) =>
              item.offerId,
          ),
        ),
      ];

    const [
      productsResult,
      offersResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "store_products",
          )
          .select(`
            id,
            name_ar,
            active,
            status,
            minimum_quantity,
            maximum_quantity
          `)
          .in(
            "id",
            productIds,
          )
          .returns<
            StoreProductReference[]
          >(),

        supabase
          .from(
            "store_product_offers",
          )
          .select(`
            id,
            product_id,
            provider_offer_id,
            name_ar,
            supplier_price_usd,
            profit_usd,
            stock,
            available,
            active
          `)
          .in(
            "id",
            offerIds,
          )
          .returns<
            StoreOfferReference[]
          >(),
      ]);

    if (
      productsResult.error
    ) {
      console.error(
        "CHECKOUT PRODUCTS ERROR:",
        productsResult.error,
      );

      return {
        success: false,

        message:
          "تعذر التحقق من المنتجات.",
      };
    }

    if (
      offersResult.error
    ) {
      console.error(
        "CHECKOUT OFFERS ERROR:",
        offersResult.error,
      );

      return {
        success: false,

        message:
          "تعذر التحقق من الباقات.",
      };
    }

    const productMap =
      new Map(
        (
          productsResult.data ??
          []
        ).map(
          (product) => [
            product.id,
            product,
          ],
        ),
      );

    const offerMap =
      new Map(
        (
          offersResult.data ??
          []
        ).map(
          (offer) => [
            offer.id,
            offer,
          ],
        ),
      );

    /*
     * =========================================
     * 3. التحقق من كل باقة
     * =========================================
     */

    const rpcItems =
      payload.items.map(
        (cartItem) => {
          const product =
            productMap.get(
              cartItem.productId,
            );

          if (!product) {
            throw new Error(
              "Product is unavailable",
            );
          }

          if (
            !product.active ||
            product.status ===
              "unavailable"
          ) {
            throw new Error(
              `Product is unavailable: ${product.name_ar}`,
            );
          }

          const offer =
            offerMap.get(
              cartItem.offerId,
            );

          if (!offer) {
            throw new Error(
              "Offer is unavailable",
            );
          }

          /*
           * حماية مهمة:
           * العميل مينفعش يبعت Offer
           * تابعة لمنتج مختلف.
           */
          if (
            offer.product_id !==
            product.id
          ) {
            throw new Error(
              "Offer does not belong to product",
            );
          }

          if (
            !offer.active ||
            !offer.available
          ) {
            throw new Error(
              `Offer is unavailable: ${offer.name_ar}`,
            );
          }

          const quantity =
            Math.floor(
              Number(
                cartItem.quantity,
              ),
            );

          if (
            !Number.isFinite(
              quantity,
            ) ||
            quantity <
              1
          ) {
            throw new Error(
              "Invalid quantity",
            );
          }

          if (
            quantity <
              product.minimum_quantity ||
            quantity >
              product.maximum_quantity
          ) {
            throw new Error(
              "Invalid quantity",
            );
          }

          /*
           * لو المورد رجع مخزون محدد
           * نتأكد إن الكمية لا تتعداه.
           */
          if (
            offer.stock !==
              null &&
            quantity >
              offer.stock
          ) {
            throw new Error(
              `Offer is unavailable: ${offer.name_ar}`,
            );
          }

          const effectivePrice = getEffectiveOfferPriceUsd(offer);

          if (!isOfferPriceSafe(offer) || effectivePrice <= 0) {
            throw new Error(`Unsafe selling price for ${offer.name_ar}`);
          }

          /*
           * لا نرسل السعر للـRPC كمصدر ثقة.
           *
           * الـSQL نفسه سيقرأ السعر مرة أخرى
           * من store_product_offers.
           */
          return {
            product_id:
              product.id,

            offer_id:
              offer.id,

            quantity,

            input_values:
              cartItem.inputValues ??
              {},
          };
        },
      );

    /*
     * =========================================
     * 4. إنشاء الطلب داخل Transaction واحدة
     * =========================================
     */

    const {
      data,
      error:
        orderError,
    } =
      await supabase.rpc(
        "create_product_order",
        {
          p_items:
            rpcItems,

          p_coupon_code:
            payload.couponCode
              ?.trim() ||
            null,

          p_customer_note:
            payload.customerNote
              ?.trim() ||
            null,
        },
      );

    if (
      orderError
    ) {
      console.error(
        "CREATE PRODUCT ORDER RPC ERROR:",
        orderError,
      );

      return {
        success: false,

        message:
          translateCheckoutError(
            orderError.message,
          ),
      };
    }

    const rawOrder =
      Array.isArray(
        data,
      )
        ? data[0]
        : data;

    if (!rawOrder) {
      return {
        success: false,

        message:
          "تم تنفيذ العملية لكن تعذر قراءة بيانات الطلب.",
      };
    }

    const order =
      rawOrder as CreatedOrderRow;

    after(async () => {
      try {
        await dispatchCreatedOrder(
          order.id,
        );
      } catch (error) {
        console.error(
          "Automatic Flexy dispatch failed",
          error,
        );
      }
    });

    /*
     * =========================================
     * 5. تحديث الصفحات
     * =========================================
     */

    revalidatePath(
      "/wallet",
    );

    revalidatePath(
      "/wallet/transactions",
    );

    revalidatePath(
      "/orders",
    );

    revalidatePath(
      `/orders/${order.id}`,
    );

    revalidatePath(
      "/notifications",
    );

    revalidatePath(
      "/account",
    );

    revalidatePath(
      "/admin",
    );

    revalidatePath(
      "/admin/orders",
    );

    return {
      success: true,

      message:
        "تم إنشاء الطلب وخصم الرصيد بنجاح.",

      order: {
        id:
          order.id,

        orderId:
          order.order_id,

        subtotalUsd:
          Number(
            order.subtotal_usd,
          ),

        discountUsd:
          Number(
            order.discount_usd,
          ),

        totalUsd:
          Number(
            order.total_usd,
          ),

        totalEgp:
          Number(
            order
              .total_egp_snapshot,
          ),

        status:
          order.status,
      },
    };
  } catch (error) {
    console.error(
      "CREATE CHECKOUT ORDER ERROR:",
      error,
    );

    const rawMessage =
      error instanceof Error
        ? error.message
        : "حدث خطأ أثناء إنشاء الطلب.";

    return {
      success: false,

      message:
        translateCheckoutError(
          rawMessage,
        ),
    };
  }
}