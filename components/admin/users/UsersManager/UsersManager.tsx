"use client";

import {
  Ban,
  Cake,
  CheckCircle2,
  CircleDollarSign,
  Coins,
  Copy,
  Gift,
  LockKeyhole,
  Mail,
  MessageCircle,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  Star,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  adjustAdminUserPoints,
  setAdminUserWalletFreeze,
  updateAdminUserNotes,
  updateAdminUserStatus,
} from "@/app/admin/users/actions";
import type {
  AdminUser,
  AdminUserStats,
  AdminUserStatus,
} from "@/types/adminUser";

import styles from "./UsersManager.module.css";

interface UsersManagerProps {
  users: AdminUser[];
  stats: AdminUserStats;
}

type UserFilter =
  | "all"
  | "active"
  | "suspended"
  | "banned"
  | "birthday"
  | "wallet_frozen";

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

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "غير متاح";
  }

  return new Intl.DateTimeFormat(
    "ar-EG",
    {
      dateStyle: "medium",
    },
  ).format(new Date(value));
}

function formatDateTime(
  value: string | null,
): string {
  if (!value) {
    return "غير متاح";
  }

  return new Intl.DateTimeFormat(
    "ar-EG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

function isBirthdayToday(
  birthDate: string | null,
): boolean {
  if (!birthDate) {
    return false;
  }

  const birth =
    new Date(`${birthDate}T00:00:00`);

  const today = new Date();

  return (
    birth.getDate() ===
      today.getDate() &&
    birth.getMonth() ===
      today.getMonth()
  );
}

function getStatusLabel(
  status: AdminUserStatus,
): string {
  const labels: Record<
    AdminUserStatus,
    string
  > = {
    active: "نشط",
    suspended: "موقوف مؤقتًا",
    banned: "محظور",
    pending_verification:
      "بانتظار التحقق",
  };

  return labels[status];
}

function getLevelLabel(
  level: string,
): string {
  const labels: Record<
    string,
    string
  > = {
    bronze: "برونزي",
    silver: "فضي",
    gold: "ذهبي",
    diamond: "ماسي",
    elite: "نخبة",
    vip: "VIP",
  };

  return (
    labels[level.toLowerCase()] ??
    level
  );
}

export function UsersManager({
  users,
  stats,
}: UsersManagerProps) {
  const router = useRouter();

  const [
    pending,
    startTransition,
  ] = useTransition();

  const [filter, setFilter] =
    useState<UserFilter>("all");

  const [searchText, setSearchText] =
    useState("");

  const [
    selectedUser,
    setSelectedUser,
  ] = useState<AdminUser | null>(
    null,
  );

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<AdminUserStatus>(
    "active",
  );

  const [statusReason, setStatusReason] =
    useState("");

  const [
    pointsDirection,
    setPointsDirection,
  ] =
    useState<"credit" | "debit">(
      "credit",
    );

  const [pointsAmount, setPointsAmount] =
    useState("");

  const [pointsReason, setPointsReason] =
    useState("");

  const [
    walletFreezeReason,
    setWalletFreezeReason,
  ] = useState("");

  const [internalNotes, setInternalNotes] =
    useState("");

  const [message, setMessage] =
    useState<string | null>(null);

  const [copied, setCopied] =
    useState<string | null>(null);

  const filteredUsers =
    useMemo(() => {
      const normalized =
        searchText
          .trim()
          .toLowerCase();

      return users.filter((user) => {
        if (
          filter === "active" &&
          user.status !== "active"
        ) {
          return false;
        }

        if (
          filter === "suspended" &&
          user.status !== "suspended"
        ) {
          return false;
        }

        if (
          filter === "banned" &&
          user.status !== "banned"
        ) {
          return false;
        }

        if (
          filter === "birthday" &&
          !isBirthdayToday(
            user.birthDate,
          )
        ) {
          return false;
        }

        if (
          filter ===
            "wallet_frozen" &&
          !user.wallet?.isFrozen
        ) {
          return false;
        }

        if (!normalized) {
          return true;
        }

        return [
          user.customerId,
          user.fullName,
          user.email,
          user.phone,
          user.customerLevel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      });
    }, [
      users,
      filter,
      searchText,
    ]);

  function openUser(
    user: AdminUser,
  ): void {
    setSelectedUser(user);
    setSelectedStatus(user.status);
    setStatusReason(
      user.banReason ?? "",
    );

    setInternalNotes(
      user.internalNotes ?? "",
    );

    setWalletFreezeReason(
      user.wallet?.freezeReason ??
        "",
    );

    setPointsAmount("");
    setPointsReason("");
    setPointsDirection("credit");
    setMessage(null);
  }

  function closeUser(): void {
    if (pending) {
      return;
    }

    setSelectedUser(null);
    setMessage(null);
  }

  async function copyValue(
    value: string,
    label: string,
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        value,
      );

      setCopied(label);

      window.setTimeout(() => {
        setCopied(null);
      }, 1500);
    } catch {
      window.alert(value);
    }
  }

  function handleStatusUpdate(): void {
    if (
      !selectedUser ||
      pending
    ) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result =
        await updateAdminUserStatus({
          userId:
            selectedUser.id,

          status:
            selectedStatus,

          reason:
            selectedStatus ===
            "active"
              ? null
              : statusReason.trim() ||
                null,
        });

      setMessage(result.message);

      if (result.success) {
        setSelectedUser((current) =>
          current
            ? {
                ...current,
                status:
                  selectedStatus,

                banReason:
                  selectedStatus ===
                  "active"
                    ? null
                    : statusReason.trim() ||
                      null,
              }
            : current,
        );

        router.refresh();
      }
    });
  }

  function handlePointsAdjustment(): void {
    if (
      !selectedUser ||
      pending
    ) {
      return;
    }

    const amount =
      Number(pointsAmount);

    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      setMessage(
        "اكتبي عدد نقاط صحيح.",
      );

      return;
    }

    if (!pointsReason.trim()) {
      setMessage(
        "اكتبي سبب تعديل النقاط.",
      );

      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result =
        await adjustAdminUserPoints({
          userId:
            selectedUser.id,

          direction:
            pointsDirection,

          points: amount,

          reason:
            pointsReason.trim(),
        });

      setMessage(result.message);

      if (result.success) {
        setSelectedUser((current) =>
          current
            ? {
                ...current,

                points:
                  pointsDirection ===
                  "credit"
                    ? current.points +
                      amount
                    : Math.max(
                        0,
                        current.points -
                          amount,
                      ),
              }
            : current,
        );

        setPointsAmount("");
        setPointsReason("");

        router.refresh();
      }
    });
  }

  function handleWalletFreeze(): void {
    if (
      !selectedUser ||
      !selectedUser.wallet ||
      pending
    ) {
      return;
    }

    const nextFrozen =
      !selectedUser.wallet
        .isFrozen;

    if (
      nextFrozen &&
      !walletFreezeReason.trim()
    ) {
      setMessage(
        "اكتبي سبب تجميد المحفظة.",
      );

      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result =
        await setAdminUserWalletFreeze({
          userId:
            selectedUser.id,

          frozen:
            nextFrozen,

          reason:
            nextFrozen
              ? walletFreezeReason.trim()
              : null,
        });

      setMessage(result.message);

      if (result.success) {
        setSelectedUser((current) =>
          current &&
          current.wallet
            ? {
                ...current,

                wallet: {
                  ...current.wallet,

                  isFrozen:
                    nextFrozen,

                  freezeReason:
                    nextFrozen
                      ? walletFreezeReason.trim()
                      : null,
                },
              }
            : current,
        );

        router.refresh();
      }
    });
  }

  function handleSaveNotes(): void {
    if (
      !selectedUser ||
      pending
    ) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result =
        await updateAdminUserNotes({
          userId:
            selectedUser.id,

          notes:
            internalNotes,
        });

      setMessage(result.message);

      if (result.success) {
        setSelectedUser((current) =>
          current
            ? {
                ...current,
                internalNotes:
                  internalNotes.trim() ||
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
      title: "إجمالي العملاء",
      value: stats.total,
      icon: UsersRound,
    },
    {
      title: "الحسابات النشطة",
      value: stats.active,
      icon: CheckCircle2,
    },
    {
      title: "الموقوفون",
      value: stats.suspended,
      icon: ShieldAlert,
    },
    {
      title: "أعياد الميلاد",
      value:
        stats.birthdaysToday,
      icon: Cake,
    },
    {
      title: "رصيد المحافظ",
      value: formatUsd(
        stats.totalWalletBalanceUsd,
      ),
      icon: WalletCards,
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
            placeholder="بحث بالاسم أو رقم العميل أو الهاتف أو البريد"
          />
        </label>

        <div className={styles.filters}>
          {(
            [
              ["all", "الكل"],
              ["active", "النشطون"],
              [
                "suspended",
                "الموقوفون",
              ],
              ["banned", "المحظورون"],
              [
                "birthday",
                "أعياد الميلاد",
              ],
              [
                "wallet_frozen",
                "محافظ مجمدة",
              ],
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
      </section>

      {filteredUsers.length === 0 ? (
        <section className={styles.empty}>
          <UsersRound size={34} />

          <h2>
            لا يوجد عملاء
          </h2>

          <p>
            العملاء المطابقون للبحث
            والفلتر سيظهرون هنا.
          </p>
        </section>
      ) : (
        <div className={styles.list}>
          {filteredUsers.map((user) => (
            <article
              className={styles.card}
              key={user.id}
              onClick={() =>
                openUser(user)
              }
            >
              <span
                className={
                  styles.avatar
                }
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={
                      user.fullName ||
                      user.customerId
                    }
                  />
                ) : (
                  <UserRound size={22} />
                )}
              </span>

              <div
                className={
                  styles.userCopy
                }
              >
                <div>
                  <strong>
                    {user.fullName ||
                      "عميل DevPlay"}
                  </strong>

                  <span
                    className={`${styles.status} ${
                      styles[user.status]
                    }`}
                  >
                    {getStatusLabel(
                      user.status,
                    )}
                  </span>

                  {isBirthdayToday(
                    user.birthDate,
                  ) && (
                    <span
                      className={
                        styles.birthdayBadge
                      }
                    >
                      <Cake size={12} />
                      عيد ميلاده اليوم
                    </span>
                  )}
                </div>

                <p>
                  {user.customerId}
                  {" · "}
                  {user.email ||
                    user.phone ||
                    "بدون بيانات اتصال"}
                </p>
              </div>

              <div
                className={
                  styles.userMeta
                }
              >
                <span>
                  <Star size={14} />
                  {getLevelLabel(
                    user.customerLevel,
                  )}
                </span>

                <span>
                  <Gift size={14} />
                  {user.couponsCount} كوبون
                </span>
              </div>

              <div
                className={
                  styles.walletInfo
                }
              >
                <strong>
                  {formatUsd(
                    user.wallet
                      ?.balanceUsd ?? 0,
                  )}
                </strong>

                <small>
                  {formatEgp(
                    user.wallet
                      ?.balanceEgp ?? 0,
                  )}
                </small>

                {user.wallet
                  ?.isFrozen && (
                  <span>
                    <Snowflake
                      size={12}
                    />
                    مجمدة
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedUser && (
        <div className={styles.overlay}>
          <button
            className={styles.backdrop}
            type="button"
            aria-label="إغلاق"
            onClick={closeUser}
          />

          <aside className={styles.drawer}>
            <header>
              <div>
                <span>
                  CUSTOMER DETAILS
                </span>

                <h2>
                  {selectedUser.customerId}
                </h2>
              </div>

              <button
                type="button"
                disabled={pending}
                onClick={closeUser}
                aria-label="إغلاق"
              >
                <X size={19} />
              </button>
            </header>

            <div className={styles.drawerBody}>
              <section
                className={
                  styles.profileHero
                }
              >
                <span
                  className={
                    styles.profileAvatar
                  }
                >
                  {selectedUser.avatarUrl ? (
                    <img
                      src={
                        selectedUser.avatarUrl
                      }
                      alt={
                        selectedUser.fullName ||
                        selectedUser.customerId
                      }
                    />
                  ) : (
                    <UserRound
                      size={29}
                    />
                  )}
                </span>

                <div>
                  <h3>
                    {selectedUser.fullName ||
                      "عميل DevPlay"}
                  </h3>

                  <span>
                    {getLevelLabel(
                      selectedUser.customerLevel,
                    )}
                  </span>

                  <strong
                    className={`${styles.status} ${
                      styles[
                        selectedUser.status
                      ]
                    }`}
                  >
                    {getStatusLabel(
                      selectedUser.status,
                    )}
                  </strong>
                </div>

                {isBirthdayToday(
                  selectedUser.birthDate,
                ) && (
                  <span
                    className={
                      styles.birthdayHero
                    }
                  >
                    <Cake size={16} />
                    عيد ميلاده اليوم 🎉
                  </span>
                )}
              </section>

              <section className={styles.panel}>
                <header>
                  <UserRound size={17} />
                  <strong>
                    بيانات العميل
                  </strong>
                </header>

                <div
                  className={
                    styles.infoGrid
                  }
                >
                  <div>
                    <span>البريد</span>
                    <strong>
                      {selectedUser.email ||
                        "غير مضاف"}
                    </strong>
                  </div>

                  <div>
                    <span>الهاتف</span>
                    <strong>
                      {selectedUser.phone ||
                        "غير مضاف"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      تاريخ الميلاد
                    </span>
                    <strong>
                      {formatDate(
                        selectedUser.birthDate,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      تاريخ التسجيل
                    </span>
                    <strong>
                      {formatDate(
                        selectedUser.createdAt,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      آخر تسجيل دخول
                    </span>
                    <strong>
                      {formatDateTime(
                        selectedUser.lastLoginAt,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      تقييم الثقة
                    </span>
                    <strong>
                      {selectedUser.trustScore}
                      %
                    </strong>
                  </div>
                </div>

                <div
                  className={
                    styles.contactActions
                  }
                >
                  <Link
                    href={`/admin/users/${selectedUser.id}`}
                    onClick={closeUser}
                  >
                    <UserRound size={15} />
                    ملف العميل 360°
                  </Link>

                  {selectedUser.phone && (
                    <a
                      href={`https://wa.me/${selectedUser.phone.replace(
                        /\D/g,
                        "",
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle
                        size={15}
                      />
                      واتساب
                    </a>
                  )}

                  {selectedUser.email && (
                    <a
                      href={`mailto:${selectedUser.email}`}
                    >
                      <Mail size={15} />
                      البريد
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      void copyValue(
                        selectedUser.customerId,
                        "customer-id",
                      );
                    }}
                  >
                    <Copy size={15} />

                    {copied ===
                    "customer-id"
                      ? "تم النسخ"
                      : "نسخ رقم العميل"}
                  </button>
                </div>
              </section>

              <section className={styles.panel}>
                <header>
                  <WalletCards size={17} />
                  <strong>
                    المحفظة
                  </strong>
                </header>

                {selectedUser.wallet ? (
                  <>
                    <div
                      className={
                        styles.walletSummary
                      }
                    >
                      <div>
                        <span>
                          الرصيد المتاح
                        </span>

                        <strong>
                          {formatUsd(
                            selectedUser.wallet
                              .balanceUsd,
                          )}
                        </strong>

                        <small>
                          {formatEgp(
                            selectedUser.wallet
                              .balanceEgp,
                          )}
                        </small>
                      </div>

                      <div>
                        <span>
                          الرصيد المجمد
                        </span>

                        <strong>
                          {formatUsd(
                            selectedUser.wallet
                              .frozenBalanceUsd,
                          )}
                        </strong>

                        <small>
                          {formatEgp(
                            selectedUser.wallet
                              .frozenBalanceEgp,
                          )}
                        </small>
                      </div>
                    </div>

                    {selectedUser.wallet
                      .isFrozen ? (
                      <div
                        className={
                          styles.freezeNotice
                        }
                      >
                        <Snowflake
                          size={17}
                        />

                        <span>
                          <strong>
                            المحفظة مجمدة
                          </strong>

                          <small>
                            {selectedUser.wallet
                              .freezeReason ||
                              "بدون سبب"}
                          </small>
                        </span>
                      </div>
                    ) : (
                      <label>
                        <span>
                          سبب التجميد
                        </span>

                        <textarea
                          value={
                            walletFreezeReason
                          }
                          onChange={(event) =>
                            setWalletFreezeReason(
                              event.target
                                .value,
                            )
                          }
                          placeholder="اكتبي سبب تجميد المحفظة"
                        />
                      </label>
                    )}

                    <button
                      className={
                        selectedUser.wallet
                          .isFrozen
                          ? styles.unfreezeButton
                          : styles.freezeButton
                      }
                      type="button"
                      disabled={pending}
                      onClick={
                        handleWalletFreeze
                      }
                    >
                      {selectedUser.wallet
                        .isFrozen ? (
                        <>
                          <ShieldCheck
                            size={16}
                          />
                          إلغاء التجميد
                        </>
                      ) : (
                        <>
                          <Snowflake
                            size={16}
                          />
                          تجميد المحفظة
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <p>
                    لا توجد محفظة لهذا العميل.
                  </p>
                )}
              </section><section className={styles.panel}>
                <header>
                  <ShieldAlert size={17} />
                  <strong>
                    حالة الحساب
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
                          .value as AdminUserStatus,
                      )
                    }
                  >
                    <option value="active">
                      نشط
                    </option>

                    <option value="suspended">
                      موقوف مؤقتًا
                    </option>

                    <option value="banned">
                      محظور
                    </option>

                    <option value="pending_verification">
                      بانتظار التحقق
                    </option>
                  </select>
                </label>

                {selectedStatus !==
                  "active" && (
                  <label>
                    <span>
                      سبب الإيقاف أو الحظر
                    </span>

                    <textarea
                      value={statusReason}
                      onChange={(event) =>
                        setStatusReason(
                          event.target.value,
                        )
                      }
                    />
                  </label>
                )}

                <button
                  className={
                    styles.statusButton
                  }
                  type="button"
                  disabled={
                    pending ||
                    selectedStatus ===
                      selectedUser.status
                  }
                  onClick={
                    handleStatusUpdate
                  }
                >
                  {selectedStatus ===
                  "active" ? (
                    <ShieldCheck
                      size={16}
                    />
                  ) : (
                    <Ban size={16} />
                  )}

                  تحديث حالة الحساب
                </button>
              </section>

              <section className={styles.panel}>
                <header>
                  <CircleDollarSign
                    size={17}
                  />
                  <strong>
                    إحصائيات التعامل
                  </strong>
                </header>

                <div
                  className={
                    styles.infoGrid
                  }
                >
                  <div>
                    <span>
                      إجمالي الطلبات
                    </span>

                    <strong>
                      {selectedUser.ordersCount}
                    </strong>
                  </div>

                  <div>
                    <span>
                      الطلبات المكتملة
                    </span>

                    <strong>
                      {
                        selectedUser.completedOrdersCount
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      الطلبات الفاشلة
                    </span>

                    <strong>
                      {
                        selectedUser.failedOrdersCount
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      إجمالي الإنفاق
                    </span>

                    <strong>
                      {formatUsd(
                        selectedUser.totalSpentUsd,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      عدد الكوبونات
                    </span>

                    <strong>
                      {
                        selectedUser.couponsCount
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      طلبات إيداع وهمية
                    </span>

                    <strong>
                      {
                        selectedUser.fakeDepositCount
                      }
                    </strong>
                  </div>
                </div>
              </section>

              <section className={styles.panel}>
                <header>
                  <LockKeyhole
                    size={17}
                  />
                  <strong>
                    ملاحظات داخلية
                  </strong>
                </header>

                <textarea
                  value={internalNotes}
                  onChange={(event) =>
                    setInternalNotes(
                      event.target.value,
                    )
                  }
                  placeholder="لا تظهر للعميل"
                />

                <button
                  className={
                    styles.notesButton
                  }
                  type="button"
                  disabled={pending}
                  onClick={
                    handleSaveNotes
                  }
                >
                  حفظ الملاحظات
                </button>
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
