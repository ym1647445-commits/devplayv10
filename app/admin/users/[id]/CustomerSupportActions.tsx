"use client";

import { CalendarHeart, CircleMinus, CirclePlus, LoaderCircle, WalletCards } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { adjustAdminUserWallet, updateAdminUserBirthDate } from "../actions";
import styles from "./customer.module.css";

export function CustomerSupportActions({userId,birthDate}:{userId:string;birthDate:string|null}) {
  const router=useRouter();
  const [direction,setDirection]=useState<"credit"|"debit">("credit");
  const [amount,setAmount]=useState(""); const [reason,setReason]=useState("");
  const [newBirthDate,setNewBirthDate]=useState(birthDate??""); const [birthReason,setBirthReason]=useState("");
  const [message,setMessage]=useState<{ok:boolean;text:string}|null>(null);
  const [birthMessage,setBirthMessage]=useState<{ok:boolean;text:string}|null>(null);
  const [pending,startTransition]=useTransition(); const [birthPending,startBirthTransition]=useTransition();

  function submitWallet(){const value=Number(amount);setMessage(null);startTransition(async()=>{const result=await adjustAdminUserWallet({userId,direction,amountUsd:value,reason});setMessage({ok:result.success,text:result.message});if(result.success){setAmount("");setReason("");router.refresh();}})}
  function submitBirthDate(){setBirthMessage(null);startBirthTransition(async()=>{const result=await updateAdminUserBirthDate({userId,birthDate:newBirthDate,reason:birthReason});setBirthMessage({ok:result.success,text:result.message});if(result.success){setBirthReason("");router.refresh();}})}

  return <>
    <section className={styles.actionPanel}><header><span><WalletCards size={18}/></span><div><strong>تصحيح رصيد المحفظة</strong><small>كل تعديل ينشئ حركة محفظة وإشعارًا وسجل نشاط.</small></div></header><div className={styles.direction}><button type="button" className={direction==="credit"?styles.active:""} onClick={()=>setDirection("credit")}><CirclePlus size={15}/> إضافة رصيد</button><button type="button" className={direction==="debit"?styles.activeDanger:""} onClick={()=>setDirection("debit")}><CircleMinus size={15}/> خصم رصيد</button></div><label><span>القيمة بالدولار</span><input type="number" min="0.0001" step="0.0001" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" dir="ltr"/></label><label><span>سبب التصحيح</span><textarea value={reason} maxLength={300} onChange={e=>setReason(e.target.value)} placeholder="مثال: تحويل مؤكد لم يُضف تلقائيًا"/></label>{message&&<p className={message.ok?styles.success:styles.error}>{message.text}</p>}<button className={styles.submit} type="button" disabled={pending||!amount||reason.trim().length<3} onClick={submitWallet}>{pending?<LoaderCircle className={styles.spinner} size={17}/>:direction==="credit"?<CirclePlus size={17}/>:<CircleMinus size={17}/>} تأكيد وتسجيل الحركة</button></section>
    <section className={styles.actionPanel}><header><span><CalendarHeart size={18}/></span><div><strong>تصحيح تاريخ الميلاد</strong><small>التاريخ الحالي: {birthDate??"غير مسجل"}. التغيير إداري ويُحفظ في سجل النشاط.</small></div></header><label><span>تاريخ الميلاد الصحيح</span><input type="date" value={newBirthDate} max={new Date().toISOString().slice(0,10)} onChange={e=>setNewBirthDate(e.target.value)} dir="ltr"/></label><label><span>سبب التصحيح</span><textarea value={birthReason} maxLength={300} onChange={e=>setBirthReason(e.target.value)} placeholder="مثال: العميل أدخل اليوم والشهر بصورة عكسية وتحقق الدعم من التاريخ"/></label>{birthMessage&&<p className={birthMessage.ok?styles.success:styles.error}>{birthMessage.text}</p>}<button className={styles.submit} type="button" disabled={birthPending||!newBirthDate||birthReason.trim().length<5} onClick={submitBirthDate}>{birthPending?<LoaderCircle className={styles.spinner} size={17}/>:<CalendarHeart size={17}/>} تصحيح التاريخ وتسجيل السبب</button></section>
  </>;
}
