"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Send, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  refreshItem4GamerOrdersNow,
  runItem4GamerFullCycle,
  sendItem4GamerPendingNow,
  type Item4GamerControlResult,
} from "./item4gamer-actions";
import styles from "./item4gamer-order-controls.module.css";

export function Item4GamerOrderControls() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Item4GamerControlResult | null>(null);

  function run(action: () => Promise<Item4GamerControlResult>) {
    setResult(null);
    startTransition(async () => {
      const next = await action();
      setResult(next);
      if (next.success) router.refresh();
    });
  }

  return (
    <section className={styles.panel} aria-label="تحكم طلبات Item4Gamer">
      <div className={styles.copy}>
        <span><ShieldCheck size={18} /></span>
        <div>
          <small>ITEM4GAMER LIVE CONTROL</small>
          <strong>إرسال ومتابعة طلبات المورد</strong>
          <p>الأزرار آمنة ضد تكرار الإرسال والاسترداد، والـWorker يعمل تلقائيًا كل 5 دقائق.</p>
        </div>
      </div>

      <div className={styles.actions}>
        <button disabled={pending} onClick={() => run(sendItem4GamerPendingNow)}>
          <Send size={16} /> إرسال المعلق الآن
        </button>
        <button disabled={pending} onClick={() => run(refreshItem4GamerOrdersNow)}>
          <RefreshCw className={pending ? styles.spin : undefined} size={16} /> تحديث الحالات
        </button>
        <button className={styles.primary} disabled={pending} onClick={() => run(runItem4GamerFullCycle)}>
          <ShieldCheck size={16} /> تشغيل دورة كاملة
        </button>
      </div>

      {result && (
        <div className={result.success ? styles.success : styles.error} role="status">
          {result.message}
        </div>
      )}
    </section>
  );
}
