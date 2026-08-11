"use client";

import { MessageCircle } from "lucide-react";

import styles from "./WhatsAppSupport.module.css";

const SUPPORT_NUMBER = "201035966569";

export function WhatsAppSupport() {
  const message = encodeURIComponent(
    "أهلًا، واجهتني مشكلة في موقع DevPlay Top Up وأحتاج مساعدة.",
  );

  return (
    <a
      className={styles.button}
      href={`https://wa.me/${SUPPORT_NUMBER}?text=${message}`}
      target="_blank"
      rel="noreferrer"
      aria-label="التواصل مع خدمة العملاء عبر واتساب"
      title="خدمة العملاء"
    >
      <MessageCircle size={25} />
    </a>
  );
}