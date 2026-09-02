"use client";

import { RotateCw, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { type PointerEvent, useRef, useState } from "react";

import styles from "./WalletCard.module.css";

interface WalletCardProps {
  balanceEgp: number;
  balanceUsd: number;
  customerId: string;
  fullName: string;
  isFrozen: boolean;
}

function formatBalance(value: number, currency: "EGP" | "USD") {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: currency === "EGP" ? 2 : 4,
  }).format(value);
}

function BalanceDisplay({ balanceEgp, balanceUsd }: Pick<WalletCardProps, "balanceEgp" | "balanceUsd">) {
  return (
    <div className={styles.balance} aria-label={`الرصيد الحالي ${formatBalance(balanceEgp, "EGP")}`}>
      <small>الرصيد الحالي</small>
      <strong dir="ltr">{formatBalance(balanceEgp, "EGP")}</strong>
      <span dir="ltr">{formatBalance(balanceUsd, "USD")}</span>
    </div>
  );
}

export function WalletCard({ balanceEgp, balanceUsd, customerId, fullName, isFrozen }: WalletCardProps) {
  const [flipped, setFlipped] = useState(false);
  const cardRef = useRef<HTMLButtonElement>(null);

  function motionReduced() {
    return document.documentElement.dataset.reduceMotion === "true" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse" || motionReduced() || flipped) return;
    const card = cardRef.current;
    if (!card) return;
    const bounds = card.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    card.style.setProperty("--tilt-x", `${(-y * 5).toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${(x * 7).toFixed(2)}deg`);
    card.style.setProperty("--glare-x", `${((x + 0.5) * 100).toFixed(1)}%`);
    card.style.setProperty("--glare-y", `${((y + 0.5) * 100).toFixed(1)}%`);
  }

  function resetTilt() {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <section className={styles.hero} aria-label="بطاقة محفظة DevPlay">
      <button
        ref={cardRef}
        type="button"
        className={styles.cardButton}
        data-flipped={flipped}
        aria-pressed={flipped}
        aria-label={flipped ? "إظهار وجه بطاقة المحفظة" : "إظهار ظهر بطاقة المحفظة"}
        onClick={() => {
          resetTilt();
          setFlipped((current) => !current);
        }}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
        onBlur={resetTilt}
      >
        <span className={styles.card}>
          <span className={`${styles.face} ${styles.front}`} aria-hidden={flipped}>
            <span className={styles.brand} dir="ltr">
              <b>DEVPLAY</b>
              <small>WALLET</small>
            </span>
            <span className={styles.walletIcon}><WalletCards size={21} /></span>
            <span className={styles.chip} aria-hidden="true"><i /><i /><i /><i /></span>
            <BalanceDisplay balanceEgp={balanceEgp} balanceUsd={balanceUsd} />
            <span className={styles.holder}>
              <small>صاحب المحفظة</small>
              <strong>{fullName}</strong>
            </span>
            <span className={styles.customer}>
              <small>Customer ID</small>
              <strong dir="ltr">{customerId}</strong>
            </span>
          </span>

          <span className={`${styles.face} ${styles.back}`} aria-hidden={!flipped}>
            <span className={styles.backGlow} />
            <span className={styles.backBrand} dir="ltr"><Sparkles size={16} /> DEVPLAY WALLET</span>
            <span className={styles.backContent}>
              <span className={styles.backIcon}><WalletCards size={25} /></span>
              <strong>محفظة DEVPLAY</strong>
              <p>رصيدك الآمن للدفع وشراء خدماتك داخل المنصة فقط.</p>
            </span>
            <span className={styles.status} data-frozen={isFrozen}>
              <ShieldCheck size={15} />
              <span><small>حالة المحفظة</small><b>{isFrozen ? "مجمّدة مؤقتًا" : "نشطة ومحمية"}</b></span>
            </span>
            <span className={styles.backCustomer}><small>Customer ID</small><b dir="ltr">{customerId}</b></span>
          </span>
        </span>
      </button>

      <button className={styles.flipHint} type="button" onClick={() => setFlipped((current) => !current)}>
        <RotateCw size={13} aria-hidden="true" />
        اضغط واقلب
      </button>
    </section>
  );
}
