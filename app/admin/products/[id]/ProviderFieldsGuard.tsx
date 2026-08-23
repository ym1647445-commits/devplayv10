"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export function ProviderFieldsGuard(){
  const {id}=useParams<{id:string}>();
  const [managed,setManaged]=useState(false);
  useEffect(()=>{
    let cancelled=false;
    fetch(`/api/admin/products/${encodeURIComponent(id)}/provider-field-mode`)
      .then((response)=>response.ok?response.json():Promise.reject())
      .then((payload)=>{if(!cancelled)setManaged(Boolean(payload.providerManaged))})
      .catch(()=>{});
    return()=>{cancelled=true};
  },[id]);
  useEffect(()=>{
    if(!managed)return;
    const hide=()=>{
      for(const strong of document.querySelectorAll("section strong")){
        if(strong.textContent?.includes("البيانات المطلوبة لكل باقات المنتج")){
          const section=strong.closest("section") as HTMLElement|null;
          if(section)section.style.display="none";
        }
      }
    };
    hide();const observer=new MutationObserver(hide);observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[managed]);
  if(!managed)return null;
  return <aside style={{display:"flex",alignItems:"center",gap:8,margin:"12px 18px",padding:"11px 13px",border:"1px solid var(--primary-border)",borderRadius:12,background:"var(--primary-soft)",color:"var(--foreground)",direction:"rtl",fontSize:11}}><ShieldCheck size={18} color="var(--primary)"/><span><strong>حقول الباقات مُدارة تلقائيًا من Item4Gamer.</strong> تم إيقاف إضافة Player ID اليدوية لهذا المنتج حتى يصل كل حقل للمورد باسمه الصحيح.</span></aside>;
}

