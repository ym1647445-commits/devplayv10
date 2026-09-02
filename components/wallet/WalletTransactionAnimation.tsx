"use client";

import { Check, ShieldCheck, WalletCards } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import styles from "./WalletTransactionAnimation.module.css";

interface WalletTransactionAnimationProps {
  previousBalanceEgp: number;
  newBalanceEgp: number;
  deductedAmountEgp: number;
  successMessage: string;
}

function formatEgp(value: number) {
  return Number(value).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " ج.م";
}

function prefersReducedMotion() {
  return document.documentElement.dataset.reduceMotion === "true" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function WalletTransactionAnimation({
  previousBalanceEgp,
  newBalanceEgp,
  deductedAmountEgp,
  successMessage,
}: WalletTransactionAnimationProps) {
  const [visible, setVisible] = useState(true);
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const [displayedBalance, setDisplayedBalance] = useState(previousBalanceEgp);
  const [counting, setCounting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let frame = 0;
    const timers: number[] = [];
    const reduced = prefersReducedMotion();

    if (reduced) {
      timers.push(window.setTimeout(() => {
        setDisplayedBalance(newBalanceEgp);
        setCompleted(true);
      }, 0));
      timers.push(window.setTimeout(() => setVisible(false), 950));
      return () => timers.forEach(window.clearTimeout);
    }

    timers.push(window.setTimeout(() => {
      setCounting(true);
      const startedAt = performance.now();
      const duration = 1650;

      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayedBalance(previousBalanceEgp + (newBalanceEgp - previousBalanceEgp) * eased);

        if (progress < 1) {
          frame = window.requestAnimationFrame(tick);
          return;
        }

        setDisplayedBalance(newBalanceEgp);
        setCounting(false);
        setCompleted(true);
        timers.push(window.setTimeout(() => setVisible(false), 1050));
      };

      frame = window.requestAnimationFrame(tick);
    }, 720));

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      timers.forEach(window.clearTimeout);
    };
  }, [newBalanceEgp, previousBalanceEgp]);

  if (!visible || !mounted) return null;

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="تحديث رصيد محفظة DevPlay">
      <div className={styles.ambient} aria-hidden="true" />
      <section className={styles.wallet} data-counting={counting} data-completed={completed}>
        <header>
          <span><WalletCards size={20} /></span>
          <div dir="ltr"><strong>DEVPLAY</strong><small>WALLET</small></div>
          <ShieldCheck size={18} />
        </header>

        <div className={styles.balance}>
          <small>{completed ? "رصيدك الحالي" : "جاري تحديث رصيدك"}</small>
          <strong dir="ltr">{formatEgp(displayedBalance)}</strong>
        </div>

        <div className={styles.deduction} aria-label={"المبلغ المخصوم " + formatEgp(deductedAmountEgp)}>
          <span>المبلغ المخصوم</span>
          <strong dir="ltr">− {formatEgp(deductedAmountEgp)}</strong>
        </div>

        <footer>
          <span className={styles.chip} aria-hidden="true"><i /><i /><i /><i /></span>
          <small>عملية آمنة داخل DevPlay</small>
        </footer>

        {completed && (
          <div className={styles.success} role="status" aria-live="polite">
            <span><Check size={24} /></span>
            <strong>{successMessage}</strong>
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}
