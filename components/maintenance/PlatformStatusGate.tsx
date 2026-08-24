"use client";

import {
  Clock3,
  Headphones,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { PlatformStatus } from "@/lib/platform-status";
import styles from "./PlatformStatusGate.module.css";

const EXEMPT = ["/admin", "/auth", "/support", "/orders", "/maintenance"];
type BlockedOperation = "orders" | "deposits" | "transfers";

function expectedReturn(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function PlatformStatusGate() {
  const path = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/platform-status", { cache: "no-store" });
      if (response.ok) setStatus(await response.json());
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/platform-status", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<PlatformStatus> : null)
      .then((data) => { if (active && data) setStatus(data); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [path]);
  useEffect(() => {
    if (status?.maintenanceMode && !EXEMPT.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      router.replace("/maintenance");
    }
  }, [path, router, status]);

  if (!status || EXEMPT.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return null;

  const operation: BlockedOperation | null =
    path.startsWith("/checkout") && !status.ordersEnabled ? "orders"
      : path.startsWith("/wallet/deposit") && (!status.walletOperationsEnabled || !status.depositsEnabled) ? "deposits"
        : path.startsWith("/wallet/transfer") && (!status.walletOperationsEnabled || !status.walletTransfersEnabled) ? "transfers"
          : null;

  if (!operation) return null;

  const isCart = operation === "orders";
  const title = isCart ? "نحدّث تجربة السلة الآن"
    : operation === "deposits" ? "إضافة الرصيد متوقفة مؤقتًا"
      : "تحويل الرصيد متوقف مؤقتًا";
  const returnAt = expectedReturn(status.expectedReturnAt);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="platform-pause-title">
      <section className={styles.card} data-cart={isCart}>
        <div className={styles.glow} aria-hidden="true" />
        <span className={styles.eyebrow}><span /> تحديث مؤقت وآمن</span>
        <div className={styles.visual} aria-hidden="true">
          <span className={styles.orbit}><Wrench /></span>
          <span className={styles.spark}><Sparkles /></span>
          <span className={styles.package}><PackageCheck /></span>
          <span className={styles.cart}><ShoppingCart /></span>
          <span className={styles.floor} />
        </div>
        <h1 id="platform-pause-title">{title}</h1>
        <p className={styles.lead}>
          {isCart
            ? "نرتّب بعض التفاصيل داخل السلة لنقدّم لك طلبًا أسرع وأوضح. ارجعي بعد قليل وستجدي كل شيء جاهزًا."
            : `${title} لأعمال الصيانة. يمكنك استخدام باقي خدمات DevPlay بشكل طبيعي.`}
        </p>
        <div className={styles.progress} aria-label="التحديث جارٍ"><span /></div>
        <div className={styles.safeNote}>
          <ShieldCheck />
          <span><strong>رصيدك آمن بالكامل</strong><small>لم يتم إنشاء طلب أو خصم أي مبلغ من محفظتك.</small></span>
        </div>
        {(status.maintenanceMessage || returnAt) && (
          <div className={styles.statusNote}>
            <Clock3 />
            <span>
              <strong>{status.maintenanceTitle || "جاري تنفيذ تحديث سريع"}</strong>
              <small>{status.maintenanceMessage}{returnAt ? ` · العودة المتوقعة ${returnAt}` : ""}</small>
            </span>
          </div>
        )}
        <div className={styles.actions}>
          <button type="button" onClick={() => void checkStatus()} disabled={checking}>
            <RefreshCw className={checking ? styles.spin : undefined} />
            {checking ? "نفحص الحالة..." : "جرّبي مرة أخرى"}
          </button>
          <Link href="/orders"><PackageCheck /> متابعة طلباتي</Link>
          <Link href="/support" className={styles.support}><Headphones /> الدعم</Link>
        </div>
      </section>
    </div>
  );
}
