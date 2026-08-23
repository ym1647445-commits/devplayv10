"use client";

import { useState, useTransition } from "react";
import { GripVertical, Plus, Sparkles, Trash2 } from "lucide-react";
import { autoOrganizeOffers, createOfferGroup, deleteOfferGroup, moveOfferToGroup } from "./actions";
import styles from "./organize.module.css";

export interface OrganizerGroup { id:string; nameAr:string; nameEn:string|null; sortOrder:number }
export interface OrganizerOffer { id:string; nameAr:string; nameEn:string|null; groupId:string|null; active:boolean; available:boolean }

export function OfferOrganizer({ productId, groups, offers }:{productId:string;groups:OrganizerGroup[];offers:OrganizerOffer[]}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const columns = [{ id: null, nameAr: "غير مصنفة", nameEn: null, sortOrder: -1 }, ...groups];
  function run(action:()=>Promise<{success:boolean;message:string}>) { startTransition(async()=>{ const result=await action(); setMessage(result.message); }); }
  return <div className={styles.organizer}>
    <div className={styles.toolbar}>
      <div><h1>تنظيم باقات المنتج</h1><p>اسحبي أي باقة إلى مجموعتها. هذا لا يغيّر السعر أو ربطها بالمورد.</p></div>
      <button disabled={pending} onClick={()=>run(()=>autoOrganizeOffers(productId))}><Sparkles size={17}/> تنظيم تلقائي</button>
    </div>
    <form className={styles.create} onSubmit={(event)=>{event.preventDefault();if(!name.trim())return;run(async()=>{const result=await createOfferGroup(productId,name);if(result.success)setName("");return result;});}}>
      <input value={name} onChange={(event)=>setName(event.target.value)} placeholder="مثال: WOW فقط أو أكواد وهدايا" />
      <button disabled={pending || !name.trim()}><Plus size={17}/> مجموعة جديدة</button>
    </form>
    {message && <div className={styles.message}>{message}</div>}
    <div className={styles.board}>
      {columns.map((group)=><section key={group.id ?? "ungrouped"} className={styles.column} onDragOver={(event)=>event.preventDefault()} onDrop={(event)=>{event.preventDefault();const offerId=event.dataTransfer.getData("text/offer-id");if(offerId)run(()=>moveOfferToGroup(productId,offerId,group.id));}}>
        <header><div><strong>{group.nameAr}</strong><span>{offers.filter((offer)=>offer.groupId===group.id).length.toLocaleString("ar-EG")} باقة</span></div>{group.id && <button className={styles.delete} title="حذف المجموعة" disabled={pending} onClick={()=>run(()=>deleteOfferGroup(productId,group.id!))}><Trash2 size={15}/></button>}</header>
        <div className={styles.list}>{offers.filter((offer)=>offer.groupId===group.id).map((offer)=><article key={offer.id} draggable onDragStart={(event)=>{event.dataTransfer.setData("text/offer-id",offer.id);event.dataTransfer.effectAllowed="move";}} className={!offer.active || !offer.available ? styles.disabled : undefined}><GripVertical size={17}/><div><strong>{offer.nameAr}</strong>{offer.nameEn && <small>{offer.nameEn}</small>}</div></article>)}{offers.every((offer)=>offer.groupId!==group.id)&&<p className={styles.empty}>اسحبي الباقات إلى هنا</p>}</div>
      </section>)}
    </div>
  </div>;
}

