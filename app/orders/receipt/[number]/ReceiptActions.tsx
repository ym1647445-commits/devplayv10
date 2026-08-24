"use client";

import { Download, FileImage, Printer } from "lucide-react";

interface Props { orderNumber:string; title:string; totalEgp:string; status:string; createdAt:string }

function escapeXml(value:string){return value.replace(/[<>&'\"]/g,char=>({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[char]??char))}

export function ReceiptActions(props:Props){
  function saveImage(){
    const lines=["DevPlay Top Up",`فاتورة ${props.orderNumber}`,props.title,`الإجمالي: ${props.totalEgp}`,`الحالة: ${props.status}`,props.createdAt];
    const text=lines.map((line,index)=>`<text x="540" y="${125+index*58}" text-anchor="end" fill="${index===0?'#a78bfa':'#f7f5ff'}" font-size="${index===0?34:24}" font-family="Arial" direction="rtl">${escapeXml(line)}</text>`).join("");
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="520" viewBox="0 0 600 520"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#090713"/><stop offset="1" stop-color="#17102a"/></linearGradient></defs><rect width="600" height="520" rx="34" fill="url(#g)"/><rect x="28" y="28" width="544" height="464" rx="25" fill="none" stroke="#7c3aed" stroke-width="2"/>${text}<text x="540" y="460" text-anchor="end" fill="#8b849b" font-size="16" font-family="Arial">devplaystudio.com • Shahd Elbary</text></svg>`;
    const url=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml;charset=utf-8"}));
    const anchor=document.createElement("a");anchor.href=url;anchor.download=`${props.orderNumber}.svg`;anchor.click();URL.revokeObjectURL(url);
  }
  return <div className="receipt-actions">
    <button type="button" onClick={()=>window.print()}><Printer size={16}/> حفظ PDF / طباعة</button>
    <button type="button" onClick={saveImage}><FileImage size={16}/> حفظ كصورة</button>
    <a href="/orders"><Download size={16}/> كل الطلبات</a>
  </div>
}
