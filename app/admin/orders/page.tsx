import {
  ClipboardList,
  PackagePlus,
} from "lucide-react";
import Link from "next/link";

import {
  OrdersManager,
} from "@/components/admin/orders/OrdersManager";
import { SupplierJobsRunner } from "@/components/admin/orders/SupplierJobsRunner";
import { createClient } from "@/lib/supabase/server";
import type {
  AdminOrder,
  AdminOrderItem,
  AdminOrderStats,
  AdminOrderStatusHistory,
} from "@/types/adminOrder";

interface RawCustomer {
  id: string;
  customer_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;

  customer_level: string;
  points: number;
  points_debt: number;

  trust_score: number;
  status: string;
}

interface RawOrderItem {
  id: string;

  product_id: string | null;
  product_name: string;
  offer_id: string | null;
  offer_name: string | null;
  provider_offer_id: string | null;
  product_image_url: string | null;

  supplier_product_id: string | null;

  quantity: number;

  supplier_price_usd:
    | number
    | string;

  profit_usd:
    | number
    | string;

  unit_price_usd:
    | number
    | string;

  total_price_usd:
    | number
    | string;

  input_values:
    | Record<string, string>
    | null;

  supplier_response:
    | Record<string, unknown>
    | null;

  status: AdminOrderItem["status"];

  created_at: string;
  updated_at: string;
}

interface RawStatusHistory {
  id: string;

  old_status:
    | AdminOrderStatusHistory["oldStatus"];

  new_status:
    AdminOrderStatusHistory["newStatus"];

  note: string | null;
  changed_by: string | null;

  created_at: string;
}

interface RawOrder {
  id: string;
  order_id: string;

  user_id: string;
  status: AdminOrder["status"];

  subtotal_usd:
    | number
    | string;

  discount_usd:
    | number
    | string;

  total_usd:
    | number
    | string;

  usd_to_egp_rate:
    | number
    | string;

  total_egp_snapshot:
    | number
    | string;

  coupon_id: string | null;
  coupon_code: string | null;

  supplier_order_id: string | null;
  supplier_status: string | null;

  failure_reason: string | null;

  customer_note: string | null;
  admin_note: string | null;

  completed_at: string | null;
  created_at: string;
  updated_at: string;

  customer:
    | RawCustomer
    | RawCustomer[]
    | null;

  items:
    | RawOrderItem[]
    | null;

