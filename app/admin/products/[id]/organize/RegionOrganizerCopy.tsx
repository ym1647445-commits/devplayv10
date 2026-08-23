"use client";
import { useEffect } from "react";
export function RegionOrganizerCopy(){useEffect(()=>{const update=()=>{for(const small of document.querySelectorAll("small")){if(small.textContent?.includes("Gift Cards تُقسم حسب Region"))small.textContent="أي لعبة أو Gift Card تحتوي Region ستُقسم حسب الدولة تلقائيًا؛ وما دون ذلك يُقسم حسب نوع الباقة."}};update();const observer=new MutationObserver(update);observer.observe(document.body,{subtree:true,childList:true});return()=>observer.disconnect()},[]);return null}

