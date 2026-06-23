"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");

  return (
    <>
      <Navbar />

      <main className="container">
        <section className="glass-card neon-border" style={{ padding: 28, textAlign: "center" }}>
          <div className="success-icon">
            <CheckCircle2 size={58} />
          </div>

          <h1 className="neon-text">تم إرسال الطلب</h1>

          <p>
            تم استلام طلبك بنجاح وسيتم مراجعة الدفع وتنفيذ الطلب يدويًا.
          </p>

          {orderId && (
            <div className="auth-review" style={{ marginTop: 18 }}>
              <div>
                <span>رقم الطلب</span>
                <strong>#{orderId}</strong>
              </div>
            </div>
          )}

          <div className="success-actions" style={{ marginTop: 20 }}>
            <Link href="/orders" className="btn">
              متابعة الطلب
            </Link>

            <Link href="/products" className="auth-back">
              تصفح الألعاب
            </Link>
          </div>
        </section>

        <div className="bottom-space" />
      </main>

      <BottomNav />
    </>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="container">
          <div className="game-loading skeleton" />
        </main>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}