"use client";

import { ExternalLink, LoaderCircle, Send, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { requestCodeRedemption } from "@/app/orders/actions";
import type { CustomerOrderHistoryItem } from "@/types/orderHistory";

import styles from "./CodeRedemptionPanel.module.css";

export function CodeRedemptionPanel({ orderId, config }: {
  orderId: string;
  config: NonNullable<CustomerOrderHistoryItem["codeRedemption"]>;
}) {
  const [accountIdentifier, setAccountIdentifier] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [result, setResult] = useState<{ success: boolean; message: string; ticketId?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (pending) return;
    setResult(null);
    startTransition(async () => setResult(await requestCodeRedemption({ orderId, accountIdentifier, customerNote })));
  }

  return <section className={styles.panel}>
    <header><ShieldCheck size={17}/><div><strong>استرداد الكود</strong><p>استخدمي الطريقة المناسبة لهذه الباقة بعد استلام الكود.</p></div></header>
    {config.steps.length > 0 && <div className={styles.instructions}><strong>خطوات الاسترداد</strong><ol>{config.steps.map((step,index)=><li key={`${index}-${step}`}><span>{index+1}</span><p>{step}</p></li>)}</ol></div>}
    {config.url && <a className={styles.primaryButton} href={config.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> فتح موقع الاسترداد الرسمي</a>}
    {config.assistedEnabled && <div className={styles.form}>
      <label><span>{config.accountLabel}</span><input value={accountIdentifier} onChange={(event)=>setAccountIdentifier(event.target.value)} placeholder={config.accountPlaceholder} autoComplete="off"/></label>
      <label><span>ملاحظة إضافية (اختياري)</span><textarea rows={3} value={customerNote} onChange={(event)=>setCustomerNote(event.target.value)} placeholder="مثال: السيرفر أو المنطقة وأي تفاصيل تساعدنا في التنفيذ"/></label>
      <p className={styles.safety}>لا ترسلي كلمة مرور حسابك. الإدارة تحتاج المعرّف أو رابط الحساب فقط.</p>
      <button type="button" className={styles.primaryButton} disabled={pending || accountIdentifier.trim().length < 2} onClick={submit}>{pending?<LoaderCircle size={15} className={styles.spin}/>:<Send size={15}/>} طلب تنفيذ الكود بواسطة DevPlay</button>
      {result && <div className={result.success?styles.success:styles.error}>{result.message}{result.ticketId&&<Link href={`/support?ticket=${result.ticketId}`}>فتح المحادثة</Link>}</div>}
    </div>}
  </section>;
}
