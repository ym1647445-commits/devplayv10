import {
  BellRing,
  CircleDollarSign,
  PackageSearch,
  Settings,
  TicketPercent,
  UsersRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import styles from "@/components/admin/dashboard/AdminDashboard.module.css";

interface RecentDeposit {
  id: string;
  deposit_id: string;
  status:
    | "pending"
    | "under_review"
    | "approved"
    | "rejected"
    | "needs_information"
    | "frozen"
    | "cancelled";

  requested_currency: "EGP" | "USD";
  requested_amount: number;
  credit_usd: number;
  created_at: string;

  profiles:
    | {
        customer_id: string;
        full_name: string | null;
      }
    | {
        customer_id: string;
        full_name: string | null;
      }[]
    | null;

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

function getRelation<T>(
  relation: T | T[] | null,
): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function getStatusLabel(
  status: RecentDeposit["status"],
): string {
  const labels: Record<
    RecentDeposit["status"],
    string
  > = {
    pending: "بانتظار المراجعة",
    under_review: "قيد المراجعة",
    approved: "تمت الموافقة",
    rejected: "مرفوض",
    needs_information: "مطلوب بيانات",
    frozen: "مجمّد",
    cancelled: "ملغي",
  };

  return labels[status];
}

function formatRequestedAmount(
  deposit: RecentDeposit,
): string {
  if (deposit.requested_currency === "USD") {
    return `$${Number(
      deposit.requested_amount,
    ).toFixed(2)}`;
  }

  return `${Number(
    deposit.requested_amount,
  ).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  })} ج.م`;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    usersResult,
    pendingResult,
    approvedResult,
    transactionsResult,
    settingsResult,
    recentDepositsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("deposit_requests")
      .select("*", {
        count: "exact",
        head: true,
      })
      .in("status", [
        "pending",
        "under_review",
      ]),

    supabase
      .from("deposit_requests")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "approved"),

    supabase
      .from("account_wallet_transactions")
      .select("amount_usd")
      .eq("type", "deposit"),

    supabase
      .from("platform_settings")
      .select(`
        usd_to_egp_rate,
        profit_per_usd_egp,
        minimum_profit_egp
      `)
      .eq("id", 1)
      .single(),

    supabase
      .from("deposit_requests")
      .select(`
        id,
        deposit_id,
        status,
        requested_currency,
        requested_amount,
        credit_usd,
        created_at,
        profiles(
          customer_id,
          full_name
        ),
        payment_methods(
          name,
          network
        )
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(5)
      .returns<RecentDeposit[]>(),
  ]);

  const totalUsers =
    usersResult.count ?? 0;

  const pendingDeposits =
    pendingResult.count ?? 0;

  const approvedDeposits =
    approvedResult.count ?? 0;

  const totalDepositedUsd =
    transactionsResult.error
      ? 0
      : (transactionsResult.data ?? [])
          .reduce(
            (total, transaction) =>
              total +
              Number(transaction.amount_usd),
            0,
          );

  const usdRate = Number(
    settingsResult.data
      ?.usd_to_egp_rate ?? 0,
  );

  const profitPerUsd = Number(
    settingsResult.data
      ?.profit_per_usd_egp ?? 0,
  );

  const minimumProfit = Number(
    settingsResult.data
      ?.minimum_profit_egp ?? 0,
  );

  const recentDeposits =
    recentDepositsResult.error
      ? []
      : recentDepositsResult.data ?? [];

  const statCards = [
    {
      title: "العملاء",
      value: totalUsers.toLocaleString(
        "ar-EG",
      ),
      icon: UsersRound,
      progress: Math.min(
        100,
        totalUsers,
      ),
      change: "كل الحسابات",
    },
    {
      title: "إيداعات معلقة",
      value:
        pendingDeposits.toLocaleString(
          "ar-EG",
        ),
      icon: WalletCards,
      progress: Math.min(
        100,
        pendingDeposits * 12,
      ),
      change:
        pendingDeposits > 0
          ? "تحتاج مراجعة"
          : "كل شيء مكتمل",
    },
    {
      title: "إيداعات معتمدة",
      value:
        approvedDeposits.toLocaleString(
          "ar-EG",
        ),
      icon: PackageSearch,
      progress: Math.min(
        100,
        approvedDeposits * 5,
      ),
      change: "إجمالي الطلبات",
    },
    {
      title: "الرصيد المضاف",
      value: `$${totalDepositedUsd.toFixed(
        2,
      )}`,
      icon: CircleDollarSign,
      progress: Math.min(
        100,
        totalDepositedUsd,
      ),
      change: "من الإيداعات",
    },
  ];

  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <div className={styles.headingCopy}>
          <span>
            DEVPLAY CONTROL CENTER
          </span>

          <h1>
            لوحة التحكم
          </h1>

          <p>
            متابعة سريعة لحالة المنصة
            والعمليات المالية.
          </p>
        </div>

        <span className={styles.liveBadge}>
          النظام يعمل
        </span>
      </header>

      <section className={styles.statsGrid}>
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              className={styles.statCard}
              key={card.title}
            >
              <div className={styles.statTop}>
                <span
                  className={styles.statIcon}
                >
                  <Icon size={18} />
                </span>

                <span
                  className={styles.statChange}
                >
                  {card.change}
                </span>
              </div>

              <strong>
                {card.value}
              </strong>

              <span>
                {card.title}
              </span>

              <div className={styles.progress}>
                <span
                  style={{
                    width: `${card.progress}%`,
                  }}
                />
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <strong>
                أحدث طلبات الإيداع
              </strong>

              <small>
                آخر العمليات الواردة للمنصة
              </small>
            </div>

            <Link href="/admin/deposits">
              عرض الكل
            </Link>
          </div>

          {recentDeposits.length === 0 ? (
            <div className={styles.empty}>
              <WalletCards size={25} />

              <strong>
                لا توجد طلبات
              </strong>

              <span>
                ستظهر الإيداعات الجديدة هنا.
              </span>
            </div>
          ) : (
            <div className={styles.depositList}>
              {recentDeposits.map(
                (deposit) => {
                  const profile =
                    getRelation(
                      deposit.profiles,
                    );

                  const method =
                    getRelation(
                      deposit.payment_methods,
                    );

                  return (
                    <Link
                      className={
                        styles.depositItem
                      }
                      href="/admin/deposits"
                      key={deposit.id}
                    >
                      <span
                        className={
                          styles.depositIcon
                        }
                      >
                        <WalletCards
                          size={17}
                        />
                      </span>

                      <span
                        className={
                          styles.depositCopy
                        }
                      >
                        <strong>
                          {profile
                            ?.full_name ||
                            "عميل DevPlay"}
                        </strong>

                        <span>
                          {
                            deposit.deposit_id
                          }
                          {" · "}
                          {method?.name ??
                            "وسيلة دفع"}
                          {method?.network
                            ? ` — ${method.network}`
                            : ""}
                        </span>
                      </span>

                      <span
                        className={
                          styles.depositSide
                        }
                      >
                        <strong>
                          {formatRequestedAmount(
                            deposit,
                          )}
                        </strong>

                        <span
                          className={`${styles.status} ${
                            styles[
                              deposit.status
                            ] ?? ""
                          }`}
                        >
                          {getStatusLabel(
                            deposit.status,
                          )}
                        </span>
                      </span>
                    </Link>
                  );
                },
              )}
            </div>
          )}
        </article>

        <div className={styles.settingsCard}>
          <article className={styles.panel}>
            <div className={styles.panelHeading}>
              <div>
                <strong>
                  التسعير الحالي
                </strong>

                <small>
                  إعدادات المحرك المالي
                </small>
              </div>

              <Link href="/admin/pricing">
                تعديل
              </Link>
            </div>

            <div className={styles.settingRow}>
              <span>
                <CircleDollarSign
                  size={16}
                />
                سعر الدولار
              </span>

              <strong>
                {usdRate.toFixed(2)} ج.م
              </strong>
            </div>

            <div className={styles.settingRow}>
              <span>
                <PackageSearch size={16} />
                الربح لكل دولار
              </span>

              <strong>
                {profitPerUsd.toFixed(2)} ج.م
              </strong>
            </div>

            <div className={styles.settingRow}>
              <span>
                <Settings size={16} />
                أقل ربح مسموح
              </span>

              <strong>
                {minimumProfit.toFixed(2)} ج.م
              </strong>
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeading}>
              <div>
                <strong>
                  إجراءات سريعة
                </strong>

                <small>
                  اختصارات الإدارة
                </small>
              </div>
            </div>

            <div className={styles.quickActions}>
              <Link href="/admin/deposits">
                <WalletCards size={19} />
                مراجعة الإيداعات
              </Link>

              <Link href="/admin/pricing">
                <CircleDollarSign
                  size={19}
                />
                تحديث السعر
              </Link>

              <Link href="/admin/coupons">
                <TicketPercent size={19} />
                إنشاء كوبون
              </Link>

              <Link href="/admin/notifications">
                <BellRing size={19} />
                إرسال إشعار
              </Link>
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}