"use client";

import {
  Eye,
  EyeOff,
  Gamepad2,
  Headphones,
  Heart,
  MoreHorizontal,
  PackageSearch,
  Plus,
  Send,
  TicketPercent,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "./AuthenticatedWalletHero.module.css";

interface AuthenticatedWalletHeroProps {
  balanceEgp: number;
  balanceUsd: number;
  firstName: string | null;
}

const moreActions = [
  { label: "المحفظة", href: "/wallet", icon: WalletCards },
  { label: "طلباتي", href: "/orders", icon: PackageSearch },
  { label: "الكوبونات", href: "/coupons", icon: TicketPercent },
  { label: "المفضلة", href: "/favorites", icon: Heart },
  { label: "الدعم", href: "/support", icon: Headphones },
];

function formatBalance(value: number, digits = 2) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function AuthenticatedWalletHero({
  balanceEgp,
  balanceUsd,
  firstName,
}: AuthenticatedWalletHeroProps) {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBalanceVisible(
        window.localStorage.getItem("devplay-home-balance-visible") !== "false",
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!moreOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [moreOpen]);

  function toggleBalance() {
    setBalanceVisible((current) => {
      const next = !current;
      window.localStorage.setItem(
        "devplay-home-balance-visible",
        String(next),
      );
      return next;
    });
  }

  return (
    <section className={styles.hero} aria-label="ملخص محفظة DevPlay">
      <div className={styles.glow} aria-hidden="true" />

      <header className={styles.header}>
        <span><i /> DEVPLAY WALLET</span>
        {firstName && <small>أهلًا {firstName}</small>}
      </header>

      <div className={styles.balanceBlock}>
        <div className={styles.balanceLabel}>
          <span>إجمالي الرصيد</span>
          <button
            type="button"
            onClick={toggleBalance}
            aria-label={balanceVisible ? "إخفاء الرصيد" : "إظهار الرصيد"}
            aria-pressed={!balanceVisible}
          >
            {balanceVisible ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>

        <strong className={styles.mainBalance} dir="ltr">
          {balanceVisible ? (
            <>{formatBalance(balanceEgp)} <em>EGP</em></>
          ) : (
            "••••••"
          )}
        </strong>

        <span className={styles.usdBalance} dir="ltr">
          ≈ {balanceVisible ? <><b>$</b>{formatBalance(balanceUsd)}</> : "••••••"} USD
        </span>
      </div>

      <nav className={styles.quickActions} aria-label="إجراءات المحفظة السريعة">
        <Link href="/wallet/deposit"><span><Plus /></span><strong>إضافة رصيد</strong></Link>
        <Link href="/wallet/transfer"><span><Send /></span><strong>إرسال</strong></Link>
        <Link href="/products"><span><Gamepad2 /></span><strong>اشحن</strong></Link>
        <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-expanded={moreOpen}>
          <span><MoreHorizontal /></span><strong>المزيد</strong>
        </button>
      </nav>

      {moreOpen && (
        <>
          <button
            className={styles.backdrop}
            type="button"
            aria-label="إغلاق قائمة المزيد"
            onClick={() => setMoreOpen(false)}
          />
          <section
            className={styles.actionSheet}
            role="dialog"
            aria-modal="true"
            aria-label="المزيد من خدمات DevPlay"
          >
            <header>
              <div><small>اختصارات حسابك</small><strong>المزيد</strong></div>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="إغلاق"><X /></button>
            </header>
            <nav>
              {moreActions.map(({ label, href, icon: Icon }) => (
                <Link href={href} onClick={() => setMoreOpen(false)} key={href}>
                  <span><Icon /></span><strong>{label}</strong>
                </Link>
              ))}
            </nav>
          </section>
        </>
      )}
    </section>
  );
}
