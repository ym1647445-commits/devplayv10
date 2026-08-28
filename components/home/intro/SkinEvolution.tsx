"use client";

import { ChevronDown, Sparkles } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";

import styles from "./CinematicIntro.module.css";

const skins = [
  { src: "/intro/battle-royale-hero-v1-cutout-v2.png", name: "Original", className: styles.skinOriginal },
  { src: "/intro/battle-royale-skin-cyber-cutout-v2.png", name: "Cyber Neon", className: styles.skinCyber },
  { src: "/intro/battle-royale-skin-desert-cutout-v2.png", name: "Desert Gold", className: styles.skinDesert },
  { src: "/intro/battle-royale-skin-frost-cutout-v2.png", name: "Frost Elite", className: styles.skinFrost },
];

export function SkinEvolution() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reduceMotion = () =>
      document.documentElement.dataset.reduceMotion === "true" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const update = () => {
      frameRef.current = null;
      const rect = section.getBoundingClientRect();
      const distance = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = reduceMotion() ? 1 : Math.min(1, Math.max(0, -rect.top / distance));
      const peak = (center: number, width = 0.27) => Math.max(0, 1 - Math.abs(progress - center) / width);
      section.style.setProperty("--skin-progress", progress.toFixed(4));
      section.style.setProperty("--skin-original", peak(0.03, 0.2).toFixed(4));
      section.style.setProperty("--skin-cyber", peak(0.31).toFixed(4));
      section.style.setProperty("--skin-desert", peak(0.59).toFixed(4));
      section.style.setProperty("--skin-frost", Math.min(1, Math.max(0, (progress - 0.72) / 0.18)).toFixed(4));
    };
    const requestUpdate = () => {
      if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <section className={styles.skinScene} ref={sectionRef} aria-label="تطور أسكنات DevPlay">
      <div className={styles.skinSticky}>
        <div className={styles.skinAura} aria-hidden="true" />
        <div className={styles.skinCopy}>
          <span><Sparkles /> DEVPLAY SKIN EVOLUTION</span>
          <h2>غيّري شكل اللعبة<br />بطريقتك</h2>
          <p>مع DevPlay، اشتري كل الأسكنات اللي نفسك فيها.</p>
          <div className={styles.skinNames} aria-label="الأسكنات المعروضة">
            {skins.map((skin, index) => <span key={skin.name} data-skin={index}>{skin.name}</span>)}
          </div>
        </div>
        <div className={styles.characterStage} aria-hidden="true">
          {skins.map((skin) => (
            <Image key={skin.name} className={`${styles.skinCharacter} ${skin.className}`} src={skin.src} alt="" fill sizes="(max-width: 720px) 78vw, 46vw" />
          ))}
          <div className={styles.characterFloor} />
        </div>
        <div className={styles.skinFooter}>
          <ChevronDown aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}