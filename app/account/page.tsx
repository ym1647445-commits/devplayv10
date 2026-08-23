import {
  Bell,
  ChevronLeft,
  CircleUserRound,
  Gift,
  LogOut,
  PackageSearch,
  Settings,
  ShieldCheck,
  TicketPercent,
  Headphones,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";

interface Profile {
  id: string;
  customer_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;

  points: number;
  customer_level: string;
  trust_score: number;
  successful_orders_count: number;

  created_at: string;
}

interface UnifiedWallet {
  id: string;
  user_id: string;

  balance_usd: number;
  balance_egp: number;

  frozen_balance_usd: number;
  frozen_balance_egp: number;

  usd_to_egp_rate: number;

  is_frozen: boolean;
  freeze_reason: string | null;
}

function formatEgpBalance(
  balance: number,
): string {
  return `${Number(balance).toLocaleString(
    "ar-EG",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )} ج.م`;
}

function formatUsdBalance(
  balance: number,
): string {
  return `$${Number(balance).toFixed(3)}`;
}

function formatLevel(
  level: string,
): string {
  const levels: Record<string, string> = {
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    diamond: "Diamond",
    elite: "Elite",
    vip: "VIP",
  };

  return (
    levels[level.toLowerCase()] ??
    level
  );
}

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth");
  }

  const [
    {
      data: profile,
      error: profileError,
    },
    {
      data: wallet,
      error: walletError,
    },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        id,
        customer_id,
        full_name,
        email,
        phone,
        avatar_url,
        points,
        customer_level,
        trust_score,
        successful_orders_count,
        created_at
      `)
      .eq("id", user.id)
      .single<Profile>(),

    supabase
      .from("account_wallet_balances")
      .select(`
        id,
        user_id,
        balance_usd,
        balance_egp,
        frozen_balance_usd,
        frozen_balance_egp,
        usd_to_egp_rate,
        is_frozen,
        freeze_reason
      `)
      .eq("user_id", user.id)
      .maybeSingle<UnifiedWallet>(),
  ]);

  if (profileError || !profile) {
    return (
      <AppShell>
        <section className="account-error">
          <ShieldCheck size={34} />

          <h1>تعذر تحميل الحساب</h1>

          <p>
            الحساب موجود، لكن حصلت مشكلة أثناء
            تحميل بيانات الملف الشخصي.
          </p>
        </section>
      </AppShell>
    );
  }

  if (walletError) {
    console.error(
      "Failed to load unified wallet:",
      walletError,
    );
  }

  const balanceUsd = Number(
    wallet?.balance_usd ?? 0,
  );

  const balanceEgp = Number(
    wallet?.balance_egp ?? 0,
  );

  const walletIsFrozen =
    wallet?.is_frozen ?? false;

  const menuItems = [
    {
      title: "خدمة العملاء",
      description: "أرسل مشكلة أو اقتراحًا وتابع رد الإدارة",
      href: "/support",
      icon: Headphones,
    },
    {
      title: "طلباتي",
      description:
        "متابعة الطلبات وحالات التنفيذ",
      href: "/orders",
      icon: PackageSearch,
    },
    {
      title: "المحفظة",
      description:
        "إضافة الرصيد وسجل المعاملات",
      href: "/wallet",
      icon: WalletCards,
    },
    {
      title: "كوبوناتي",
      description:
        "الكوبونات المتاحة والقريبة من الانتهاء",
      href: "/coupons",
      icon: TicketPercent,
    },
    {
      title: "الإشعارات",
      description:
        "آخر التحديثات والتنبيهات",
      href: "/notifications",
      icon: Bell,
    },
    {
      title: "الإعدادات",
      description:
        "البيانات والأمان والمظهر",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <AppShell>
      <section className="account-page">
        <header className="account-profile-card">
          <div className="account-avatar">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={
                  profile.full_name ??
                  "صورة الحساب"
                }
              />
            ) : (
              <CircleUserRound size={31} />
            )}
          </div>

          <div className="account-profile-info">
            <span>أهلًا بيك 👋</span>

            <h1>
              {profile.full_name ||
                "عميل DevPlay"}
            </h1>

            <div className="account-profile-meta">
              <strong>
                {profile.customer_id}
              </strong>

              <span>
                {formatLevel(
                  profile.customer_level,
                )}
              </span>
            </div>
          </div>

          <form
            action="/auth/logout"
            method="post"
          >
            <button
              className="account-logout-button"
              type="submit"
              aria-label="تسجيل الخروج"
            >
              <LogOut size={18} />
            </button>
          </form>
        </header>

        <section className="account-wallets">
          <article>
            <span>
              <WalletCards size={17} />
              الرصيد بالجنيه
            </span>

            <strong>
              {formatEgpBalance(
                balanceEgp,
              )}
            </strong>

            <small>
              {walletIsFrozen
                ? "المحفظة مجمدة مؤقتًا"
                : `بسعر صرف ${Number(
                    wallet?.usd_to_egp_rate ??
                      0,
                  ).toFixed(2)} ج.م`}
            </small>
          </article>

          <article>
            <span>
              <WalletCards size={17} />
              الرصيد الحقيقي
            </span>

            <strong>
              {formatUsdBalance(
                balanceUsd,
              )}
            </strong>

            <small>
              {walletIsFrozen
                ? "المحفظة مجمدة مؤقتًا"
                : "الرصيد الداخلي بالدولار"}
            </small>
          </article>
        </section>

        <section className="account-statistics">

          <article>
            <strong>
              {
                profile.successful_orders_count
              }
            </strong>

            <span>طلبات ناجحة</span>
          </article>

          <article>
            <strong>
              {profile.trust_score}%
            </strong>

            <span>درجة الثقة</span>
          </article>
        </section>

        <section className="account-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                href={item.href}
                key={item.title}
              >
                <span className="account-menu-icon">
                  <Icon size={20} />
                </span>

                <span className="account-menu-copy">
                  <strong>
                    {item.title}
                  </strong>

                  <small>
                    {item.description}
                  </small>
                </span>

                <ChevronLeft
                  className="account-menu-arrow"
                  size={18}
                />
              </Link>
            );
          })}
        </section>

        <section className="account-contact-card">
          <strong>
            بيانات التواصل
          </strong>

          <div>
            <span>البريد</span>

            <b>
              {profile.email ??
                user.email ??
                "غير مضاف"}
            </b>
          </div>

          <div>
            <span>واتساب</span>

            <b>
              {profile.phone ||
                "غير مضاف"}
            </b>
          </div>
        </section>
      </section>
    </AppShell>
  );
}
