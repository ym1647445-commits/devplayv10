import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Clock3,
  Plus,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";

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
  updated_at: string;
}

function formatEgp(value: number): string {
  return `${Number(value).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ج.م`;
}

function formatUsd(value: number): string {
  return `$${Number(value).toFixed(4)}`;
}

export default async function WalletPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth");
  }

  const {
    data: wallet,
    error: walletError,
  } = await supabase
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
      freeze_reason,
      updated_at
    `)
    .eq("user_id", user.id)
    .maybeSingle<UnifiedWallet>();

  if (walletError || !wallet) {
    return (
      <AppShell>
        <section className="wallet-error">
          <ShieldCheck size={36} />

          <h1>تعذر تحميل المحفظة</h1>

          <p>
            حصلت مشكلة أثناء تحميل بيانات المحفظة.
            جربي تحديث الصفحة.
          </p>

          <Link href="/wallet">
            <RefreshCw size={17} />
            تحديث
          </Link>
        </section>
      </AppShell>
    );
  }

  const balanceUsd = Number(
    wallet.balance_usd,
  );

  const balanceEgp = Number(
    wallet.balance_egp,
  );

  const frozenUsd = Number(
    wallet.frozen_balance_usd,
  );

  const frozenEgp = Number(
    wallet.frozen_balance_egp,
  );

  const exchangeRate = Number(
    wallet.usd_to_egp_rate,
  );

  return (
    <AppShell>
      <section className="wallet-page">
        <header className="wallet-heading">
          <div>
            <span>محفظتك الرقمية</span>
            <h1>المحفظة</h1>
          </div>

          <Link
            className="wallet-history-button"
            href="/wallet/transactions"
          >
            <Clock3 size={17} />
            السجل
          </Link>
        </header>

        {wallet.is_frozen && (
          <section
            className="wallet-freeze-notice"
            role="alert"
          >
            <ShieldCheck size={19} />

            <div>
              <strong>
                المحفظة مجمدة مؤقتًا
              </strong>

              <p>
                {wallet.freeze_reason ||
                  "يرجى التواصل مع خدمة العملاء لمعرفة التفاصيل."}
              </p>
            </div>
          </section>
        )}

        <section className="wallet-main-card">
          <div className="wallet-main-top">
            <span>
              <WalletCards size={20} />
              إجمالي الرصيد
            </span>

            <small>
              آخر تحديث تلقائي
            </small>
          </div>

          <strong className="wallet-egp-balance">
            {formatEgp(balanceEgp)}
          </strong>

          <span className="wallet-usd-equivalent">
            يعادل {formatUsd(balanceUsd)}
          </span>

          <div className="wallet-rate-row">
            <span>
              <CircleDollarSign size={16} />
              سعر التحويل الحالي
            </span>

            <strong>
              1 USD ={" "}
              {exchangeRate.toLocaleString(
                "ar-EG",
                {
                  maximumFractionDigits: 4,
                },
              )}{" "}
              ج.م
            </strong>
          </div>

          <div className="wallet-main-actions">
            <Link href="/wallet/deposit">
              <Plus size={18} />
              إضافة رصيد
            </Link>

            <Link href="/wallet/transactions">
              <Clock3 size={18} />
              سجل العمليات
            </Link>
          </div>
        </section>

        <section className="wallet-balance-grid">
          <article>
            <span>
              <ArrowDownLeft size={18} />
              الرصيد المتاح
            </span>

            <strong>
              {formatUsd(balanceUsd)}
            </strong>

            <small>
              {formatEgp(balanceEgp)}
            </small>
          </article>

          <article>
            <span>
              <ArrowUpRight size={18} />
              الرصيد المجمّد
            </span>

            <strong>
              {formatUsd(frozenUsd)}
            </strong>

            <small>
              {formatEgp(frozenEgp)}
            </small>
          </article>
        </section>

        <section className="wallet-info-card">
          <strong>
            طريقة عمل الرصيد
          </strong>

          <p>
            الرصيد الحقيقي داخل DevPlay محفوظ
            بالدولار. عند إضافة رصيد بالجنيه يتم
            تحويله إلى دولار بسعر التحويل المعتمد
            وقت قبول العملية.
          </p>

          <p>
            يمكنك الدفع مقابل المنتجات باستخدام
            الرصيد نفسه، وسيظهر لك المقابل بالجنيه
            والدولار دائمًا.
          </p>
        </section>

        <section className="wallet-empty-transactions">
          <div>
            <Clock3 size={25} />

            <span>
              <strong>
                آخر العمليات
              </strong>

              <small>
                ستظهر هنا عمليات الإيداع والشراء
                والاسترداد.
              </small>
            </span>
          </div>

          <Link href="/wallet/transactions">
            عرض الكل
          </Link>
        </section>
      </section>
    </AppShell>
  );
}