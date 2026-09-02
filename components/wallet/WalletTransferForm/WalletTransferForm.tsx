"use client";

import { CheckCircle2, LoaderCircle, Send, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";
import { WalletTransactionAnimation } from "@/components/wallet/WalletTransactionAnimation";
import styles from "./WalletTransferForm.module.css";

interface Props { balanceUsd: number; usdRate: number; initialCustomerId?:string; initialAmount?:string }
interface Result { transfer_id:string; amount_usd:number; recipient_customer_id:string; recipient_name:string; balance_after_usd:number }

export function WalletTransferForm({ balanceUsd, usdRate, initialCustomerId="", initialAmount="" }: Props) {
  const [customerId,setCustomerId]=useState(initialCustomerId);
  const [amount,setAmount]=useState(initialAmount);
  const [note,setNote]=useState("");
  const [confirmed,setConfirmed]=useState(false);
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [result,setResult]=useState<Result|null>(null);
  const value=Number(amount);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setMessage(null);
    if(!/^DP-\d{6,}$/i.test(customerId.trim())){setMessage("اكتبي Customer ID صحيحًا مثل DP-000001.");return}
    if(!Number.isFinite(value)||value<0.1||value>1000){setMessage("المبلغ يجب أن يكون بين 0.10 و1000 دولار.");return}
    if(value>balanceUsd){setMessage("رصيد المحفظة غير كافٍ.");return}
    if(!confirmed){setMessage("راجعي البيانات ثم فعّلي تأكيد التحويل.");return}
    setLoading(true);
    try{
      const {data,error}=await createClient().rpc("transfer_customer_wallet_balance",{p_recipient_customer_id:customerId.trim().toUpperCase(),p_amount_usd:value,p_note:note.trim()||null});
      if(error)throw error;
      setResult((Array.isArray(data)?data[0]:data) as Result);
    }catch(error){
      const details = error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "تعذر إرسال الرصيد.";
      setMessage(/PLATFORM_MAINTENANCE|WALLET_TRANSFERS_PAUSED/i.test(details)?"تحويلات المحفظة متوقفة مؤقتًا.":details);
    }
    finally{setLoading(false)}
  }

  if(result)return <section className={styles.success}><WalletTransactionAnimation previousBalanceEgp={(Number(result.balance_after_usd)+Number(result.amount_usd))*usdRate} newBalanceEgp={Number(result.balance_after_usd)*usdRate} deductedAmountEgp={Number(result.amount_usd)*usdRate} successMessage="تم إرسال الرصيد بنجاح"/><CheckCircle2 size={38}/><small>تم التحويل بنجاح</small><h1>${Number(result.amount_usd).toFixed(2)}</h1><p>تم إرسال الرصيد إلى <strong>{result.recipient_customer_id}</strong>. رصيدك الحالي ${Number(result.balance_after_usd).toFixed(4)}.</p><div><Link href="/wallet/transactions">عرض سجل العمليات</Link><Link href="/wallet">العودة للمحفظة</Link></div></section>;

  return <form className={styles.form} onSubmit={submit}>
    <section className={styles.card}><div className={styles.heading}><span><Send size={20}/></span><div><h2>بيانات المستلم</h2><p>اطلبي من المستلم Customer ID الظاهر في حسابه. لا نستخدم البريد أو رقم الهاتف.</p></div></div><label><span>Customer ID</span><input value={customerId} onChange={e=>setCustomerId(e.target.value.toUpperCase())} placeholder="DP-000001" autoCapitalize="characters" maxLength={20}/></label></section>
    <section className={styles.card}><div className={styles.heading}><span>2</span><div><h2>قيمة التحويل</h2><p>الرصيد ينتقل بالدولار فورًا ولا توجد رسوم حاليًا.</p></div></div><label><span>المبلغ بالدولار</span><div className={styles.amount}><input type="number" min="0.10" max="1000" step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="مثال: 5"/><strong>USD</strong></div></label>{value>0&&<div className={styles.summary}><span>يعادل تقريبًا</span><strong>{(value*usdRate).toLocaleString("ar-EG",{maximumFractionDigits:2})} ج.م</strong></div>}<label><span>ملاحظة اختيارية</span><textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={200} placeholder="مثال: هدية بسيطة"/></label></section>
    <label className={styles.confirm}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span><strong>راجعت Customer ID والمبلغ</strong><small>التحويل فوري، لذلك تأكدي من هوية المستلم قبل الإرسال.</small></span></label>
    {message&&<p className={styles.error}>{message}</p>}
    <button className={styles.submit} disabled={loading} type="submit">{loading?<LoaderCircle className={styles.spinner} size={18}/>:<ShieldCheck size={18}/>} {loading?"جاري تأمين التحويل":"تأكيد وإرسال الرصيد"}</button>
  </form>;
}
