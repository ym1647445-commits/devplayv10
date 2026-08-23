"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
import productStyles from "@/components/product/ProductDetails/ProductDetails.module.css";
import styles from "./offer-groups.module.css";

interface Group { id:string; name_ar:string; name_en:string|null; sort_order:number }
interface Offer { id:string; name_ar:string; offer_group_id:string|null; sort_order:number }

export function GroupedOfferTabs() {
  const { slug } = useParams<{slug:string}>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [target, setTarget] = useState<Element|null>(null);
  const [active, setActive] = useState<string|null>(null);
  const hasUngrouped = useMemo(()=>offers.some((offer)=>!offer.offer_group_id),[offers]);

  useEffect(()=>{
    let cancelled=false;
    fetch(`/api/products/${encodeURIComponent(slug)}/offer-groups`)
      .then((response)=>response.ok?response.json():Promise.reject())
      .then((payload)=>{if(cancelled)return;setGroups(payload.groups??[]);setOffers(payload.offers??[]);setActive(payload.groups?.[0]?.id??null);})
      .catch(()=>{});
    const find=()=>setTarget(document.querySelector(`.${productStyles.offerSection} .${productStyles.sectionTitle}`));
    find();const timer=window.setInterval(find,250);window.setTimeout(()=>window.clearInterval(timer),3000);
    return()=>{cancelled=true;window.clearInterval(timer)};
  },[slug]);

  useEffect(()=>{
    if(groups.length===0)return;
    const cards=Array.from(document.querySelectorAll<HTMLButtonElement>(`.${productStyles.offersGrid} .${productStyles.offerCard}`));
    const visibleNames=new Set(offers.filter((offer)=>offer.offer_group_id===active).map((offer)=>offer.name_ar.trim()));
    cards.forEach((card)=>{const name=card.querySelector("strong")?.textContent?.trim()??"";card.style.display=visibleNames.has(name)?"":"none";});
    const selectedVisible=cards.some((card)=>card.style.display!=="none"&&card.classList.contains(productStyles.offerSelected));
    if(!selectedVisible)cards.find((card)=>card.style.display!=="none")?.click();
    return()=>cards.forEach((card)=>{card.style.display=""});
  },[active,groups.length,offers]);

  if(!target||groups.length===0)return null;
  return createPortal(<div className={styles.tabs} role="tablist" aria-label="أنواع الباقات">
    {groups.map((group)=><button key={group.id} type="button" role="tab" aria-selected={active===group.id} className={active===group.id?styles.active:undefined} onClick={()=>setActive(group.id)}>{group.name_ar}</button>)}
    {hasUngrouped&&<button type="button" role="tab" aria-selected={active===null} className={active===null?styles.active:undefined} onClick={()=>setActive(null)}>أخرى</button>}
  </div>,target);
}

