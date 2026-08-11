"use client";

import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clipboard,
  ClipboardCheck,
  Clock3,
  Coins,
  Copy,
  LoaderCircle,
  Mail,
  PackageCheck,
  PackageOpen,
  PackageSearch,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  TicketPercent,
  UserRound,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import {
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  updateAdminOrderStatus,
  updateOrderAdminNote,
} from "@/app/admin/orders/actions";
import type {
  AdminOrder,
  AdminOrderStats,
  AdminOrderStatus,
} from "@/types/adminOrder";

import styles from "./OrdersManager.module.css";

interface OrdersManagerProps {
  orders: AdminOrder[];
  stats: AdminOrderStats;
}

type OrderFilter =
  | "all"
  | AdminOrderStatus;

const orderStatuses: {
  value: AdminOrderStatus;
  label: string;
}[] = [
  {
    value: "pending",
    label: "بانتظار المراجعة",
  },
  {
    value: "processing",
    label: "قيد التنفيذ",
  },
  {
    value: "supplier_pending",
    label: "بانتظار المورد",
  },
  {
    value: "manual_review",
    label: "مراجعة يدوية",
  },
  {
    value: "completed",
    label: "مكتمل",
  },
  {
    value: "failed",
    label: "فشل",
  },
  {
    value: "cancelled",
    label: "ملغي",
  },
  {
    value: "refunded",
    label: "مسترد",
  },
];

function getStatusLabel(
  status: AdminOrderStatus,
): string {
  return (
    orderStatuses.find(
      (item) =>
        item.value === status,
    )?.label ?? status
  );
}

function formatUsd(
  value: number,
): string {
  return `$${Number(value).toFixed(2)}`;
}

function formatEgp(
  value: number,
): string {
  return `${Number(value).toLocaleString(
    "ar-EG",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )} ج.م`;
}

