"use client";

import { Gamepad2, Gem, Sparkles, Target } from "lucide-react";
import { useEffect, useRef } from "react";

import styles from "./CinematicIntro.module.css";

const counters = [
  { label: "رصيد PUBG", unit: "UC", max: 16200, icon: Target, className: "counterPubg" },
  { label: "رصيد Free Fire", unit: "ماس", max: 5600, icon: Gem, className: "counterFreeFire" },
  { label: "رصيد Call of Duty", unit: "CD", max: 10800, icon: Gamepad2, className: "counterCod" },
] as const;

export function BalanceRush() {
  const sectionRef = useRef<HTMLElement>(null);
  const valueRefs = useRef<Array<HTMLElement | null>>([]);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const formatter = new Intl.NumberFormat("en-US");
    const reduceMotion = () =>
      document.documentElement.dataset.reduceMotion === "true" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const update = () => {
      frameRef.current = null;
      const rect = section.getBoundingClientRect();
      const distance = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = reduceMotion() ? 1 : Math.min(1, Math.max(0, -rect.top / distance));
      const eased = 1 - Math.pow(1 - progress, 3);
      section.style.setProperty("--balance-progress", progress.toFixed(4));
      counters.forEach((counter, index) => {
        const staggered = Math.min(1, Math.max(0, progress * 1.35 - index * 0.12));
        const value = Math.round(counter.max * (1 - Math.pow(1 - staggered, 3)));
        if (valueRefs.current[index]) valueRefs.current[index]!.textContent = formatter.format(value);
      });
      section.style.setProperty("--balance-eased", eased.toFixed(4));
    };
    const requestUpdate = () => {
      if (frameRef.current === null) frameRef.current = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <section className={styles.balanceScene} ref={sectionRef} aria-label="زود رصيد ألعابك">
      <div className={styles.balanceSticky}>
        <div className={styles.balanceGlow} aria-hidden="true" />
        <header className={styles.balanceTitle}>
          <span><Sparkles /> DEVPLAY BALANCE RUSH</span>
          <h2>زود رصيدك</h2>
          <p>كل Scroll يقربك من شحنتك الجديدة.</p>
        </header>
        <div className={styles.counterGrid}>
          {counters.map((counter, index) => {
            const Icon = counter.icon;
            return (
              <article className={styles[counter.className]} key={counter.label}>
                <Icon aria-hidden="true" />
                <span>{counter.label}</span>
                <div><strong ref={(node) => { valueRefs.current[index] = node; }}>0</strong><b>{counter.unit}</b></div>
                <i aria-hidden="true"><span /></i>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}