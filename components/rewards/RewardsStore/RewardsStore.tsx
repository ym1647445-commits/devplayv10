"use client";

import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Gift,
  LoaderCircle,
  LockKeyhole,
  ShoppingBag,
  Sparkles,
  Star,
  TicketPercent,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { redeemReward } from "@/app/rewards/actions";
import { useAuth } from "@/providers/AuthProvider";
import type {
  RewardPointTransaction,
  RewardRedemptionResult,
  RewardStoreItem,
} from "@/types/reward";

import styles from "./RewardsStore.module.css";

interface RewardsStoreProps {
  rewards: RewardStoreItem[];

  initialPoints: number;
  customerLevel: string;

  transactions:
    RewardPointTransaction[];
}

interface ConfirmRewardState {
  reward: RewardStoreItem;
}

function formatEgp(
  value: number,
): string {
  return `${Number(value).toLocaleString(
    "ar-EG",
    {
      maximumFractionDigits: 2,
    },
  )} ج.م`;
}

function formatDate(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "ar-EG",
    {
      dateStyle: "medium",
    },
  ).format(new Date(value));
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

function getTransactionTitle(
  transaction:
    RewardPointTransaction,
): string {
  if (
    transaction.direction ===
    "debit"
  ) {
    return "خصم نقاط";
  }

  const labels: Record<
    string,
    string
  > = {
    order_reward:
      "مكافأة طلب",

    admin_reward:
      "هدية الإدارة",

    birthday_reward:
      "هدية عيد الميلاد",

    promotion_reward:
      "مكافأة عرض",

    wheel_reward:
      "مكافأة العجلة",

    reward_redemption:
      "استبدال مكافأة",

    adjustment:
      "تعديل النقاط",
  };

  return (
    labels[transaction.type] ??
    "إضافة نقاط"
  );
}

