import {
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { AppShell } from "@/components/layout/AppShell";

export default function CheckoutPage() {
  return (
    <AppShell>
      <section className="checkout-page">
        <header
          className="checkout-heading"
        >
          <div>
            <span>
              الدفع من المحفظة
            </span>

            <h1>
              تأكيد الطلب
            </h1>

            <p>
              راجعي المنتجات والبيانات قبل
              خصم الرصيد وإنشاء الطلب.
            </p>
          </div>

          <Link href="/cart">
            <ArrowRight size={16} />
            السلة
          </Link>
        </header>

        <section
          className="checkout-security"
        >
          <ShieldCheck size={18} />

          <p>
            السعر النهائي وبيانات المنتجات
            يتم التحقق منها مرة أخرى داخل
            السيرفر قبل الخصم.
          </p>
        </section>

        <CheckoutClient />
      </section>
    </AppShell>
  );
}