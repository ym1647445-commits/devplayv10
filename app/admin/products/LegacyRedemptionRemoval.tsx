"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function LegacyRedemptionRemoval(){
  const pathname=usePathname();
  useEffect(()=>{
    if(!/^\/admin\/products\/[^/]+$/.test(pathname))return;
    const hide=()=>{
      for(const strong of document.querySelectorAll("section strong")){
        if(strong.textContent?.includes("نافذة استرداد الأكواد لكل باقات المنتج")){
          const section=strong.closest("section") as HTMLElement|null;
          if(section)section.style.display="none";
        }
      }
    };
    hide();const observer=new MutationObserver(hide);observer.observe(document.body,{subtree:true,childList:true});
    return()=>observer.disconnect();
  },[pathname]);
  return null;
}

