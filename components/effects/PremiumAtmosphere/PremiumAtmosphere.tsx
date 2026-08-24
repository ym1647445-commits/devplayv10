"use client";

import { useEffect, useRef } from "react";
import styles from "./PremiumAtmosphere.module.css";

export function PremiumAtmosphere() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const updateGlow = (event: PointerEvent) => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        layer.style.setProperty("--glow-x", `${event.clientX}px`);
        layer.style.setProperty("--glow-y", `${event.clientY}px`);
      });
    };
    window.addEventListener("pointermove", updateGlow, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", updateGlow);
    };
  }, []);

  return <div ref={layerRef} className={styles.atmosphere} aria-hidden="true">
    <span className={styles.orbOne}/><span className={styles.orbTwo}/>
    <span className={styles.orbThree}/><span className={styles.pointerGlow}/>
    <span className={styles.grain}/>
  </div>;
}
