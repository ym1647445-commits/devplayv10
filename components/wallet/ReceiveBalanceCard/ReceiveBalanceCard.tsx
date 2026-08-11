"use client";
import { Check, Copy, QrCode, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect,useMemo,useState } from "react";
import styles from "./ReceiveBalanceCard.module.css";
export function ReceiveBalanceCard({customerId}:{customerId:string}){
 const[amount,setAmount]=useState("");const[qr,setQr]=useState("");const[copied,setCopied]=useState(false);
 const link=useMemo(()=>{const base=typeof window==="undefined"?"":window.location.origin;const q=new URLSearchParams({to:customerId});if(Number(amount)>0)q.set("amount",Number(amount).toFixed(2));return `${base}/wallet/transfer?${q}`},[amount,customerId]);
 useEffect(()=>{if(link)QRCode.toDataURL(link,{width:420,margin:2,color:{dark:"#171128",light:"#ffffff"}}).then(setQr)},[link]);
 async function copy(){await navigator.clipboard.writeText(link);setCopied(true);setTimeout(()=>setCopied(false),1500)}
 async function share(){if(navigator.share)await navigator.share({title:"إرسال رصيد DevPlay",text:`أرسل رصيدًا إلى ${customerId}`,url:link});else await copy()}
 return <section className={styles.card}><div className={styles.heading}><span><QrCode size={22}/></span><div><h2>استلام رصيد</h2><p>شاركي الرابط أو QR. سيُفتح التحويل والـID والمبلغ جاهزان للمُرسل.</p></div></div><label><span>مبلغ مطلوب - اختياري</span><div><input type="number" min="0.10" max="1000" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="مثال: 5"/><strong>USD</strong></div></label>{qr&&<img className={styles.qr} src={qr} alt={`QR لاستلام رصيد على ${customerId}`}/>}<div className={styles.id}><span>Customer ID</span><strong>{customerId}</strong></div><div className={styles.actions}><button onClick={copy} type="button">{copied?<Check size={17}/>:<Copy size={17}/>} {copied?"تم النسخ":"نسخ الرابط"}</button><button onClick={share} type="button"><Share2 size={17}/>مشاركة</button></div><small>راجعي المبلغ مع المُرسل. التحويل لا يتم بمجرد فتح الرابط؛ يجب عليه التأكيد.</small></section>
}
