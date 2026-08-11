"use client";

import { Headphones, Lightbulb, LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import styles from "./support.module.css";

export function SupportClient() {
  const router = useRouter();
  const [category, setCategory] = useState("other");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function send() {
    setResult("");
    setSuccess(false);
    if (subject.trim().length < 3 || message.trim().length < 5) {
      setResult("اكتبي عنوانًا واضحًا وتفاصيل المشكلة أو الاقتراح.");
      return;
    }
    setLoading(true);
    const { data, error } = await createClient().rpc("create_support_ticket", {
      p_category: category,
      p_subject: subject.trim(),
      p_message: message.trim(),
    });
    setLoading(false);
    if (error) {
      setResult(error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    setSuccess(true);
    setResult(`تم إرسال التذكرة ${row.ticket_id} بنجاح. سنرسل لك إشعارًا عند الرد.`);
    setSubject("");
    setMessage("");
    router.refresh();
  }

  return (
    <section className={styles.formCard}>
      <div className={styles.formHeading}>
        <span><Headphones size={21} /></span>
        <div>
          <small>DEVPLAY SUPPORT</small>
          <h2>كيف يمكننا مساعدتك؟</h2>
          <p>اكتبي التفاصيل بوضوح وسنربط التذكرة بحسابك وطلباتك لتسريع الحل.</p>
        </div>
      </div>

      <div className={styles.suggestion}>
        <Lightbulb size={17} />
        <p><strong>اقتراح:</strong> أضيفي رقم الطلب أو الإيداع داخل التفاصيل إن كانت المشكلة مرتبطة بعملية محددة.</p>
      </div>

      <label className={styles.field}>
        <span>نوع المشكلة</span>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="deposit">إضافة رصيد</option>
          <option value="order">طلب أو كود</option>
          <option value="wallet">المحفظة والتحويل</option>
          <option value="account">الحساب</option>
          <option value="suggestion">اقتراح تطوير</option>
          <option value="other">مشكلة أخرى</option>
        </select>
      </label>

      <label className={styles.field}>
        <span>عنوان مختصر</span>
        <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} placeholder="مثال: الرصيد لم يظهر بعد التحويل" />
      </label>

      <label className={styles.field}>
        <span>تفاصيل المشكلة أو الاقتراح</span>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={3000} placeholder="اشرحي ما حدث، ووقت المشكلة، ورقم العملية إن وجد..." />
        <small>{message.length.toLocaleString("ar-EG")} / ٣٠٠٠</small>
      </label>

      {result && <p className={success ? styles.success : styles.error}>{result}</p>}

      <button className={styles.submit} type="button" onClick={send} disabled={loading}>
        {loading ? <LoaderCircle className={styles.spinner} size={18} /> : <Send size={18} />}
        {loading ? "جاري إرسال التذكرة" : "إرسال لخدمة العملاء"}
      </button>
    </section>
  );
}
