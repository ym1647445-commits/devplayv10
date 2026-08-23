"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import styles from "./catalog-sections.module.css";

export function ProductCatalogSections(){
  const pathname=usePathname();
  const searchParams=useSearchParams();
  const searchKey=searchParams.toString();

  useEffect(()=>{
    if(pathname!=="/products")return;
    let disposed=false;
    let cleanup=()=>{};
    const timer=window.setInterval(()=>{
      if(disposed)return;
      const grid=document.querySelector<HTMLElement>(".productsGrid");
      if(!grid||document.querySelector("[data-devplay-catalog-sections]"))return;
      window.clearInterval(timer);
      const cards=Array.from(grid.querySelectorAll<HTMLElement>(":scope > .productCard"));
      if(!cards.length)return;
      const host=document.createElement("div");
      host.dataset.devplayCatalogSections="true";
      host.className=styles.catalog;
      const definitions=[
        {slug:"games",title:"الألعاب والشحن المباشر",subtitle:"كل لعبة مستقلة وبداخلها باقاتها الخاصة"},
        {slug:"gift-cards",title:"Gift Cards والبطاقات الرقمية",subtitle:"أكواد وبطاقات رقمية حسب الخدمة والمنطقة"},
      ];
      for(const definition of definitions){
        const matching=cards.filter((card)=>{
          const category=card.querySelector(".productCopy > span")?.textContent?.trim()??"";
          return definition.slug==="games"?category==="الألعاب":category==="بطاقات رقمية"||category.toLowerCase().includes("gift");
        });
        if(!matching.length)continue;
        const section=document.createElement("section");section.className=styles.section;
        const header=document.createElement("header");header.className=styles.header;
        const copy=document.createElement("div");const title=document.createElement("h2");title.textContent=definition.title;const subtitle=document.createElement("p");subtitle.textContent=definition.subtitle;copy.append(title,subtitle);
        const count=document.createElement("span");count.textContent=`${matching.length.toLocaleString("ar-EG")} خدمة`;
        header.append(copy,count);
        const sectionGrid=document.createElement("div");sectionGrid.className=`productsGrid ${styles.grid}`;
        for(const card of matching)sectionGrid.append(card.cloneNode(true));
        section.append(header,sectionGrid);host.append(section);
      }
      if(!host.childElementCount)return;
      const resultsHeader=document.querySelector<HTMLElement>(".productsResultsHeader");
      grid.before(host);grid.style.display="none";if(resultsHeader)resultsHeader.style.display="none";
      cleanup=()=>{host.remove();grid.style.display="";if(resultsHeader)resultsHeader.style.display=""};
    },150);
    window.setTimeout(()=>window.clearInterval(timer),4000);
    return()=>{disposed=true;window.clearInterval(timer);cleanup()};
  },[pathname,searchKey]);
  return null;
}

