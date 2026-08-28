"use client";

import { ChevronDown, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { BalanceRush } from "./BalanceRush";
import { GameOrbit, type OrbitProduct } from "./GameOrbit";
import { IntroFinale } from "./IntroFinale";
import { SkinEvolution } from "./SkinEvolution";
import styles from "./CinematicIntro.module.css";

export type IntroProduct = OrbitProduct;

export function CinematicIntro({ products }: { products: IntroProduct[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let active = true;
    const reduceMotion = () =>
      document.documentElement.dataset.reduceMotion === "true" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const update = () => {
      frameRef.current = null;
      if (!active) return;
      const rect = section.getBoundingClientRect();
      const distance = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = reduceMotion() ? 0.72 : Math.min(1, Math.max(0, -rect.top / distance));
      section.style.setProperty("--scene-progress", progress.toFixed(4));
    };

    const requestUpdate = () => {
      if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      if (active) requestUpdate();
    }, { rootMargin: "120px 0px" });

    observer.observe(section);
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    update();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <main className={styles.page}>
      <Link className={styles.skip} href="/">تخطي المقدمة</Link>
      <section className={styles.scene} ref={sectionRef} aria-label="مقدمة DevPlay السينمائية">
        <div className={styles.sticky}>
          <div className={styles.noise} aria-hidden="true" />
          <div className={styles.glow} aria-hidden="true" />

          <div className={styles.content}>
            <GameOrbit products={products} />
            <div className={styles.title}>
              <span><Sparkles /> DEVPLAY GAME ORBIT</span>
              <h1>اشحن ألعابك</h1>
              <p>كل منتجات DevPlay تدور حول تجربة واحدة.</p>
            </div>
          </div>
          <div className={styles.scrollHint} aria-hidden="true">
            <span>مرّري لإكمال المشهد</span>
            <ChevronDown />
          </div>
        </div>
      </section>
      <BalanceRush />
      <SkinEvolution />
      <IntroFinale />
    </main>
  );
}
