"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  CreditCard,
  Home,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import { playSound } from "@/lib/playSound";

export default function OrderSuccessPage() {
  const params = useSearchParams();
  const orderId = params.get("id");

  return (
    <main className="checkout-page">
      <motion.section
        className="checkout-card glass-card neon-border"
        initial={{ opacity: 0, y: 35, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div className="success-icon">
          <CheckCircle2 size={62} />
        </div>

        <h1 className="neon-text success-title">تم إرسال الطلب</h1>

        <p className="success-text">
          تم استلام طلبك بنجاح، وسيتم مراجعة الدفع وتنفيذ الطلب يدويًا من الإدارة.
        </p>

        <div className="auth-review">
          <div>
            <span>رقم الطلب</span>
            <strong>#{orderId || "غير متاح"}</strong>
          </div>

          <div>
            <span>الحالة الحالية</span>
            <strong>بانتظار مراجعة الدفع</strong>
          </div>

          <div>
            <span>طريقة الدفع</span>
            <strong>Vodafone Cash</strong>
          </div>

          <div>
            <span>المراجعة</span>
            <strong>تنفيذ يدوي آمن</strong>
          </div>
        </div>

        <div className="success-info">
          <ShieldCheck size={20} />
          <span>
            احتفظ برقم الطلب لمتابعة الحالة من صفحة طلباتي.
          </span>
        </div>

        <div className="success-actions">
          <Link href="/orders" className="btn">
            <PackageCheck size={18} />
            متابعة طلباتي
          </Link>

          <Link href="/products" className="auth-back">
            <CreditCard size={18} />
            طلب جديد
          </Link>

          <Link href="/" className="auth-back">
            <Home size={18} />
            الرئيسية
          </Link>
        </div>
      </motion.section>
    </main>
  );
}