import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { DepositForm } from "@/components/wallet/DepositForm";
import { createClient } from "@/lib/supabase/server";
import type { DepositPaymentMethod } from "@/types/deposit";

export default async function DepositPage() {
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
      data: methods,
      error: methodsError,
    },
    {
      data: settings,
      error: settingsError,
    },
  ] = await Promise.all([
    supabase
      .from("payment_methods")
      .select(`
        id,
        type,
        name,
        network,
        address,
        currency,
        minimum_amount,
        instructions,
        sort_order
      `)
      .eq("enabled", true)
      .order("sort_order", {
        ascending: true,
      })
      .returns<DepositPaymentMethod[]>(),

    supabase
      .from("platform_settings")
      .select("usd_to_egp_rate, egp_deposit_fee_per_1000, egp_deposit_minimum_fee, usd_deposit_fixed_fee")
      .eq("id", 1)
      .single(),
  ]);

  if (
    methodsError ||
    settingsError ||
    !methods ||
    methods.length === 0 ||
    !settings
  ) {
    return (
      <AppShell>
        <section className="wallet-error">
          <h1>
            تعذر تحميل وسائل الدفع
          </h1>

          <p>
            تأكدي من إعداد وسائل الدفع وسعر
            الدولار، ثم جربي تحديث الصفحة.
          </p>

          <Link href="/wallet">
            <ArrowRight size={17} />
            الرجوع للمحفظة
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="wallet-page">
        <header className="wallet-heading">
          <div>
            <span>
              شحن المحفظة
            </span>

            <h1>
              إضافة رصيد
            </h1>
          </div>

          <Link
            className="wallet-history-button"
            href="/wallet"
          >
            <ArrowRight size={17} />
            رجوع
          </Link>
        </header>

        <DepositForm
          paymentMethods={methods.map(
            (method) => ({
              ...method,
              minimum_amount: Number(
                method.minimum_amount,
              ),
            }),
          )}
          usdRate={Number(
            settings.usd_to_egp_rate,
          )}
          egpFeePer1000={Number(settings.egp_deposit_fee_per_1000 ?? 10)}
          egpMinimumFee={Number(settings.egp_deposit_minimum_fee ?? 0)}
          usdFixedFee={Number(settings.usd_deposit_fixed_fee ?? 0)}
        />
      </section>
    </AppShell>
  );
}
