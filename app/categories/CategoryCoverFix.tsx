"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import styles from "./category-cover-fix.module.css";

export function CategoryCoverFix(){
  const pathname=usePathname();
  useEffect(()=>{
    if(pathname!=="/categories")return;
    const fix=()=>{
      const mappings=[
        {href:"/categories/games",className:styles.games,label:"قسم الألعاب"},
        {href:"/categories/gift-cards",className:styles.gifts,label:"قسم البطاقات الرقمية"},
      ];
      for(const mapping of mappings){
        const card=document.querySelector<HTMLAnchorElement>(`a[href="${mapping.href}"]`);
        if(!card||card.dataset.genericCategoryCover==="true")continue;
        card.dataset.genericCategoryCover="true";card.classList.add(styles.generic,mapping.className);
        const image=card.querySelector<HTMLElement>("div[class*='image']");
        const img=image?.querySelector("img");if(img)img.remove();
        if(image){image.setAttribute("role","img");image.setAttribute("aria-label",mapping.label)}
      }
    };
    fix();const observer=new MutationObserver(fix);observer.observe(document.body,{subtree:true,childList:true});
    return()=>observer.disconnect();
  },[pathname]);
  return null;
}

