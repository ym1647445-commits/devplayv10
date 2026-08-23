"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Gamepad2, Gift, ImageIcon, Sparkles, Zap } from "lucide-react";
import styles from "./category-products-below.module.css";

interface Product {id:string;slug:string;nameAr:string;nameEn:string|null;description:string|null;imageUrl:string|null;featured:boolean;instantDelivery:boolean;categorySlug:string;categoryName:string;offersCount:number;lowestEgp:number|null}
function money(value:number|null){return value===null?"غير متاح":`${value.toLocaleString("ar-EG",{maximumFractionDigits:2})} ج.م`}

export function CategoryProductsBelow(){
  const pathname=usePathname();const[target,setTarget]=useState<HTMLElement|null>(null);const[products,setProducts]=useState<Product[]>([]);
  useEffect(()=>{
    if(pathname!=="/categories")return;
    const main=document.querySelector<HTMLElement>("main");setTarget(main);
    const hero=main?.querySelector<HTMLElement>(":scope > header");if(hero)hero.style.display="none";
    fetch("/api/categories/store-products").then((response)=>response.ok?response.json():Promise.reject()).then((payload)=>setProducts(payload.products??[])).catch(()=>setProducts([]));
    return()=>{if(hero)hero.style.display=""};
  },[pathname]);
  if(pathname!=="/categories"||!target||!products.length)return null;
  return createPortal(<section className={styles.section}>
    <header><div><h2>الخدمات المتاحة</h2><p>اختاري اللعبة أو البطاقة، ثم ستظهر لك باقاتها بشكل منظم.</p></div><span>{products.length.toLocaleString("ar-EG")} خدمة</span></header>
    <div className={styles.grid}>{products.map((product)=><a href={`/products/${product.slug}`} className={`${styles.card} ${product.categorySlug==="gift-cards"?styles.gift:""}`} key={product.id}>
      <div className={styles.image}>{product.imageUrl?<img src={product.imageUrl} alt={product.nameAr}/>:<ImageIcon/>}{product.categorySlug==="gift-cards"?<b><Gift size={12}/> كود رقمي</b>:<b><Gamepad2 size={12}/> شحن لعبة</b>}{product.featured&&<i><Sparkles size={10}/> مميز</i>}</div>
      <div className={styles.body}><small>{product.categoryName}</small><strong>{product.nameAr}</strong>{product.description&&<p>{product.description}</p>}<div><span>{product.offersCount.toLocaleString("ar-EG")} باقة</span>{product.instantDelivery&&<span><Zap size={11}/> سريع</span>}</div><footer><small>يبدأ من</small><b>{money(product.lowestEgp)}</b></footer></div>
    </a>)}</div>
  </section>,target);
}

