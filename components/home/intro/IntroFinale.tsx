import { ArrowLeft, LogIn, Play } from "lucide-react";
import Link from "next/link";

import styles from "./CinematicIntro.module.css";

export function IntroFinale() {
  return (
    <section className={styles.finale} aria-label="ابدأ استخدام DevPlay">
      <div className={styles.finaleGlow} aria-hidden="true" />
      <div className={styles.finaleBrand} aria-label="DevPlay">DEVPLAY</div>
      <div className={styles.finaleCopy}>
        <span>جاهز تبدأ؟</span>
        <h2>عالم ألعابك<br />في مكان واحد</h2>
      </div>
      <div className={styles.finaleActions}>
        <Link className={styles.primaryFinale} href="/"><Play /> ابدأ الآن <ArrowLeft /></Link>
        <Link className={styles.secondaryFinale} href="/auth"><LogIn /> سجل الدخول</Link>
      </div>
    </section>
  );
}