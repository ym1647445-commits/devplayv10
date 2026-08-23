"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import styles from "./product-kind-visuals.module.css";

function markGiftCards(){
  for(const card of document.querySelectorAll<HTMLElement>(".productCard")){
    const category=card.querySelector(".productCopy > span")?.textContent?.trim()??"";
    if(category!=="بطاقات رقمية"&&!category.toLowerCase().includes("gift"))continue;
    if(card.dataset.digitalCodeCard==="true")continue;
    card.dataset.digitalCodeCard="true";card.classList.add(styles.giftCard);
    const image=card.querySelector<HTMLElement>(".productImage");
    if(image){const badge=document.createElement("span");badge.className=styles.codeBadge;badge.textContent="🎟 كود رقمي";image.append(badge)}
    const copy=card.querySelector<HTMLElement>(".productCopy");
    if(copy){const note=document.createElement("small");note.className=styles.deliveryNote;note.textContent="يُسلّم كودًا رقميًا — ليس شحن ID مباشر";copy.append(note)}
  }
}

function addDetailsNotice(){
  if(document.querySelector("[data-gift-card-notice]"))return;
  const category=Array.from(document.querySelectorAll<HTMLElement>("span,small")).find((node)=>node.textContent?.trim()==="بطاقات رقمية");
  if(!category)return;
  const offerSection=document.querySelector<HTMLElement>("section[class*='offerSection']");
  if(!offerSection)return;
  const notice=document.createElement("aside");notice.dataset.giftCardNotice="true";notice.className=styles.detailsNotice;
  notice.innerHTML="<strong>🎟 هذا المنتج بطاقة رقمية</strong><span>بعد اكتمال الطلب سيظهر لك كود التفعيل داخل تفاصيل الطلب. تأكدي من الدولة والمنطقة قبل الشراء.</span>";
  offerSection.before(notice);
}

export function ProductKindVisuals(){
  const pathname=usePathname();
  useEffect(()=>{
    if(!pathname.startsWith("/products"))return;
    const enhance=()=>{markGiftCards();if(pathname!=="/products")addDetailsNotice()};
    enhance();const observer=new MutationObserver(enhance);observer.observe(document.body,{subtree:true,childList:true});
    return()=>observer.disconnect();
  },[pathname]);
  return null;
}