  status_history:
    | RawStatusHistory[]
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

export default async function AdminOrdersPage() {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("product_orders")
    .select(`
      id,
      order_id,
      user_id,
      status,

      subtotal_usd,
      discount_usd,
      total_usd,
      usd_to_egp_rate,
      total_egp_snapshot,

      coupon_id,
      coupon_code,

      supplier_order_id,
      supplier_status,

      failure_reason,
      customer_note,
      admin_note,

      completed_at,
      created_at,
      updated_at,

      customer:profiles(
        id,
        customer_id,
        full_name,
        email,
        phone,
        customer_level,
        points,
        points_debt,
        trust_score,
        status
      ),

      items:product_order_items(
        id,
        product_id,
        product_name,
        offer_id,
        offer_name,
        provider_offer_id,
        product_image_url,
        supplier_product_id,
        quantity,
        supplier_price_usd,
        profit_usd,
        unit_price_usd,
        total_price_usd,
        input_values,
        supplier_response,
        status,
        created_at,
        updated_at
      ),

      status_history:product_order_status_history(
        id,
        old_status,
        new_status,
        note,
        changed_by,
        created_at
      )
    `)
    .order("created_at", {
      ascending: false,
    })
    .returns<RawOrder[]>();

  if (error) {
    console.error(
      "Failed to load admin orders:",
      error,
    );
  }

  const orders: AdminOrder[] =
    (data ?? []).map((order) => {
      const customer =
        getRelation(order.customer);

      return {
        id: order.id,
        orderId: order.order_id,

        userId: order.user_id,
        status: order.status,

        subtotalUsd: Number(
          order.subtotal_usd,
        ),

        discountUsd: Number(
          order.discount_usd,
        ),

        totalUsd: Number(
          order.total_usd,
        ),

        usdToEgpRate: Number(
          order.usd_to_egp_rate,
        ),

        totalEgpSnapshot: Number(
          order.total_egp_snapshot,
        ),

        couponId:
          order.coupon_id,

        couponCode:
          order.coupon_code,

        supplierOrderId:
          order.supplier_order_id,

        supplierStatus:
          order.supplier_status,

        failureReason:
          order.failure_reason,

        customerNote:
          order.customer_note,

        adminNote:
          order.admin_note,

        completedAt:
          order.completed_at,

        createdAt:
          order.created_at,

        updatedAt:
          order.updated_at,

        customer: customer
          ? {
              id: customer.id,

              customerId:
                customer.customer_id,

              fullName:
                customer.full_name,

              email:
                customer.email,

              phone:
                customer.phone,

              level:
                customer.customer_level,

              points: Number(
                customer.points,
              ),

              pointsDebt: Number(
                customer.points_debt,
              ),

              trustScore: Number(
                customer.trust_score,
              ),

              status:
                customer.status,
            }
          : null,

        items:
          (order.items ?? []).map(
            (item) => ({
              id: item.id,

              productId:
                item.product_id,

              productName:
                item.product_name,

              offerId:
                item.offer_id,

              offerName:
                item.offer_name,

              providerOfferId:
                item.provider_offer_id,

              productImageUrl:
                item.product_image_url,

              supplierProductId:
                item.supplier_product_id,

              quantity: Number(
                item.quantity,
              ),

              supplierPriceUsd:
                Number(
                  item.supplier_price_usd,
                ),

              profitUsd:
                Number(
                  item.profit_usd,
                ),

              unitPriceUsd:
                Number(
                  item.unit_price_usd,
                ),

              totalPriceUsd:
                Number(
                  item.total_price_usd,
                ),

              inputValues:
                item.input_values ?? {},

              supplierResponse:
                item.supplier_response ??
                {},

              status:
                item.status,

              createdAt:
                item.created_at,

              updatedAt:
                item.updated_at,
            }),
          ),

        statusHistory:
          (
            order.status_history ??
            []
          )
            .map((history) => ({
              id: history.id,

              oldStatus:
                history.old_status,

              newStatus:
                history.new_status,

              note:
                history.note,

              changedBy:
                history.changed_by,

              createdAt:
                history.created_at,
            }))
            .sort(
              (first, second) =>
                new Date(
                  second.createdAt,
                ).getTime() -
                new Date(
                  first.createdAt,
                ).getTime(),
            ),
      };
    });

  const stats: AdminOrderStats = {
    total: orders.length,

    pending:
      orders.filter(
        (order) =>
          order.status === "pending",
      ).length,

    processing:
      orders.filter(
        (order) =>
          order.status ===
          "processing",
      ).length,

    supplierPending:
      orders.filter(
        (order) =>
          order.status ===
          "supplier_pending",
      ).length,

    completed:
      orders.filter(
        (order) =>
          order.status ===
          "completed",
      ).length,

    failed:
      orders.filter(
        (order) =>
          order.status === "failed",
      ).length,

    cancelled:
      orders.filter(
        (order) =>
          order.status ===
          "cancelled",
      ).length,

    refunded:
      orders.filter(
        (order) =>
          order.status ===
          "refunded",
      ).length,

    manualReview:
      orders.filter(
        (order) =>
          order.status ===
          "manual_review",
      ).length,

    totalRevenueUsd:
      orders
        .filter(
          (order) =>
            order.status ===
            "completed",
        )
        .reduce(
          (total, order) =>
            total +
            order.totalUsd,
          0,
        ),

    totalProfitUsd:
      orders
        .filter(
          (order) =>
            order.status ===
            "completed",
        )
        .reduce(
          (total, order) =>
            total +
            order.items.reduce(
              (
                itemTotal,
                item,
              ) =>
                itemTotal +
                item.profitUsd *
                  item.quantity,
              0,
            ) -
            order.discountUsd,
          0,
        ),
  };

  return (
    <section className="admin-orders-page">
      <header className="admin-orders-heading">
        <div>
          <span>
            ORDER CONTROL CENTER
          </span>

          <h1>
            إدارة الطلبات
          </h1>

          <p>
            متابعة طلبات المنتجات، بيانات
            التنفيذ والمورد وحالة الطلب.
          </p>
        </div>

        <span>
          <ClipboardList size={17} />

          {orders.length.toLocaleString(
            "ar-EG",
          )}{" "}
          طلب
        </span>
      </header>

      <Link href="/admin/orders/manual" className="admin-manual-order-link">
        <PackagePlus size={18} />
        إنشاء طلب يدوي لعميل
      </Link>

      <SupplierJobsRunner />

      <OrdersManager
        orders={orders}
        stats={stats}
      />
    </section>
  );
}
