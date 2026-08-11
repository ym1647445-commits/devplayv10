"use client";

import {
  Check,
  Clock3,
  Copy,
  Gift,
  Search,
  ShoppingBag,
  Sparkles,
  TicketPercent,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

import type {
  CustomerCoupon,
  CustomerCouponState,
} from "@/types/customerCoupon";

import styles from "./CustomerCoupons.module.css";

interface CustomerCouponsProps {
  coupons: CustomerCoupon[];
}

type CouponFilter =
  | "available"
  | "used"
  | "expired"
  | "all";

function formatDiscount(
  coupon: CustomerCoupon,
): string {
  if (coupon.type === "percentage") {
    return `${coupon.value}%`;
  }

  if (coupon.currency === "USD") {
    return `$${coupon.value.toFixed(2)}`;
  }

  return `${coupon.value.toLocaleString(
    "ar-EG",
  )} ج.م`;
}

function formatMoney(
  value: number,
  currency: "USD" | "EGP",
): string {
  if (currency === "USD") {
    return `$${value.toFixed(2)}`;
  }

  return `${value.toLocaleString(
    "ar-EG",
    {
      maximumFractionDigits: 2,
    },
  )} ج.م`;
}

function formatDate(
  date: string,
): string {
  return new Intl.DateTimeFormat(
    "ar-EG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(date));
}

function getStateLabel(
  state: CustomerCouponState,
): string {
  const labels: Record<
    CustomerCouponState,
    string
  > = {
    available: "متاح",
    used: "تم استخدامه",
    expired: "منتهي",
    upcoming: "قريبًا",
    unavailable: "غير متاح",
  };

  return labels[state];
}

function getScopeLabel(
  scope: CustomerCoupon["applicationScope"],
): string {
  const labels = {
    cart: "على السلة كاملة",
    categories: "على أقسام محددة",
    products: "على منتجات محددة",
  };

  return labels[scope];
}

export function CustomerCoupons({
  coupons,
}: CustomerCouponsProps) {
  const [filter, setFilter] =
    useState<CouponFilter>("available");

  const [searchText, setSearchText] =
    useState("");

  const [copiedId, setCopiedId] =
    useState<string | null>(null);

  const availableCount =
    coupons.filter(
      (coupon) =>
        coupon.state === "available",
    ).length;

  const usedCount =
    coupons.filter(
      (coupon) =>
        coupon.state === "used",
    ).length;

  const expiredCount =
    coupons.filter(
      (coupon) =>
        coupon.state === "expired",
    ).length;

  const filteredCoupons =
    useMemo(() => {
      const normalizedSearch =
        searchText
          .trim()
          .toLowerCase();

      return coupons.filter(
        (coupon) => {
          const matchesFilter =
            filter === "all" ||
            coupon.state === filter;

          if (!matchesFilter) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          return [
            coupon.code,
            coupon.title,
            coupon.description,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);
        },
      );
    }, [
      coupons,
      filter,
      searchText,
    ]);

  async function handleCopy(
    coupon: CustomerCoupon,
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        coupon.code,
      );

      setCopiedId(coupon.id);

      window.setTimeout(() => {
        setCopiedId(null);
      }, 1800);
    } catch {
      window.alert(
        `كود الكوبون: ${coupon.code}`,
      );
    }
  }

  const filters: {
    value: CouponFilter;
    title: string;
    count: number;
  }[] = [
    {
      value: "available",
      title: "المتاحة",
      count: availableCount,
    },
    {
      value: "used",
      title: "المستخدمة",
      count: usedCount,
    },
    {
      value: "expired",
      title: "المنتهية",
      count: expiredCount,
    },
    {
      value: "all",
      title: "الكل",
      count: coupons.length,
    },
  ];

  return (
    <section className={styles.wrapper}>
      <div className={styles.filters}>
        {filters.map((item) => (
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

            <strong>
              {item.count.toLocaleString(
                "ar-EG",
              )}
            </strong>
          </button>
        ))}
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
          placeholder="ابحثي باسم أو كود الكوبون"
        />
      </label>

      {filteredCoupons.length === 0 ? (
        <section className={styles.empty}>
          <span>
            <TicketPercent size={32} />
          </span>

          <h2>
            مفيش كوبونات هنا حاليًا
          </h2>

          <p>
            الكوبونات الجديدة والمخصصة
            لحسابك هتظهر في الصفحة دي.
          </p>
        </section>
      ) : (
        <div className={styles.grid}>
          {filteredCoupons.map(
            (coupon) => {
              const copied =
                copiedId === coupon.id;

              const usable =
                coupon.state ===
                "available";

              return (
                <article
                  className={`${styles.card} ${
                    styles[coupon.state]
                  }`}
                  key={coupon.id}
                >
                  <header>
                    <span
                      className={
                        styles.discountIcon
                      }
                    >
                      <TicketPercent
                        size={22}
                      />
                    </span>

                    <div>
                      <span
                        className={
                          styles.state
                        }
                      >
                        {getStateLabel(
                          coupon.state,
                        )}
                      </span>

                      <strong>
                        {formatDiscount(
                          coupon,
                        )}{" "}
                        خصم
                      </strong>
                    </div>
                  </header>

                  <div
                    className={
                      styles.couponCopy
                    }
                  >
                    <h2>
                      {coupon.title}
                    </h2>

                    {coupon.description && (
                      <p>
                        {
                          coupon.description
                        }
                      </p>
                    )}
                  </div>

                  <button
                    className={
                      styles.codeButton
                    }
                    type="button"
                    disabled={!usable}
                    onClick={() => {
                      void handleCopy(
                        coupon,
                      );
                    }}
                  >
                    <span>
                      {coupon.code}
                    </span>

                    {copied ? (
                      <>
                        <Check size={16} />
                        تم النسخ
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        نسخ
                      </>
                    )}
                  </button>

                  <div
                    className={
                      styles.conditions
                    }
                  >
                    <div>
                      <ShoppingBag
                        size={15}
                      />

                      <span>
                        <small>
                          الحد الأدنى
                        </small>

                        <strong>
                          {coupon.minimumCartAmount >
                          0
                            ? formatMoney(
                                coupon.minimumCartAmount,
                                coupon.currency,
                              )
                            : "بدون حد أدنى"}
                        </strong>
                      </span>
                    </div>

                    <div>
                      <Sparkles size={15} />

                      <span>
                        <small>
                          النطاق
                        </small>

                        <strong>
                          {getScopeLabel(
                            coupon.applicationScope,
                          )}
                        </strong>
                      </span>
                    </div>

                    {coupon.maximumDiscount !==
                      null && (
                      <div>
                        <Gift size={15} />

                        <span>
                          <small>
                            أقصى خصم
                          </small>

                          <strong>
                            {formatMoney(
                              coupon.maximumDiscount,
                              coupon.currency,
                            )}
                          </strong>
                        </span>
                      </div>
                    )}

                    <div>
                      <Clock3 size={15} />

                      <span>
                        <small>
                          الصلاحية
                        </small>

                        <strong>
                          {coupon.expiresAt
                            ? formatDate(
                                coupon.expiresAt,
                              )
                            : "بدون تاريخ انتهاء"}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <footer>
                    <span>
                      الاستخدام الشخصي:{" "}
                      {coupon.userUsageCount} /{" "}
                      {coupon.perUserLimit}
                    </span>

                    {coupon.firstOrderOnly && (
                      <strong>
                        لأول طلب فقط
                      </strong>
                    )}

                    {coupon.autoApply && (
                      <strong>
                        يُطبق تلقائيًا
                      </strong>
                    )}
                  </footer>
                </article>
              );
            },
          )}
        </div>
      )}
    </section>
  );
}