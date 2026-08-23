"use client";

import { Bot, ExternalLink, MessageCircle, Send, Sparkles } from "lucide-react";
import styles from "./support.module.css";

const whatsappMessage = encodeURIComponent("مرحبًا فريق DevPlay، أحتاج مساعدة بخصوص حسابي أو طلبي.");

export function SupportChannels() {
  function openAi() {
    window.dispatchEvent(new CustomEvent("devplay:open-ai"));
  }

  return <section className={styles.channels} aria-label="قنوات دعم DevPlay">
    <a className={styles.whatsapp} href={`https://wa.me/201035966569?text=${whatsappMessage}`} target="_blank" rel="noreferrer"><span><MessageCircle size={22}/></span><div><small>رد مباشر</small><strong>WhatsApp</strong><p>+20 103 596 6569</p></div><ExternalLink size={16}/></a>
    <a className={styles.telegram} href="https://t.me/DevPlaySupport" target="_blank" rel="noreferrer"><span><Send size={22}/></span><div><small>الدعم الرسمي</small><strong>Telegram Support</strong><p>@DevPlaySupport</p></div><ExternalLink size={16}/></a>
    <a className={styles.telegramBot} href="https://t.me/DevPlaySupportBot" target="_blank" rel="noreferrer"><span><Bot size={22}/></span><div><small>متاح دائمًا</small><strong>Telegram Bot</strong><p>@DevPlaySupportBot</p></div><ExternalLink size={16}/></a>
    <button className={styles.aiChannel} type="button" onClick={openAi}><span><Sparkles size={22}/></span><div><small>مساعد الموقع</small><strong>DevPlay AI</strong><p>افتح محادثة ذكية الآن</p></div><ExternalLink size={16}/></button>
  </section>;
}
