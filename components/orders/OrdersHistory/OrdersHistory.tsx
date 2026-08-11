"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Copy,
  Clock3,
  PackageSearch,
  Search,
  WalletCards,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import type {
  CustomerOrderHistoryItem,
  CustomerOrderStatus,
  CustomerOrderType,
} from "@/types/orderHistory";

import styles from "./OrdersHistory.module.css";

interface OrdersHistoryProps {
  orders: CustomerOrderHistoryItem[];
}

type OrderFilter =
  | "all"
  | CustomerOrderType;

function getStatusLabel(
  status: CustomerOrderStatus,
): string {
  const labels: Record<
    CustomerOrderStatus,
    string
  > = {
    pending: "بانتظار المراجعة",
    waiting_payment: "بانتظار الدفع",
    under_review: "قيد المراجعة",
    processing: "قيد التنفيذ",
    completed: "مكتمل",
    approved: "تمت الموافقة",
    rejected: "مرفوض",
    cancelled: "ملغي",
    refunded: "تم الاسترداد",
    failed: "فشل التنفيذ",
    needs_information: "مطلوب بيانات إضافية",
    frozen: "مجمّد للمراجعة",
    supplier_pending:
  "بانتظار تنفيذ المورد",

manual_review:
  "قيد المراجعة اليدوية",
  };
  
  return labels[status];
}

function getStatusIcon(
  status: CustomerOrderStatus,
) {
  if (
    status === "approved" ||
    status === "completed"
  ) {
    return CheckCircle2;
  }

  if (
    status === "rejected" ||
    status === "failed" ||
    status === "cancelled"
  ) {
    return XCircle;
  }

  if (
    status === "needs_information" ||
    status === "frozen"
  ) {
    return AlertTriangle;
  }

  return Clock3;
}

