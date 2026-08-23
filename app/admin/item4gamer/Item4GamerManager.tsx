"use client";

import { Download, LoaderCircle, PackagePlus, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";

import { importItem4GamerOffer, syncItem4GamerProducts, syncItem4GamerVariations } from "./actions";

interface ProductRow { id: string; name: string; catalogType: "topup" | "gc"; offers: Array<{ id: string; name: string; price: number; available: boolean; imported: boolean }> }

export function Item4GamerManager({ products }: { products: ProductRow[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const run = (task: () => Promise<{ success: boolean; message: string }>) => startTransition(async () => { const result = await task(); setMessage(result.message); });
  const visible = products.filter((product) => product.name.toLowerCase().includes(query.trim().toLowerCase()));

  return <main className="admin-page-container">
    <header className="admin-page-header"><div><small>ITEM4GAMER CONTROL</small><h1>Item4Gamer</h1><p>زامني الخدمات أولًا، ثم باقات الخدمة المطلوبة فقط، وبعدها اختاري ما يظهر في المتجر.</p></div><button disabled={pending} onClick={() => run(syncItem4GamerProducts)}><RefreshCw size={16}/> مزامنة الخدمات</button></header>
    {message && <p className="admin-provider-message">{message}</p>}
    <input className="admin-search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحثي عن PUBG أو Free Fire أو Amazon..."/>
    <section className="admin-provider-grid">
      {visible.map((product) => <article key={`${product.catalogType}:${product.id}`}>
        <div className="admin-provider-head"><div><strong>{product.name}</strong><small>{product.catalogType === "gc" ? "Gift Cards" : "Top Up"} · ID {product.id}</small></div><b>{product.offers.length} باقة</b></div>
        <button disabled={pending} onClick={() => run(() => syncItem4GamerVariations(product.id))}>{pending ? <LoaderCircle size={15}/> : <Download size={15}/>} مزامنة باقات هذه الخدمة</button>
        {product.offers.length > 0 && <div className="provider-offer-mini-list">{product.offers.map((offer) => <div key={offer.id}><span><strong>{offer.name}</strong><small>{offer.price.toFixed(2)} USD · {offer.available ? "متاح" : "غير متاح"}</small></span><button disabled={pending || offer.imported} onClick={() => run(() => importItem4GamerOffer(offer.id))}><PackagePlus size={14}/>{offer.imported ? "مضاف" : "إضافة للمتجر"}</button></div>)}</div>}
      </article>)}
    </section>
  </main>;
}
