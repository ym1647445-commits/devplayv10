"use client";

import {
  BellRing,
  CalendarClock,
  Check,
  ChevronLeft,
  CircleDollarSign,
  Copy,
  LoaderCircle,
  PackageSearch,
  Pause,
  Percent,
  Plus,
  Search,
  ShoppingBag,
  TicketPercent,
  Trash2,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import {
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  createCoupon,
  deleteCoupon,
  toggleCouponStatus,
} from "@/app/admin/coupons/actions";
import type {
  AdminCoupon,
  CouponApplicationScope,
  CouponAudienceType,
  CouponCurrency,
  CouponDiscountType,
  CouponNotificationMode,
  CouponVisibility,
  CreateCouponInput,
} from "@/types/adminCoupon";

import styles from "./CouponsManager.module.css";

export interface CouponCustomerOption {
  id: string;
  customerId: string;
  fullName: string | null;
  email: string | null;
  level: string;
}

export interface CouponProductOption {
  id: string;
  name: string;
  categoryName: string | null;
}

export interface CouponCategoryOption {
  id: string;
  name: string;
}

interface CouponsManagerProps {
  coupons: AdminCoupon[];
  customers: CouponCustomerOption[];
  products: CouponProductOption[];
  categories: CouponCategoryOption[];
}

type CouponFilter =
  | "all"
  | "active"
  | "inactive"
  | "expired";

interface CouponFormState {
  code: string;
  title: string;
  description: string;

  type: CouponDiscountType;
  value: string;
  currency: CouponCurrency;

  minimumCartAmount: string;
  maximumDiscount: string;

  usageLimit: string;
  perUserLimit: string;

  minimumItemsCount: string;
  firstOrderOnly: boolean;
  autoApply: boolean;
  stackable: boolean;

  audienceType: CouponAudienceType;
  applicationScope: CouponApplicationScope;
  visibility: CouponVisibility;
  notificationMode: CouponNotificationMode;

  selectedLevels: string[];
  notifyOnPublish: boolean;

  startsAt: string;
  expiresAt: string;

  active: boolean;
  internalNote: string;

  selectedUserIds: string[];
  selectedProductIds: string[];
  selectedCategoryIds: string[];
}

function getLocalDateTimeValue(
  date = new Date(),
): string {
  const offset =
    date.getTimezoneOffset() * 60_000;

  return new Date(
    date.getTime() - offset,
  )
    .toISOString()
    .slice(0, 16);
}

function createInitialForm(): CouponFormState {
  const startsAt = new Date();

  const expiresAt = new Date();

  expiresAt.setDate(
    expiresAt.getDate() + 7,
  );

  return {
    code: "",
    title: "",
    description: "",

    type: "percentage",
    value: "10",
    currency: "USD",

    minimumCartAmount: "0",
    maximumDiscount: "",

    usageLimit: "",
    perUserLimit: "1",

    minimumItemsCount: "0",
    firstOrderOnly: false,
    autoApply: false,
    stackable: false,

    audienceType: "all_users",
    applicationScope: "cart",
    visibility: "public",
    notificationMode: "in_app",

    selectedLevels: [],
    notifyOnPublish: true,

    startsAt:
      getLocalDateTimeValue(startsAt),

    expiresAt:
      getLocalDateTimeValue(expiresAt),

    active: true,
    internalNote: "",

    selectedUserIds: [],
    selectedProductIds: [],
    selectedCategoryIds: [],
  };
}

function formatDiscount(
  coupon: AdminCoupon,
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

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "بدون انتهاء";
  }

  return new Intl.DateTimeFormat(
    "ar-EG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

function isExpired(
  coupon: AdminCoupon,
): boolean {
  if (!coupon.expires_at) {
    return false;
  }

  return (
    new Date(
      coupon.expires_at,
    ).getTime() <= Date.now()
  );
}

function getAudienceLabel(
  value: CouponAudienceType,
): string {
  const labels: Record<
    CouponAudienceType,
    string
  > = {
    all_users: "كل العملاء",
    specific_users: "عملاء محددون",
    new_users: "العملاء الجدد",
    selected_levels: "مستويات محددة",
  };

  return labels[value];
}

function getScopeLabel(
  value: CouponApplicationScope,
): string {
  const labels: Record<
    CouponApplicationScope,
    string
  > = {
    cart: "السلة كاملة",
    categories: "أقسام محددة",
    products: "منتجات محددة",
  };

  return labels[value];
}

function toOptionalNumber(
  value: string,
): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

export function CouponsManager({
  coupons,
  customers,
  products,
  categories,
}: CouponsManagerProps) {
  const router = useRouter();

  const [
    pending,
    startTransition,
  ] = useTransition();

  const [drawerOpen, setDrawerOpen] =
    useState(false);

  const [filter, setFilter] =
    useState<CouponFilter>("all");

  const [searchText, setSearchText] =
    useState("");

  const [message, setMessage] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<CouponFormState>(
      createInitialForm,
    );

  const filteredCoupons =
    useMemo(() => {
      const normalized =
        searchText
          .trim()
          .toLowerCase();

      return coupons.filter(
        (coupon) => {
          const expired =
            isExpired(coupon);

          const matchesFilter =
            filter === "all" ||
            (filter === "active" &&
              coupon.active &&
              !expired) ||
            (filter === "inactive" &&
              !coupon.active) ||
            (filter === "expired" &&
              expired);

          if (!matchesFilter) {
            return false;
          }

          if (!normalized) {
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
            .includes(normalized);
        },
      );
    }, [
      coupons,
      filter,
      searchText,
    ]);

  const activeCount =
    coupons.filter(
      (coupon) =>
        coupon.active &&
        !isExpired(coupon),
    ).length;

  const expiredCount =
    coupons.filter(isExpired).length;

  const totalUsage =
    coupons.reduce(
      (total, coupon) =>
        total + coupon.usage_count,
      0,
    );

  function updateForm<
    Key extends keyof CouponFormState,
  >(
    key: Key,
    value: CouponFormState[Key],
  ): void {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function toggleArrayValue(
    key:
      | "selectedUserIds"
      | "selectedProductIds"
      | "selectedCategoryIds"
      | "selectedLevels",
    value: string,
  ): void {
    setForm((current) => {
      const values = current[key];

      return {
        ...current,
        [key]: values.includes(value)
          ? values.filter(
              (item) => item !== value,
            )
          : [...values, value],
      };
    });
  }

  function resetAndClose(): void {
    setDrawerOpen(false);
    setMessage(null);
    setForm(createInitialForm());
  }

  function handleCreate(): void {
    setMessage(null);

    const input: CreateCouponInput = {
      code: form.code,
      title: form.title,

      description:
        form.description.trim() ||
        null,

      type: form.type,
      value: Number(form.value),
      currency: form.currency,

      minimumCartAmount:
        Number(
          form.minimumCartAmount,
        ) || 0,

      maximumDiscount:
        toOptionalNumber(
          form.maximumDiscount,
        ),

      usageLimit:
        toOptionalNumber(
          form.usageLimit,
        ),

      perUserLimit:
        Number(
          form.perUserLimit,
        ) || 1,

      minimumItemsCount:
        Number(
          form.minimumItemsCount,
        ) || 0,

      firstOrderOnly:
        form.firstOrderOnly,

      autoApply:
        form.autoApply,

      stackable:
        form.stackable,

      audienceType:
        form.audienceType,

      applicationScope:
        form.applicationScope,

      visibility:
        form.visibility,

      notificationMode:
        form.notificationMode,

      selectedLevels:
        form.selectedLevels,

      notifyOnPublish:
        form.notifyOnPublish,

      startsAt:
        form.startsAt,

      expiresAt:
        form.expiresAt || null,

      active: form.active,

      internalNote:
        form.internalNote.trim() ||
        null,

      selectedUserIds:
        form.selectedUserIds,

      selectedProductIds:
        form.selectedProductIds,

      selectedCategoryIds:
        form.selectedCategoryIds,
    };

    startTransition(async () => {
      const result =
        await createCoupon(input);

      setMessage(result.message);

      if (result.success) {
        setForm(createInitialForm());

        router.refresh();

        window.setTimeout(() => {
          setDrawerOpen(false);
          setMessage(null);
        }, 900);
      }
    });
  }

  function handleToggle(
    coupon: AdminCoupon,
  ): void {
    startTransition(async () => {
      const result =
        await toggleCouponStatus(
          coupon.id,
          !coupon.active,
        );

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleDelete(
    coupon: AdminCoupon,
  ): void {
    const confirmed =
      window.confirm(
        `حذف الكوبون ${coupon.code}؟\nلو تم استخدامه قبل كده هيتوقف بدل الحذف.`,
      );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result =
        await deleteCoupon(
          coupon.id,
        );

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  async function copyCode(
    code: string,
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        code,
      );

      setMessage(
        `تم نسخ الكود ${code}.`,
      );
    } catch {
      setMessage(
        `الكود: ${code}`,
      );
    }
  }

  const levels = [
    "bronze",
    "silver",
    "gold",
    "diamond",
    "elite",
    "vip",
  ];

  return (
    <section className={styles.wrapper}>
      <section className={styles.stats}>
        <article>
          <TicketPercent size={19} />

          <span>
            <small>إجمالي الكوبونات</small>
            <strong>{coupons.length}</strong>
          </span>
        </article>

        <article>
          <Zap size={19} />

          <span>
            <small>النشطة</small>
            <strong>{activeCount}</strong>
          </span>
        </article>

        <article>
          <CalendarClock size={19} />

          <span>
            <small>المنتهية</small>
            <strong>{expiredCount}</strong>
          </span>
        </article>

        <article>
          <ShoppingBag size={19} />

          <span>
            <small>مرات الاستخدام</small>
            <strong>{totalUsage}</strong>
          </span>
        </article>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.filters}>
          {(
            [
              ["all", "الكل"],
              ["active", "النشطة"],
              ["inactive", "الموقوفة"],
              ["expired", "المنتهية"],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={
                filter === value
                  ? styles.activeFilter
                  : ""
              }
              onClick={() =>
                setFilter(value)
              }
            >
              {label}
            </button>
          ))}
        </div>

        <button
          className={styles.createButton}
          type="button"
          onClick={() => {
            setDrawerOpen(true);
            setMessage(null);
          }}
        >
          <Plus size={17} />
          كوبون جديد
        </button>
      </section>

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
          placeholder="بحث بالكود أو اسم الكوبون"
        />
      </label>

      {message && !drawerOpen && (
        <p className={styles.message}>
          {message}
        </p>
      )}

      {filteredCoupons.length === 0 ? (
        <section className={styles.empty}>
          <TicketPercent size={33} />

          <h2>مفيش كوبونات</h2>

          <p>
            أنشئي أول كوبون من زر
            كوبون جديد.
          </p>
        </section>
      ) : (
        <div className={styles.list}>
          {filteredCoupons.map(
            (coupon) => {
              const expired =
                isExpired(coupon);

              return (
                <article
                  className={styles.card}
                  key={coupon.id}
                >
                  <div
                    className={
                      styles.discount
                    }
                  >
                    {coupon.type ===
                    "percentage" ? (
                      <Percent size={19} />
                    ) : (
                      <CircleDollarSign
                        size={19}
                      />
                    )}

                    <strong>
                      {formatDiscount(
                        coupon,
                      )}
                    </strong>
                  </div>

                  <div className={styles.copy}>
                    <div
                      className={
                        styles.titleRow
                      }
                    >
                      <strong>
                        {coupon.title}
                      </strong>

                      <span
                        className={
                          expired
                            ? styles.expired
                            : coupon.active
                              ? styles.active
                              : styles.inactive
                        }
                      >
                        {expired
                          ? "منتهي"
                          : coupon.active
                            ? "نشط"
                            : "موقوف"}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={
                        styles.code
                      }
                      onClick={() => {
                        void copyCode(
                          coupon.code,
                        );
                      }}
                    >
                      {coupon.code}
                      <Copy size={13} />
                    </button>

                    <div className={styles.meta}>
                      <span>
                        <UsersRound
                          size={13}
                        />
                        {getAudienceLabel(
                          coupon.audience_type,
                        )}
                      </span>

                      <span>
                        <PackageSearch
                          size={13}
                        />
                        {getScopeLabel(
                          coupon.application_scope,
                        )}
                      </span>

                      <span>
                        <CalendarClock
                          size={13}
                        />
                        {formatDate(
                          coupon.expires_at,
                        )}
                      </span>
                    </div>
                  </div>

                  <div className={styles.usage}>
                    <span>الاستخدام</span>

                    <strong>
                      {coupon.usage_count}
                      {" / "}
                      {coupon.usage_limit ??
                        "∞"}
                    </strong>

                    <div>
                      <span
                        style={{
                          width: `${
                            coupon.usage_limit
                              ? Math.min(
                                  100,
                                  (coupon.usage_count /
                                    coupon.usage_limit) *
                                    100,
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <button
                      type="button"
                      disabled={pending || expired}
                      onClick={() =>
                        handleToggle(coupon)
                      }
                    >
                      {coupon.active ? (
                        <>
                          <Pause size={15} />
                          إيقاف
                        </>
                      ) : (
                        <>
                          <Check size={15} />
                          تفعيل
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        handleDelete(coupon)
                      }
                    >
                      <Trash2 size={15} />
                      حذف
                    </button>
                  </div>
                </article>
              );
            },
          )}
        </div>
      )}

      {drawerOpen && (
        <div className={styles.overlay}>
          <button
            className={styles.backdrop}
            type="button"
            aria-label="إغلاق"
            onClick={resetAndClose}
          />

          <aside className={styles.drawer}>
            <header>
              <div>
                <span>NEW COUPON</span>
                <h2>إنشاء كوبون</h2>
              </div>

              <button
                type="button"
                onClick={resetAndClose}
                aria-label="إغلاق"
              >
                <X size={19} />
              </button>
            </header>

            <div className={styles.form}>
              <section className={styles.formSection}>
                <h3>المعلومات الأساسية</h3>

                <div className={styles.twoColumns}>
                  <label>
                    <span>كود الكوبون</span>

                    <input
                      value={form.code}
                      onChange={(event) =>
                        updateForm(
                          "code",
                          event.target.value.toUpperCase(),
                        )
                      }
                      placeholder="SAVE20"
                    />
                  </label>

                  <label>
                    <span>اسم الكوبون</span>

                    <input
                      value={form.title}
                      onChange={(event) =>
                        updateForm(
                          "title",
                          event.target.value,
                        )
                      }
                      placeholder="خصم الصيف"
                    />
                  </label>
                </div>

                <label>
                  <span>الوصف</span>

                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateForm(
                        "description",
                        event.target.value,
                      )
                    }
                    placeholder="وصف يظهر للعميل"
                  />
                </label>
              </section>

              <section className={styles.formSection}>
                <h3>قيمة الخصم</h3>

                <div className={styles.twoColumns}>
                  <label>
                    <span>نوع الخصم</span>

                    <select
                      value={form.type}
                      onChange={(event) =>
                        updateForm(
                          "type",
                          event.target
                            .value as CouponDiscountType,
                        )
                      }
                    >
                      <option value="percentage">
                        نسبة مئوية
                      </option>

                      <option value="fixed">
                        مبلغ ثابت
                      </option>
                    </select>
                  </label>

                  <label>
                    <span>القيمة</span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.value}
                      onChange={(event) =>
                        updateForm(
                          "value",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label>
                    <span>العملة</span>

                    <select
                      value={form.currency}
                      onChange={(event) =>
                        updateForm(
                          "currency",
                          event.target
                            .value as CouponCurrency,
                        )
                      }
                    >
                      <option value="USD">
                        دولار
                      </option>

                      <option value="EGP">
                        جنيه
                      </option>
                    </select>
                  </label>

                  <label>
                    <span>أقصى خصم</span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.maximumDiscount
                      }
                      onChange={(event) =>
                        updateForm(
                          "maximumDiscount",
                          event.target.value,
                        )
                      }
                      placeholder="بدون حد"
                    />
                  </label>
                </div>
              </section>

              <section className={styles.formSection}>
                <h3>شروط السلة</h3>

                <div className={styles.twoColumns}>
                  <label>
                    <span>
                      الحد الأدنى للسلة
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={
                        form.minimumCartAmount
                      }
                      onChange={(event) =>
                        updateForm(
                          "minimumCartAmount",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label>
                    <span>
                      أقل عدد منتجات
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={
                        form.minimumItemsCount
                      }
                      onChange={(event) =>
                        updateForm(
                          "minimumItemsCount",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                </div>

                <div className={styles.switches}>
                  <label>
                    <input
                      type="checkbox"
                      checked={
                        form.firstOrderOnly
                      }
                      onChange={(event) =>
                        updateForm(
                          "firstOrderOnly",
                          event.target.checked,
                        )
                      }
                    />

                    لأول طلب فقط
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={form.autoApply}
                      onChange={(event) =>
                        updateForm(
                          "autoApply",
                          event.target.checked,
                        )
                      }
                    />

                    تطبيق تلقائي
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={form.stackable}
                      onChange={(event) =>
                        updateForm(
                          "stackable",
                          event.target.checked,
                        )
                      }
                    />

                    يقبل الدمج
                  </label>
                </div>
              </section>

              <section className={styles.formSection}>
                <h3>حدود الاستخدام</h3>

                <div className={styles.twoColumns}>
                  <label>
                    <span>
                      إجمالي الاستخدامات
                    </span>

                    <input
                      type="number"
                      min="1"
                      value={form.usageLimit}
                      onChange={(event) =>
                        updateForm(
                          "usageLimit",
                          event.target.value,
                        )
                      }
                      placeholder="بدون حد"
                    />
                  </label>

                  <label>
                    <span>
                      لكل عميل
                    </span>

                    <input
                      type="number"
                      min="1"
                      value={
                        form.perUserLimit
                      }
                      onChange={(event) =>
                        updateForm(
                          "perUserLimit",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                </div>
              </section>

              <section className={styles.formSection}>
                <h3>المستخدمون المستهدفون</h3>

                <label>
                  <span>الجمهور</span>

                  <select
                    value={form.audienceType}
                    onChange={(event) =>
                      updateForm(
                        "audienceType",
                        event.target
                          .value as CouponAudienceType,
                      )
                    }
                  >
                    <option value="all_users">
                      جميع العملاء
                    </option>

                    <option value="new_users">
                      العملاء الجدد
                    </option>

                    <option value="selected_levels">
                      مستويات محددة
                    </option>

                    <option value="specific_users">
                      عملاء محددون
                    </option>
                  </select>
                </label>

                {form.audienceType ===
                  "selected_levels" && (
                  <div className={styles.choices}>
                    {levels.map((level) => (
                      <button
                        type="button"
                        key={level}
                        className={
                          form.selectedLevels.includes(
                            level,
                          )
                            ? styles.selectedChoice
                            : ""
                        }
                        onClick={() =>
                          toggleArrayValue(
                            "selectedLevels",
                            level,
                          )
                        }
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                )}

                {form.audienceType ===
                  "specific_users" && (
                  <div className={styles.selectorList}>
                    {customers.map(
                      (customer) => (
                        <label key={customer.id}>
                          <input
                            type="checkbox"
                            checked={form.selectedUserIds.includes(
                              customer.id,
                            )}
                            onChange={() =>
                              toggleArrayValue(
                                "selectedUserIds",
                                customer.id,
                              )
                            }
                          />

                          <span>
                            <strong>
                              {customer.fullName ||
                                "عميل DevPlay"}
                            </strong>

                            <small>
                              {customer.customerId}
                              {" · "}
                              {customer.level}
                            </small>
                          </span>
                        </label>
                      ),
                    )}
                  </div>
                )}
              </section>

              <section className={styles.formSection}>
                <h3>نطاق الكوبون</h3>

                <label>
                  <span>يعمل على</span>

                  <select
                    value={
                      form.applicationScope
                    }
                    onChange={(event) =>
                      updateForm(
                        "applicationScope",
                        event.target
                          .value as CouponApplicationScope,
                      )
                    }
                  >
                    <option value="cart">
                      السلة كلها
                    </option>

                    <option value="categories">
                      أقسام محددة
                    </option>

                    <option value="products">
                      منتجات محددة
                    </option>
                  </select>
                </label>

                {form.applicationScope ===
                  "categories" && (
                  <div className={styles.selectorList}>
                    {categories.map(
                      (category) => (
                        <label key={category.id}>
                          <input
                            type="checkbox"
                            checked={form.selectedCategoryIds.includes(
                              category.id,
                            )}
                            onChange={() =>
                              toggleArrayValue(
                                "selectedCategoryIds",
                                category.id,
                              )
                            }
                          />

                          <span>
                            <strong>
                              {category.name}
                            </strong>
                          </span>
                        </label>
                      ),
                    )}
                  </div>
                )}

                {form.applicationScope ===
                  "products" && (
                  <div className={styles.selectorList}>
                    {products.map(
                      (product) => (
                        <label key={product.id}>
                          <input
                            type="checkbox"
                            checked={form.selectedProductIds.includes(
                              product.id,
                            )}
                            onChange={() =>
                              toggleArrayValue(
                                "selectedProductIds",
                                product.id,
                              )
                            }
                          />

                          <span>
                            <strong>
                              {product.name}
                            </strong>

                            <small>
                              {product.categoryName ||
                                "بدون قسم"}
                            </small>
                          </span>
                        </label>
                      ),
                    )}
                  </div>
                )}
              </section>

              <section className={styles.formSection}>
                <h3>المدة والنشر</h3>

                <div className={styles.twoColumns}>
                  <label>
                    <span>يبدأ في</span>

                    <input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(event) =>
                        updateForm(
                          "startsAt",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label>
                    <span>ينتهي في</span>

                    <input
                      type="datetime-local"
                      value={form.expiresAt}
                      onChange={(event) =>
                        updateForm(
                          "expiresAt",
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label>
                    <span>الظهور</span>

                    <select
                      value={form.visibility}
                      onChange={(event) =>
                        updateForm(
                          "visibility",
                          event.target
                            .value as CouponVisibility,
                        )
                      }
                    >
                      <option value="public">
                        يظهر في صفحة الكوبونات
                      </option>

                      <option value="private">
                        كوبون سري
                      </option>
                    </select>
                  </label>

                  <label>
                    <span>الإشعار</span>

                    <select
                      value={
                        form.notificationMode
                      }
                      onChange={(event) =>
                        updateForm(
                          "notificationMode",
                          event.target
                            .value as CouponNotificationMode,
                        )
                      }
                    >
                      <option value="none">
                        بدون إشعار
                      </option>

                      <option value="in_app">
                        داخل الموقع
                      </option>

                      <option value="in_app_and_email">
                        الموقع والإيميل
                      </option>
                    </select>
                  </label>
                </div>

                <div className={styles.switches}>
                  <label>
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(event) =>
                        updateForm(
                          "active",
                          event.target.checked,
                        )
                      }
                    />

                    تفعيل فورًا
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={
                        form.notifyOnPublish
                      }
                      onChange={(event) =>
                        updateForm(
                          "notifyOnPublish",
                          event.target.checked,
                        )
                      }
                    />

                    إرسال إشعار عند النشر
                  </label>
                </div>

                <label>
                  <span>
                    ملاحظة داخلية
                  </span>

                  <textarea
                    value={form.internalNote}
                    onChange={(event) =>
                      updateForm(
                        "internalNote",
                        event.target.value,
                      )
                    }
                    placeholder="لا تظهر للعميل"
                  />
                </label>
              </section>

              {message && (
                <p className={styles.drawerMessage}>
                  {message}
                </p>
              )}
            </div>

            <footer>
              <button
                type="button"
                onClick={resetAndClose}
                disabled={pending}
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleCreate}
                disabled={pending}
              >
                {pending ? (
                  <LoaderCircle
                    className={
                      styles.spinner
                    }
                    size={17}
                  />
                ) : (
                  <Plus size={17} />
                )}

                إنشاء الكوبون
              </button>
            </footer>
          </aside>
        </div>
      )}
    </section>
  );
}