import {
  PackageSearch,
  WalletCards,
} from "lucide-react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { OrdersHistory } from "@/components/orders/OrdersHistory";
import { createClient } from "@/lib/supabase/server";
import type { CustomerOrderHistoryItem } from "@/types/orderHistory";

interface DepositOrderRow {
  id: string;
  deposit_id: string;

  status:
    | "pending"
    | "under_review"
    | "approved"
    | "rejected"
    | "cancelled"
    | "needs_information"
    | "frozen";

  requested_currency: "EGP" | "USD";
  requested_amount: number | string;
  credit_usd: number | string;

  admin_note: string | null;
  rejection_reason: string | null;

  created_at: string;
  updated_at: string;

  payment_methods:
    | {
        name: string;
        network: string | null;
      }
    | {
        name: string;
        network: string | null;
      }[]
    | null;
}

interface ProductOrderItemRow {
  id: string;
  product_name: string;
  offer_name: string | null;
  provider_offer_id: string | null;
  quantity: number;
  unit_price_usd: number | string;
  total_price_usd: number | string;
  input_values: Record<string, string> | null;
  supplier_response: unknown;
}

interface ProductOrderRow {
  id: string;
  order_id: string;

  status:
    | "pending"
    | "processing"
    | "supplier_pending"
    | "completed"
    | "failed"
    | "cancelled"
    | "refunded"
    | "manual_review";

  subtotal_usd: number | string;
  discount_usd: number | string;
  total_usd: number | string;

  usd_to_egp_rate: number | string;
  total_egp_snapshot: number | string;

  coupon_code: string | null;
  customer_note: string | null;
  admin_note: string | null;
  failure_reason: string | null;

  created_at: string;
  updated_at: string;

  product_order_items:
    | ProductOrderItemRow[]
    | null;
}

function getRelation<T>(
  relation: T | T[] | null,
): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function getProductOrderTitle(
  items: ProductOrderItemRow[],
): string {
  if (items.length === 0) {
    return "طلب منتجات";
  }

  if (items.length === 1) {
    const item = items[0];

    return `${item.product_name}${item.offer_name ? ` — ${item.offer_name}` : ""} × ${item.quantity}`;
  }

  return `${items[0].product_name} و${
    items.length - 1
  } منتج إضافي`;
}

function getProductOrderDescription(
  order: ProductOrderRow,
  items: ProductOrderItemRow[],
): string {
  const itemSummary = items
    .map(
      (item) =>
        `${item.product_name}${item.offer_name ? ` — ${item.offer_name}` : ""} × ${item.quantity}`,
    )
    .join("، ");

  const statusMessages: Record<
    ProductOrderRow["status"],
    string
  > = {
    pending:
      "تم إنشاء الطلب وخصم الرصيد، وهو بانتظار بدء التنفيذ.",

    processing:
      "يتم تنفيذ الطلب حاليًا.",

    supplier_pending:
      "تم إرسال الطلب إلى المورد وهو بانتظار التنفيذ.",

    completed:
      "تم تنفيذ الطلب بنجاح.",

    failed:
      order.failure_reason
        ? `تعذر تنفيذ الطلب: ${order.failure_reason}`
        : "تعذر تنفيذ الطلب.",

    cancelled:
      "تم إلغاء الطلب.",

    refunded:
      "تم إلغاء الطلب وإعادة الرصيد إلى المحفظة.",

    manual_review:
      "الطلب متوقف للمراجعة اليدوية من الإدارة.",
  };

  const parts = [
    statusMessages[order.status],
    itemSummary
      ? `المنتجات: ${itemSummary}.`
      : null,
    order.coupon_code
      ? `الكوبون المستخدم: ${order.coupon_code}.`
      : null,
    order.customer_note
      ? `ملاحظتك: ${order.customer_note}`
      : null,
  ].filter(Boolean);

  return parts.join(" ");
}

