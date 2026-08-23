import type { Metadata } from "next";
import { KeyRound, ShieldAlert } from "lucide-react";
import Link from "next/link";


import { createClient } from "@/lib/supabase/server";

import { ResetPasswordForm } from "./ResetPasswordForm";
import styles from "./reset-password.module.css";

export const metadata: Metadata = {
  title: "تعيين كلمة مرور جديدة",
  description: "عيّني كلمة مرور جديدة وآمنة لحساب DevPlay الخاص بك.",
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <Link className={styles.brand} href="/" aria-label="DevPlay Top Up">
          <span>
            <KeyRound size={24} />
          </span>

          <div>
            <strong>DevPlay Top Up</strong>
            <small>BY SHAH​​D ELBARY</small>
          </div>
        </Link>

        {user ? (
          <>
            <div className={styles.heading}>
              <span>استعادة الحساب</span>
              <h1>تعيين كلمة مرور جديدة</h1>

              <p>
                اكتبي كلمة مرور جديدة وآمنة لحسابك.
                لن تحتاجي كلمة المرور القديمة.
              </p>
            </div>

            <ResetPasswordForm />
          </>
        ) : (
          <div className={styles.invalid}>
            <span>
              <ShieldAlert size={26} />
            </span>

            <h1>الرابط غير صالح أو منتهي الصلاحية</h1>

            <p>
              روابط استعادة كلمة المرور صالحة لمرة واحدة
              ولفترة محدودة فقط. اطلبي رابطًا جديدًا من
              صفحة تسجيل الدخول.
            </p>

            <Link className={styles.backLink} href="/auth">
              الرجوع لتسجيل الدخول
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