export function RewardsStore({
  rewards,
  initialPoints,
  customerLevel,
  transactions,
}: RewardsStoreProps) {
  const router = useRouter();

  const {
    refreshAuth,
  } = useAuth();

  const [
    pending,
    startTransition,
  ] = useTransition();

  const [points, setPoints] =
    useState(initialPoints);

  const [
    confirmReward,
    setConfirmReward,
  ] = useState<ConfirmRewardState | null>(
    null,
  );

  const [
    result,
    setResult,
  ] =
    useState<RewardRedemptionResult | null>(
      null,
    );

  const [copied, setCopied] =
    useState(false);

  const sortedRewards =
    useMemo(
      () =>
        [...rewards].sort(
          (first, second) =>
            first.sortOrder -
            second.sortOrder,
        ),
      [rewards],
    );

  function openConfirmation(
    reward: RewardStoreItem,
  ): void {
    setResult(null);
    setCopied(false);

    setConfirmReward({
      reward,
    });
  }

  function closeModal(): void {
    if (pending) {
      return;
    }

    setConfirmReward(null);
    setResult(null);
    setCopied(false);
  }

  function handleRedeem(): void {
    if (
      !confirmReward ||
      pending
    ) {
      return;
    }

    const reward =
      confirmReward.reward;

    setResult(null);

    startTransition(async () => {
      const response =
        await redeemReward(
          reward.id,
        );

      setResult(response);

      if (
        response.success &&
        response.coupon
      ) {
        setPoints(
          response.coupon
            .pointsRemaining,
        );

        await refreshAuth();

        router.refresh();
      }
    });
  }

  async function copyCouponCode(
    code: string,
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        code,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      window.alert(
        `كود الكوبون: ${code}`,
      );
    }
  }

  return (
    <section className={styles.wrapper}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroLabel}>
            <Sparkles size={14} />
            DEVPLAY REWARDS
          </span>

          <h1>
            متجر المكافآت
          </h1>

          <p>
            اجمعي النقاط من طلباتك،
            واستبدليها بكوبونات مخصصة
            لحسابك.
          </p>
        </div>

        <div className={styles.pointsCard}>
          <span>
            <Coins size={20} />
            رصيد النقاط
          </span>

          <strong>
            {points.toLocaleString(
              "ar-EG",
            )}
          </strong>

          <small>
            المستوى الحالي:{" "}
            {getLevelLabel(
              customerLevel,
            )}
          </small>
        </div>
      </section>

      <section className={styles.rules}>
        <div>
          <Star size={17} />

          <span>
            <strong>
              طريقة كسب النقاط
            </strong>

            <small>
              كل دولار مكتمل من الطلبات
              يمنحك 100 نقطة.
            </small>
          </span>
        </div>

        <div>
          <TicketPercent size={17} />

          <span>
            <strong>
              كوبونات خاصة
            </strong>

            <small>
              كل كوبون مرتبط بحسابك
              ويُستخدم مرة واحدة.
            </small>
          </span>
        </div>

        <div>
          <CalendarClock size={17} />

          <span>
            <strong>
              مدة محددة
            </strong>

            <small>
              راجعي مدة الكوبون بعد
              الاستبدال.
            </small>
          </span>
        </div>
      </section>

      <section className={styles.storeSection}>
        <header className={styles.sectionHeading}>
          <div>
            <span>
              <Gift size={17} />
              المكافآت المتاحة
            </span>

            <h2>
              اختاري مكافأتك
            </h2>
          </div>

          <Link href="/coupons">
            كوبوناتي
            <ArrowLeft size={15} />
          </Link>
        </header>

        {sortedRewards.length === 0 ? (
          <section className={styles.empty}>
            <Gift size={34} />

            <h2>
              لا توجد مكافآت حاليًا
            </h2>

            <p>
              ستظهر المكافآت الجديدة هنا
              فور إضافتها.
            </p>
          </section>
        ) : (
          <div className={styles.grid}>
            {sortedRewards.map(
              (reward) => {
                const enoughPoints =
                  points >=
                  reward.pointsCost;

                const limitReached =
                  reward.userRedemptionsCount >=
                  reward.perUserLimit;

                const stockFinished =
                  reward.totalLimit !==
                    null &&
                  reward.redeemedCount >=
                    reward.totalLimit;

                const unavailable =
                  limitReached ||
                  stockFinished;

                const remainingPoints =
                  Math.max(
                    0,
                    reward.pointsCost -
                      points,
                  );

                return (
                  <article
                    className={`${styles.card} ${
                      reward.featured
                        ? styles.featured
                        : ""
                    }`}
                    key={reward.id}
                  >
                    <div
                      className={
                        styles.rewardImage
                      }
                    >
                      {reward.imageUrl ? (
                        <img
                          src={
                            reward.imageUrl
                          }
                          alt={
                            reward.title
                          }
                        />
                      ) : (
                        <Gift size={34} />
                      )}

                      {reward.badge && (
                        <span>
                          {reward.badge}
                        </span>
                      )}
                    </div>

                    <div
                      className={
                        styles.rewardContent
                      }
                    >
                      <span
                        className={
                          styles.couponValue
                        }
                      >
                        <TicketPercent
                          size={15}
                        />

                        خصم{" "}
                        {formatEgp(
                          reward.couponValueEgp,
                        )}
                      </span>

                      <h3>
                        {reward.title}
                      </h3>

                      {reward.description && (
                        <p>
                          {
                            reward.description
                          }
                        </p>
                      )}

                      <div
                        className={
                          styles.details
                        }
                      >
                        <div>
                          <ShoppingBag
                            size={15}
                          />

                          <span>
                            <small>
                              الحد الأدنى للسلة
                            </small>

                            <strong>
                              {formatEgp(
                                reward.minimumCartEgp,
                              )}
                            </strong>
                          </span>
                        </div>

                        <div>
                          <CalendarClock
                            size={15}
                          />

                          <span>
                            <small>
                              مدة الصلاحية
                            </small>

                            <strong>
                              {
                                reward.expiryDays
                              }{" "}
                              يوم
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div
                        className={
                          styles.costRow
                        }
                      >
                        <span>
                          <Coins size={17} />
                          السعر
                        </span>

                        <strong>
                          {reward.pointsCost.toLocaleString(
                            "ar-EG",
                          )}{" "}
                          نقطة
                        </strong>
                      </div>

                      <button
                        className={
                          styles.redeemButton
                        }
                        type="button"
                        disabled={
                          !enoughPoints ||
                          unavailable
                        }
                        onClick={() =>
                          openConfirmation(
                            reward,
                          )
                        }
                      >
                        {stockFinished ? (
                          <>
                            <LockKeyhole
                              size={16}
                            />
                            انتهى المتاح
                          </>
                        ) : limitReached ? (
                          <>
                            <CheckCircle2
                              size={16}
                            />
                            تم الوصول للحد
                          </>
                        ) : enoughPoints ? (
                          <>
                            <Gift size={16} />
                            استبدال الآن
                          </>
                        ) : (
                          <>
                            <LockKeyhole
                              size={16}
                            />
                            ناقص{" "}
                            {remainingPoints.toLocaleString(
                              "ar-EG",
                            )}{" "}
                            نقطة
                          </>
                        )}
                      </button>

                      <small
                        className={
                          styles.limitText
                        }
                      >
                        استخدمتِ{" "}
                        {
                          reward.userRedemptionsCount
                        }{" "}
                        من{" "}
                        {
                          reward.perUserLimit
                        }
                      </small>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>

      <section className={styles.historySection}>
        <header className={styles.sectionHeading}>
          <div>
            <span>
              <Trophy size={17} />
              سجل النقاط
            </span>

            <h2>
              آخر العمليات
            </h2>
          </div>
        </header>

        {transactions.length === 0 ? (
          <div className={styles.historyEmpty}>
            لا توجد عمليات نقاط حتى الآن.
          </div>
        ) : (
          <div className={styles.historyList}>
            {transactions.map(
              (transaction) => (
                <article
                  key={transaction.id}
                >
                  <span
                    className={`${styles.transactionIcon} ${
                      transaction.direction ===
                      "credit"
                        ? styles.creditIcon
                        : styles.debitIcon
                    }`}
                  >
                    <Coins size={17} />
                  </span>

                  <div>
                    <strong>
                      {getTransactionTitle(
                        transaction,
                      )}
                    </strong>

                    <small>
                      {transaction.description ||
                        "عملية نقاط"}
                    </small>

                    <time>
                      {formatDateTime(
                        transaction.createdAt,
                      )}
                    </time>
                  </div>

                  <strong
                    className={
                      transaction.direction ===
                      "credit"
                        ? styles.credit
                        : styles.debit
                    }
                  >
                    {transaction.direction ===
                    "credit"
                      ? "+"
                      : "-"}
                    {transaction.points.toLocaleString(
                      "ar-EG",
                    )}
                  </strong>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      {confirmReward && (
        <div className={styles.overlay}>
          <button
            className={styles.backdrop}
            type="button"
            aria-label="إغلاق"
            onClick={closeModal}
          />

          <section className={styles.modal}>
            <header>
              <span>
                <Gift size={21} />
              </span>

              <div>
                <small>
                  REWARD REDEMPTION
                </small>

                <h2>
                  {result?.success
                    ? "تم الاستبدال"
                    : "تأكيد الاستبدال"}
                </h2>
              </div>

              <button
                type="button"
                disabled={pending}
                onClick={closeModal}
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </header>

            {result?.success &&
            result.coupon ? (
              <div className={styles.successContent}>
                <span
                  className={
                    styles.successIcon
                  }
                >
                  <CheckCircle2
                    size={34}
                  />
                </span>

                <h3>
                  الكوبون جاهز 🎁
                </h3>

                <p>
                  تم إضافة الكوبون إلى
                  حسابك ويمكنك استخدامه من
                  صفحة كوبوناتي.
                </p>

                <button
                  type="button"
                  className={
                    styles.couponCode
                  }
                  onClick={() => {
                    void copyCouponCode(
                      result.coupon!
                        .code,
                    );
                  }}
                >
                  <span>
                    {
                      result.coupon
                        .code
                    }
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
                    styles.successDetails
                  }
                >
                  <div>
                    <span>
                      قيمة الخصم
                    </span>

                    <strong>
                      {formatEgp(
                        result.coupon
                          .valueEgp,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      أقل سلة
                    </span>

                    <strong>
                      {formatEgp(
                        result.coupon
                          .minimumCartEgp,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      النقاط المتبقية
                    </span>

                    <strong>
                      {result.coupon.pointsRemaining.toLocaleString(
                        "ar-EG",
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      ينتهي في
                    </span>

                    <strong>
                      {formatDate(
                        result.coupon
                          .expiresAt,
                      )}
                    </strong>
                  </div>
                </div>

                <Link
                  className={
                    styles.couponsLink
                  }
                  href="/coupons"
                >
                  فتح كوبوناتي
                  <ArrowLeft size={16} />
                </Link>
              </div>
            ) : (
              <div className={styles.confirmContent}>
                <div
                  className={
                    styles.confirmReward
                  }
                >
                  <TicketPercent
                    size={29}
                  />

                  <span>
                    <strong>
                      {
                        confirmReward
                          .reward.title
                      }
                    </strong>

                    <small>
                      خصم{" "}
                      {formatEgp(
                        confirmReward
                          .reward
                          .couponValueEgp,
                      )}
                    </small>
                  </span>
                </div>

                <div
                  className={
                    styles.confirmRows
                  }
                >
                  <div>
                    <span>
                      سيتم خصم
                    </span>

                    <strong>
                      {confirmReward.reward.pointsCost.toLocaleString(
                        "ar-EG",
                      )}{" "}
                      نقطة
                    </strong>
                  </div>

                  <div>
                    <span>
                      رصيدك بعد الاستبدال
                    </span>

                    <strong>
                      {Math.max(
                        0,
                        points -
                          confirmReward
                            .reward
                            .pointsCost,
                      ).toLocaleString(
                        "ar-EG",
                      )}{" "}
                      نقطة
                    </strong>
                  </div>

                  <div>
                    <span>
                      أقل قيمة للسلة
                    </span>

                    <strong>
                      {formatEgp(
                        confirmReward
                          .reward
                          .minimumCartEgp,
                      )}
                    </strong>
                  </div>
                </div>

                <p
                  className={
                    styles.confirmNotice
                  }
                >
                  بعد التأكيد لا يمكن إعادة
                  النقاط إلا من خلال مراجعة
                  خدمة العملاء.
                </p>

                {result &&
                  !result.success && (
                    <p
                      className={
                        styles.errorMessage
                      }
                      role="alert"
                    >
                      {result.message}
                    </p>
                  )}

                <div
                  className={
                    styles.modalActions
                  }
                >
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={pending}
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleRedeem
                    }
                    disabled={pending}
                  >
                    {pending ? (
                      <>
                        <LoaderCircle
                          className={
                            styles.spinner
                          }
                          size={17}
                        />

                        جاري الاستبدال
                      </>
                    ) : (
                      <>
                        <Gift size={17} />
                        تأكيد الاستبدال
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}