export default async function OrdersPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth");
  }

  const [
    depositsResult,
    productOrdersResult,
  ] = await Promise.all([
    supabase
      .from("deposit_requests")
      .select(`
        id,
        deposit_id,
        status,
        requested_currency,
        requested_amount,
        credit_usd,
        admin_note,
        rejection_reason,
        created_at,
        updated_at,
        payment_methods(
          name,
          network
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .returns<DepositOrderRow[]>(),

    supabase
      .from("product_orders")
      .select(`
        id,
        order_id,
        status,
        subtotal_usd,
        discount_usd,
        total_usd,
        usd_to_egp_rate,
        total_egp_snapshot,
        coupon_code,
        customer_note,
        admin_note,
        failure_reason,
        created_at,
        updated_at,
        product_order_items(
          id,
          product_name,
          offer_name,
          provider_offer_id,
          quantity,
          unit_price_usd,
          total_price_usd,
          input_values,
          supplier_response
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .returns<ProductOrderRow[]>(),
  ]);

  if (depositsResult.error) {
    console.error(
      "Failed to load deposit orders:",
      depositsResult.error,
    );
  }

  if (productOrdersResult.error) {
    console.error(
      "Failed to load product orders:",
      productOrdersResult.error,
    );
  }

  const depositOrders: CustomerOrderHistoryItem[] =
    (depositsResult.data ?? []).map(
      (
        deposit,
      ): CustomerOrderHistoryItem => {
        const method = getRelation(
          deposit.payment_methods,
        );

        let description: string | null =
          null;

        if (
          deposit.status === "approved"
        ) {
          description =
            "تمت الموافقة على التحويل وإضافة الرصيد إلى محفظتك.";
        } else if (
          deposit.status ===
          "under_review"
        ) {
          description =
            "تتم مراجعة إثبات التحويل حاليًا.";
        } else if (
          deposit.status === "pending"
        ) {
          description =
            "تم استلام الطلب وهو بانتظار مراجعة الإدارة.";
        } else if (
          deposit.status === "rejected"
        ) {
          description =
            "تم رفض طلب إضافة الرصيد.";
        }

        return {
          id: deposit.id,

          orderNumber:
            deposit.deposit_id,

          type: "deposit",

          status: deposit.status,

          title: "طلب إضافة رصيد",

          description,

          requestedCurrency:
            deposit.requested_currency,

          requestedAmount: Number(
            deposit.requested_amount,
          ),

          amountUsd: Number(
            deposit.credit_usd,
          ),

          paymentMethod:
            method?.name ?? null,

          paymentNetwork:
            method?.network ?? null,

          rejectionReason:
            deposit.rejection_reason,

          adminNote:
            deposit.admin_note,

          createdAt:
            deposit.created_at,

          updatedAt:
            deposit.updated_at,
        };
      },
    );

  const productOrders: CustomerOrderHistoryItem[] =
    (productOrdersResult.data ?? []).map(
      (
        order,
      ): CustomerOrderHistoryItem => {
        const items =
          order.product_order_items ?? [];

        const totalUsd = Number(
          order.total_usd,
        );

        const exchangeRate = Number(
          order.usd_to_egp_rate,
        );

        return {
          id: order.id,

          orderNumber: order.order_id,

          type: "product",

          status: order.status,

          title:
            getProductOrderTitle(items),

          description:
            getProductOrderDescription(
              order,
              items,
            ),

          requestedCurrency: "USD",

          requestedAmount: totalUsd,

          amountUsd: totalUsd,

          paymentMethod:
            "محفظة DevPlay",

          paymentNetwork: null,

          rejectionReason:
            order.failure_reason,

          adminNote:
            order.admin_note,

          deliveredCodes: Array.from(new Set(items.flatMap(item=>extractDeliveredCodes(item.supplier_response)))),

          createdAt:
            order.created_at,

          updatedAt:
            order.updated_at,
        };
      },
    );

  const orders = [
    ...productOrders,
    ...depositOrders,
  ].sort(
    (first, second) =>
      new Date(
        second.createdAt,
      ).getTime() -
      new Date(
        first.createdAt,
      ).getTime(),
  );

  const productCount =
    productOrders.length;

  const depositCount =
    depositOrders.length;

  return (
    <AppShell>
      <section className="orders-page">
        <header className="orders-heading">
          <div>
            <span>
              متابعة العمليات
            </span>

            <h1>طلباتي</h1>

            <p>
              تابعي طلبات المنتجات وطلبات
              إضافة الرصيد من مكان واحد.
            </p>
          </div>

          <span className="orders-total">
            <PackageSearch size={16} />

            {orders.length.toLocaleString(
              "ar-EG",
            )}{" "}
            طلب
          </span>
        </header>

        <section className="orders-overview">
          <article>
            <PackageSearch size={18} />

            <span>
              <strong>
                {productCount.toLocaleString(
                  "ar-EG",
                )}
              </strong>

              <small>
                طلبات المنتجات
              </small>
            </span>
          </article>

          <article>
            <WalletCards size={18} />

            <span>
              <strong>
                {depositCount.toLocaleString(
                  "ar-EG",
                )}
              </strong>

              <small>
                طلبات إضافة الرصيد
              </small>
            </span>
          </article>
        </section>

        <OrdersHistory
          orders={orders}
        />
      </section>
    </AppShell>
  );
}

function extractDeliveredCodes(value: unknown, result = new Set<string>()): string[] {
  if (Array.isArray(value)) { value.forEach(item=>extractDeliveredCodes(item,result)); return [...result]; }
  if (!value || typeof value !== "object") return [...result];
  const row=value as Record<string,unknown>;
  for(const key of ["delivered_code","deliveredCode"]){if(typeof row[key]==="string"&&row[key])result.add(row[key] as string)}
  for(const key of ["delivered_codes","deliveredCodes"]){const codes=row[key];if(Array.isArray(codes))codes.forEach(code=>{if(typeof code==="string"&&code)result.add(code)})}
  Object.values(row).forEach(item=>extractDeliveredCodes(item,result));
  return [...result];
}
