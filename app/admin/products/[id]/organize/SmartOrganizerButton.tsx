"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { Globe2, LoaderCircle } from "lucide-react";
import { organizeOffersSmart } from "./region-actions";

export function SmartOrganizerButton(){
  const {id}=useParams<{id:string}>();const router=useRouter();const[pending,startTransition]=useTransition();const[message,setMessage]=useState("");
  useEffect(()=>{for(const button of document.querySelectorAll("button")){if(button.textContent?.trim()==="تنظيم تلقائي")(button as HTMLElement).style.display="none"}},[]);
  return <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",margin:"12px 18px",padding:12,border:"1px solid var(--primary-border)",borderRadius:12,background:"var(--primary-soft)",direction:"rtl"}}><button type="button" disabled={pending} onClick={()=>startTransition(async()=>{const result=await organizeOffersSmart(id);setMessage(result.message);if(result.success)router.refresh()})} style={{display:"inline-flex",alignItems:"center",gap:7,padding:"10px 13px",border:0,borderRadius:10,background:"var(--primary)",color:"white",fontWeight:900,cursor:"pointer"}}>{pending?<LoaderCircle size={17}/>:<Globe2 size={17}/>} تنظيم ذكي حسب الدولة/النوع</button><small style={{color:"var(--muted)"}}>Gift Cards تُقسم حسب Region القادم من المورد، والألعاب حسب نوع الباقة.</small>{message&&<strong style={{width:"100%",fontSize:10}}>{message}</strong>}</div>
}