function formatRequestedAmount(
  order: CustomerOrderHistoryItem,
): string {
  if (order.requestedCurrency === "USD") {
    return `${order.requestedAmount.toFixed(
      2,
    )} USDT`;
  }

  return `${order.requestedAmount.toLocaleString(
    "ar-EG",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  )} ج.م`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(
    "ar-EG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

export function OrdersHistory({
  orders,
}: OrdersHistoryProps) {
  const [filter, setFilter] =
    useState<OrderFilter>("all");

  const [searchText, setSearchText] =
    useState("");

  const [expandedOrderId, setExpandedOrderId] =
    useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    const normalizedSearch =
      searchText.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesType =
        filter === "all" ||
        order.type === filter;

      if (!matchesType) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        order.orderNumber,
        order.title,
        order.description,
        order.paymentMethod,
        order.paymentNetwork,
        getStatusLabel(order.status),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        normalizedSearch,
      );
    });
  }, [filter, orders, searchText]);

  const filters: {
    value: OrderFilter;
    title: string;
  }[] = [
    {
      value: "all",
      title: "الكل",
    },
    {
      value: "product",
      title: "المنتجات",
    },
    {
      value: "deposit",
      title: "إضافة الرصيد",
    },
  ];

  return (
    <section className={styles.wrapper}>
      <div className={styles.filters}>
        {filters.map((item) => {
          const count =
            item.value === "all"
              ? orders.length
              : orders.filter(
                  (order) =>
                    order.type === item.value,
                ).length;

          return (
            <button
              type="button"
              key={item.value}
              className={
                filter === item.value
                  ? styles.activeFilter
                  : ""
              }
              onClick={() =>
                setFilter(item.value)
              }
            >
              <span>{item.title}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </div>

      <label className={styles.search}>
        <Search size={17} />

        <input
          type="search"
          value={searchText}
          onChange={(event) =>
            setSearchText(
              event.target.value,
            )
          }
          placeholder="ابحثي برقم الطلب أو الحالة"
        />
      </label>

      {filteredOrders.length === 0 ? (
        <section className={styles.empty}>
          <span>
            <PackageSearch size={30} />
          </span>

          <h2>
            {filter === "product"
              ? "لسه مفيش طلبات منتجات"
              : "مفيش طلبات مطابقة"}
          </h2>

          <p>
            {filter === "product"
              ? "طلبات شراء المنتجات هتظهر هنا بعد توصيل نظام الشراء والـ API."
              : "جربي تغيير البحث أو اختيار قسم مختلف."}
          </p>

          <Link href="/">
            تصفح المنتجات
            <ChevronLeft size={17} />
          </Link>
        </section>
      ) : (
        <div className={styles.list}>
          {filteredOrders.map((order) => {
            const StatusIcon =
              getStatusIcon(order.status);

            const expanded =
              expandedOrderId === order.id;

            return (
              <article
                className={styles.card}
                key={`${order.type}-${order.id}`}
              >
                <button
                  className={styles.cardMain}
                  type="button"
                  onClick={() =>
                    setExpandedOrderId(
                      expanded
                        ? null
                        : order.id,
                    )
                  }
                  aria-expanded={expanded}
                >
                  <span
                    className={`${styles.typeIcon} ${
                      order.type === "deposit"
                        ? styles.depositIcon
                        : styles.productIcon
                    }`}
                  >
                    {order.type ===
                    "deposit" ? (
                      <WalletCards
                        size={20}
                      />
                    ) : (
                      <PackageSearch
                        size={20}
                      />
                    )}
                  </span>

                  <span className={styles.copy}>
                    <span
                      className={
                        styles.orderTop
                      }
                    >
                      <strong>
                        {order.orderNumber}
                      </strong>

                      <span
                        className={`${styles.status} ${
                          styles[
                            order.status
                          ] ?? ""
                        }`}
                      >
                        <StatusIcon
                          size={12}
                        />

                        {getStatusLabel(
                          order.status,
                        )}
                      </span>
                    </span>

                    <strong
                      className={
                        styles.title
                      }
                    >
                      {order.title}
                    </strong>

                    <small>
                      {formatDate(
                        order.createdAt,
                      )}
                    </small>
                  </span>

                  <span className={styles.amount}>
                    <strong>
                      {formatRequestedAmount(
                        order,
                      )}
                    </strong>

                    <small>
                      ≈ $
                      {order.amountUsd.toFixed(
                        4,
                      )}
                    </small>

                    <ChevronLeft
                      className={
                        expanded
                          ? styles.arrowOpen
                          : ""
                      }
                      size={17}
                    />
                  </span>
                </button>

                {expanded && (
                  <section
                    className={
                      styles.details
                    }
                  >
                    <div
                      className={
                        styles.summaryGrid
                      }
                    >
                      <article>
                        <span>
                          نوع الطلب
                        </span>

                        <strong>
                          {order.type ===
                          "deposit"
                            ? "إضافة رصيد"
                            : "شراء منتج"}
                        </strong>
                      </article>

                      <article>
                        <span>
                          القيمة بالدولار
                        </span>

                        <strong>
                          $
                          {order.amountUsd.toFixed(
                            4,
                          )}
                        </strong>
                      </article>

                      <article>
                        <span>
                          وسيلة الدفع
                        </span>

                        <strong>
                          {order.paymentMethod ||
                            "المحفظة"}
                        </strong>
                      </article>

                      <article>
                        <span>
                          آخر تحديث
                        </span>

                        <strong>
                          {formatDate(
                            order.updatedAt,
                          )}
                        </strong>
                      </article>
                    </div>

                    {order.paymentNetwork && (
                      <div
                        className={
                          styles.detailRow
                        }
                      >
                        <span>
                          الشبكة
                        </span>

                        <strong>
                          {
                            order.paymentNetwork
                          }
                        </strong>
                      </div>
                    )}

                    {order.description && (
                      <div
                        className={
                          styles.description
                        }
                      >
                        <strong>
                          تفاصيل الطلب
                        </strong>

                        <p>
                          {
                            order.description
                          }
                        </p>
                      </div>
                    )}

                    {order.deliveredCodes&&order.deliveredCodes.length>0&&(
                      <div className={styles.deliveredCodes}><strong>أكواد التفعيل</strong><p>احتفظي بالكود في مكان آمن ولا تشاركيه مع أي شخص.</p>{order.deliveredCodes.map((code,index)=><div key={`${code}-${index}`}><code dir="ltr">{code}</code><button type="button" onClick={()=>void navigator.clipboard.writeText(code)} aria-label="نسخ الكود"><Copy size={14}/> نسخ</button></div>)}</div>
                    )}

                    {order.rejectionReason && (
                      <div
                        className={
                          styles.rejection
                        }
                      >
                        <AlertTriangle
                          size={17}
                        />

                        <div>
                          <strong>
                            سبب الرفض
                          </strong>

                          <p>
                            {
                              order.rejectionReason
                            }
                          </p>
                        </div>
                      </div>
                    )}

                    {order.adminNote && (
                      <div
                        className={
                          styles.description
                        }
                      >
                        <strong>
                          ملاحظة الإدارة
                        </strong>

                        <p>
                          {order.adminNote}
                        </p>
                      </div>
                    )}

                    <Link
                      className={
                        styles.supportLink
                      }
                      href="https://wa.me/201035966569"
                      target="_blank"
                    >
                      تواصلي مع خدمة العملاء
                    </Link>
                  </section>
                )}
              </article>
            );
          })}
        </div>
      )}

      <section className={styles.info}>
        <CircleDollarSign size={19} />

        <p>
          طلب إضافة الرصيد المعتمد يظهر في
          المحفظة وسجل العمليات تلقائيًا.
        </p>
      </section>
    </section>
  );
}