function formatDateTime(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "ar-EG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

function getOrderAge(
  value: string,
): string {
  const difference =
    Date.now() -
    new Date(value).getTime();

  const minutes =
    Math.floor(
      difference / 60_000,
    );

  if (minutes < 60) {
    return `منذ ${Math.max(
      1,
      minutes,
    )} دقيقة`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `منذ ${hours} ساعة`;
  }

  const days =
    Math.floor(hours / 24);

  return `منذ ${days} يوم`;
}

function getOrderProfit(
  order: AdminOrder,
): number {
  const profit =
    order.items.reduce(
      (total, item) =>
        total +
        item.profitUsd *
          item.quantity,
      0,
    );

  return Math.max(
    0,
    profit -
      order.discountUsd,
  );
}

export function OrdersManager({
  orders,
  stats,
}: OrdersManagerProps) {
  const router = useRouter();

  const [
    pending,
    startTransition,
  ] = useTransition();

  const [filter, setFilter] =
    useState<OrderFilter>("all");

  const [searchText, setSearchText] =
    useState("");

  const [
    selectedOrder,
    setSelectedOrder,
  ] = useState<AdminOrder | null>(
    null,
  );

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<AdminOrderStatus>(
    "pending",
  );

  const [statusNote, setStatusNote] =
    useState("");

  const [adminNote, setAdminNote] =
    useState("");

  const [message, setMessage] =
    useState<string | null>(null);

  const [copiedText, setCopiedText] =
    useState<string | null>(null);

  const filteredOrders =
    useMemo(() => {
      const normalized =
        searchText
          .trim()
          .toLowerCase();

      return orders.filter(
        (order) => {
          if (
            filter !== "all" &&
            order.status !== filter
          ) {
            return false;
          }

          if (!normalized) {
            return true;
          }

          const customer =
            order.customer;

          const products =
            order.items
              .map(
                (item) =>
                  item.productName,
              )
              .join(" ");

          const inputValues =
            order.items
              .flatMap((item) =>
                Object.values(
                  item.inputValues,
                ),
              )
              .join(" ");

          return [
            order.orderId,
            order.supplierOrderId,
            order.couponCode,
            customer?.customerId,
            customer?.fullName,
            customer?.email,
            customer?.phone,
            products,
            inputValues,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(normalized);
        },
      );
    }, [
      orders,
      filter,
      searchText,
    ]);

  function openOrder(
    order: AdminOrder,
  ): void {
    setSelectedOrder(order);
    setSelectedStatus(order.status);
    setStatusNote("");
    setAdminNote(
      order.adminNote ?? "",
    );
    setMessage(null);
  }

  function closeOrder(): void {
    if (pending) {
      return;
    }

    setSelectedOrder(null);
    setMessage(null);
    setCopiedText(null);
  }

  async function copyValue(
    value: string,
    label: string,
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        value,
      );

      setCopiedText(label);

      window.setTimeout(() => {
        setCopiedText(null);
      }, 1600);
    } catch {
      window.alert(value);
    }
  }

  function handleStatusUpdate(): void {
    if (
      !selectedOrder ||
      pending
    ) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result =
        await updateAdminOrderStatus({
          orderId:
            selectedOrder.id,

          status:
            selectedStatus,

          note:
            statusNote.trim() ||
            null,
        });

      setMessage(result.message);

      if (result.success) {
        setSelectedOrder((current) =>
          current
            ? {
                ...current,
                status:
                  selectedStatus,

                adminNote:
                  statusNote.trim() ||
                  current.adminNote,
              }
            : current,
        );

        router.refresh();
      }
    });
  }

  function handleSaveAdminNote(): void {
    if (
      !selectedOrder ||
      pending
    ) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result =
        await updateOrderAdminNote(
          selectedOrder.id,
          adminNote,
        );

      setMessage(result.message);

      if (result.success) {
        setSelectedOrder((current) =>
          current
            ? {
                ...current,
                adminNote:
                  adminNote.trim() ||
                  null,
              }
            : current,
        );

        router.refresh();
      }
    });
  }

  const statCards = [
    {
      title: "إجمالي الطلبات",
      value: stats.total,
      icon: ShoppingBag,
    },
    {
      title: "بانتظار التنفيذ",
      value:
        stats.pending +
        stats.processing +
        stats.supplierPending,
      icon: Clock3,
    },
    {
      title: "مكتملة",
      value: stats.completed,
      icon: CheckCircle2,
    },
    {
      title: "مراجعة يدوية",
      value: stats.manualReview,
      icon: AlertTriangle,
    },
    {
      title: "الإيرادات",
      value: formatUsd(
        stats.totalRevenueUsd,
      ),
      icon: CircleDollarSign,
    },
    {
      title: "الربح المتوقع",
      value: formatUsd(
        stats.totalProfitUsd,
      ),
      icon: Coins,
    },
  ];

  return (
    <section className={styles.wrapper}>
      <section className={styles.stats}>
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.title}>
              <span>
                <Icon size={19} />
              </span>

              <div>
                <small>
                  {card.title}
                </small>

                <strong>
                  {typeof card.value ===
                  "number"
                    ? card.value.toLocaleString(
                        "ar-EG",
                      )
                    : card.value}
                </strong>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.toolbar}>
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
            placeholder="بحث برقم الطلب أو العميل أو المنتج أو Player ID"
          />
        </label>

        <div className={styles.filters}>
          <button
            type="button"
            className={
              filter === "all"
                ? styles.activeFilter
                : ""
            }
            onClick={() =>
              setFilter("all")
            }
          >
            الكل
          </button>

          {orderStatuses.map(
            (status) => (
              <button
                type="button"
                key={status.value}
                className={
                  filter ===
                  status.value
                    ? styles.activeFilter
                    : ""
                }
                onClick={() =>
                  setFilter(
                    status.value,
                  )
                }
              >
                {status.label}
              </button>
            ),
          )}
        </div>
      </section>

      {filteredOrders.length === 0 ? (
        <section className={styles.empty}>
          <PackageSearch size={34} />

          <h2>
            لا توجد طلبات
          </h2>

          <p>
            الطلبات المطابقة للبحث أو
            الفلتر ستظهر هنا.
          </p>
        </section>
      ) : (
        <div className={styles.list}>
          {filteredOrders.map(
            (order) => {
              const firstItem =
                order.items[0];

              const profit =
                getOrderProfit(order);

              return (
                <article
                  className={styles.card}
                  key={order.id}
                  onClick={() =>
                    openOrder(order)
                  }
                >
                  <span
                    className={
                      styles.productImage
                    }
                  >
                    {firstItem
                      ?.productImageUrl ? (
                      <img
                        src={
                          firstItem.productImageUrl
                        }
                        alt={
                          firstItem.productName
                        }
                      />
                    ) : (
                      <PackageOpen
                        size={23}
                      />
                    )}
                  </span>

                  <div
                    className={
                      styles.orderCopy
                    }
                  >
                    <div>
                      <strong>
                        {order.orderId}
                      </strong>

                      <span
                        className={`${styles.status} ${
                          styles[
                            order.status
                          ]
                        }`}
                      >
                        {getStatusLabel(
                          order.status,
                        )}
                      </span>
                    </div>

                    <h3>
                      {firstItem
                        ?.productName ??
                        "طلب منتجات"}
                    </h3>

                    <p>
                      {order.customer
                        ?.fullName ||
                        "عميل DevPlay"}
                      {" · "}
                      {order.customer
                        ?.customerId ||
                        "بدون رقم"}
                    </p>
                  </div>

                  <div
                    className={
                      styles.orderMeta
                    }
                  >
                    <span>
                      <ShoppingBag
                        size={14}
                      />

                      {order.items.reduce(
                        (total, item) =>
                          total +
                          item.quantity,
                        0,
                      )}{" "}
                      منتج
                    </span>

                    <span>
                      <Clock3 size={14} />
                      {getOrderAge(
                        order.createdAt,
                      )}
                    </span>

                    {order.couponCode && (
                      <span>
                        <TicketPercent
                          size={14}
                        />
                        {order.couponCode}
                      </span>
                    )}
                  </div>

                  <div
                    className={
                      styles.orderMoney
                    }
                  >
                    <strong>
                      {formatUsd(
                        order.totalUsd,
                      )}
                    </strong>

                    <small>
                      {formatEgp(
                        order.totalEgpSnapshot,
                      )}
                    </small>

                    <span>
                      ربح{" "}
                      {formatUsd(
                        profit,
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    aria-label="فتح الطلب"
                    onClick={(event) => {
                      event.stopPropagation();
                      openOrder(order);
                    }}
                  >
                    <ClipboardListIcon />
                  </button>
                </article>
              );
            },
          )}
        </div>
      )}

      {selectedOrder && (
        <div className={styles.overlay}>
          <button
            className={styles.backdrop}
            type="button"
            aria-label="إغلاق"
            onClick={closeOrder}
          />

          <aside className={styles.drawer}>
            <header>
              <div>
                <span>
                  ORDER DETAILS
                </span>

                <h2>
                  {selectedOrder.orderId}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeOrder}
                disabled={pending}
                aria-label="إغلاق"
              >
                <X size={19} />
              </button>
            </header>

            <div className={styles.drawerBody}>
              <section className={styles.summaryCard}>
                <div>
                  <span>
                    الحالة الحالية
                  </span>

                  <strong
                    className={`${styles.status} ${
                      styles[
                        selectedOrder.status
                      ]
                    }`}
                  >
                    {getStatusLabel(
                      selectedOrder.status,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    إجمالي الطلب
                  </span>

                  <strong>
                    {formatUsd(
                      selectedOrder.totalUsd,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    الربح
                  </span>

                  <strong>
                    {formatUsd(
                      getOrderProfit(
                        selectedOrder,
                      ),
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    تاريخ الإنشاء
                  </span>

                  <strong>
                    {formatDateTime(
                      selectedOrder.createdAt,
                    )}
                  </strong>
                </div>
              </section>

              <section className={styles.panel}>
                <header>
                  <UserRound size={17} />
                  <strong>
                    بيانات العميل
                  </strong>
                </header>

                {selectedOrder.customer ? (
                  <div className={styles.customerGrid}>
                    <div>
                      <span>الاسم</span>
                      <strong>
                        {selectedOrder.customer
                          .fullName ||
                          "غير مضاف"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        رقم العميل
                      </span>
                      <strong>
                        {
                          selectedOrder.customer
                            .customerId
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        المستوى
                      </span>
                      <strong>
                        {
                          selectedOrder.customer
                            .level
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        النقاط
                      </span>
                      <strong>
                        {selectedOrder.customer.points.toLocaleString(
                          "ar-EG",
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        تقييم الثقة
                      </span>
                      <strong>
                        {
                          selectedOrder.customer
                            .trustScore
                        }
                        %
                      </strong>
                    </div>

                    <div>
                      <span>
                        نقاط مستحقة
                      </span>
                      <strong>
                        {selectedOrder.customer.pointsDebt.toLocaleString(
                          "ar-EG",
                        )}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <p>
                    بيانات العميل غير متاحة.
                  </p>
                )}

                <div className={styles.contactActions}>
                  {selectedOrder.customer
                    ?.phone && (
                    <a
                      href={`https://wa.me/${selectedOrder.customer.phone.replace(
                        /\D/g,
                        "",
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Phone size={15} />
                      واتساب
                    </a>
                  )}

                  {selectedOrder.customer
                    ?.email && (
                    <a
                      href={`mailto:${selectedOrder.customer.email}`}
                    >
                      <Mail size={15} />
                      البريد
                    </a>
                  )}
                </div>
              </section>

              <section className={styles.panel}>
                <header>
                  <PackageCheck size={17} />
                  <strong>
                    منتجات الطلب
                  </strong>
                </header>

                <div className={styles.itemsList}>
                  {selectedOrder.items.map(
                    (item) => (
                      <article key={item.id}>
                        <div
                          className={
                            styles.itemTop
                          }
                        >
                          <span>
                            {item.productImageUrl ? (
                              <img
                                src={
                                  item.productImageUrl
                                }
                                alt={
                                  item.productName
                                }
                              />
                            ) : (
                              <PackageOpen
                                size={20}
                              />
                            )}
                          </span>

                          <div>
                            <strong>
                              {
                                item.productName
                              }
                            </strong>

                            {item.offerName && (
                              <small>
                                الباقة: {item.offerName}
                              </small>
                            )}

                            {item.providerOfferId && (
                              <small>
                                Flexy Offer: {item.providerOfferId}
                              </small>
                            )}

                            <small>
                              الكمية:{" "}
                              {item.quantity}
                              {" · "}
                              {formatUsd(
                                item.totalPriceUsd,
                              )}
                            </small>
                          </div>
                        </div>

                        <div
                          className={
                            styles.inputValues
                          }
                        >
                          {Object.entries(
                            item.inputValues,
                          ).length === 0 ? (
                            <p>
                              لا توجد بيانات
                              تنفيذ إضافية.
                            </p>
                          ) : (
                            Object.entries(
                              item.inputValues,
                            ).map(
                              ([
                                key,
                                value,
                              ]) => (
                                <div key={key}>
                                  <span>
                                    {key}
                                  </span>

                                  <strong>
                                    {value}
                                  </strong>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      void copyValue(
                                        value,
                                        key,
                                      );
                                    }}
                                  >
                                    {copiedText ===
                                    key ? (
                                      <Check
                                        size={14}
                                      />
                                    ) : (
                                      <Copy
                                        size={14}
                                      />
                                    )}
                                  </button>
                                </div>
                              ),
                            )
                          )}
                        </div>
                      </article>
                    ),
                  )}
                </div>
              </section>

              <section className={styles.panel}>
                <header>
                  <WalletCards size={17} />
                  <strong>
                    تفاصيل الدفع
                  </strong>
                </header>

                <div className={styles.moneyRows}>
                  <div>
                    <span>
                      المجموع الفرعي
                    </span>

                    <strong>
                      {formatUsd(
                        selectedOrder.subtotalUsd,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      الخصم
                    </span>

                    <strong>
                      -{" "}
                      {formatUsd(
                        selectedOrder.discountUsd,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      الإجمالي
                    </span>

                    <strong>
                      {formatUsd(
                        selectedOrder.totalUsd,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      سعر الدولار
                    </span>

                    <strong>
                      {selectedOrder.usdToEgpRate.toFixed(
                        2,
                      )}{" "}
                      ج.م
                    </strong>
                  </div>

                  {selectedOrder.couponCode && (
                    <div>
                      <span>
                        الكوبون
                      </span>

                      <strong>
                        {
                          selectedOrder.couponCode
                        }
                      </strong>
                    </div>
                  )}
                </div>
              </section>

              <section className={styles.panel}>
                <header>
                  <ShieldCheck size={17} />
                  <strong>
                    تغيير الحالة
                  </strong>
                </header>

                <label>
                  <span>
                    الحالة الجديدة
                  </span>

                  <select
                    value={selectedStatus}
                    onChange={(event) =>
                      setSelectedStatus(
                        event.target
                          .value as AdminOrderStatus,
                      )
                    }
                  >
                    {orderStatuses.map(
                      (status) => (
                        <option
                          key={
                            status.value
                          }
                          value={
                            status.value
                          }
                        >
                          {status.label}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  <span>
                    ملاحظة تغيير الحالة
                  </span>

                  <textarea
                    value={statusNote}
                    onChange={(event) =>
                      setStatusNote(
                        event.target.value,
                      )
                    }
                    placeholder="سبب التغيير أو رسالة داخلية"
                  />
                </label>

                <button
                  className={
                    styles.updateButton
                  }
                  type="button"
                  disabled={
                    pending ||
                    selectedStatus ===
                      selectedOrder.status
                  }
                  onClick={
                    handleStatusUpdate
                  }
                >
                  {pending ? (
                    <LoaderCircle
                      className={
                        styles.spinner
                      }
                      size={17}
                    />
                  ) : (
                    <RotateCcw size={17} />
                  )}

                  تحديث الحالة
                </button>
              </section>

              <section className={styles.panel}>
                <header>
                  <ClipboardCheck
                    size={17}
                  />
                  <strong>
                    ملاحظة الإدارة
                  </strong>
                </header>

                <textarea
                  value={adminNote}
                  onChange={(event) =>
                    setAdminNote(
                      event.target.value,
                    )
                  }
                  placeholder="ملاحظة لا تظهر للعميل"
                />

                <button
                  className={
                    styles.saveNoteButton
                  }
                  type="button"
                  disabled={pending}
                  onClick={
                    handleSaveAdminNote
                  }
                >
                  <Clipboard size={16} />
                  حفظ الملاحظة
                </button>
              </section>

              <section className={styles.panel}>
                <header>
                  <CalendarClock
                    size={17}
                  />
                  <strong>
                    سجل الحالات
                  </strong>
                </header>

                {selectedOrder
                  .statusHistory.length ===
                0 ? (
                  <p>
                    لا يوجد سجل حالات حتى
                    الآن.
                  </p>
                ) : (
                  <div className={styles.timeline}>
                    {selectedOrder.statusHistory.map(
                      (history) => (
                        <article
                          key={
                            history.id
                          }
                        >
                          <span />

                          <div>
                            <strong>
                              {getStatusLabel(
                                history.newStatus,
                              )}
                            </strong>

                            <small>
                              {history.oldStatus
                                ? `${getStatusLabel(
                                    history.oldStatus,
                                  )} ← `
                                : ""}
                              {formatDateTime(
                                history.createdAt,
                              )}
                            </small>

                            {history.note && (
                              <p>
                                {
                                  history.note
                                }
                              </p>
                            )}
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                )}
              </section>

              {message && (
                <p
                  className={
                    styles.message
                  }
                  role="status"
                >
                  {message}
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function ClipboardListIcon() {
  return (
    <PackageSearch size={17} />
  );
}
