"use client";

import { ChevronLeft, Layers3, LoaderCircle, PackageCheck, RefreshCw, Search, Settings2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { syncItem4GamerVariations } from "../actions";
import { importAllItem4GamerOffers } from "./actions";

interface Row { id: string; name: string; catalogType: "topup" | "gc"; offersCount: number; importedCount: number; productId: string | null }

export function BulkCatalogManager({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "topup" | "gc">("all");
  const [message, setMessage] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const visible = useMemo(() => rows.filter((row) => (kind === "all" || row.catalogType === kind) && row.name.toLowerCase().includes(query.trim().toLowerCase())), [kind, query, rows]);
  const run = (id: string, task: () => Promise<{ success: boolean; message: string }>) => { setWorkingId(id); startTransition(async () => { const result = await task(); setMessage(result.message); setWorkingId(null); }); };

  return <main className="i4g-catalog-page">
    <header className="i4g-catalog-hero"><div><small>ITEM4GAMER CATALOG</small><h1>كتالوج المورد</h1><p>كل خدمة تصبح منتجًا رئيسيًا واحدًا، وجميع الباقات تُضاف تحته بضغطة واحدة.</p></div><Link href="/admin/item4gamer">مركز المزامنة <ChevronLeft size={15}/></Link></header>
    <section className="i4g-stats"><span><b>{rows.length}</b> خدمة</span><span><b>{rows.reduce((sum, row) => sum + row.offersCount, 0)}</b> باقة متزامنة</span><span><b>{rows.reduce((sum, row) => sum + row.importedCount, 0)}</b> داخل المتجر</span></section>
    <section className="i4g-toolbar"><label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحثي عن PUBG أو Free Fire..."/></label><div><button data-active={kind === "all"} onClick={() => setKind("all")}>الكل</button><button data-active={kind === "topup"} onClick={() => setKind("topup")}>Top Up</button><button data-active={kind === "gc"} onClick={() => setKind("gc")}>Gift Cards</button></div></section>
    {message && <p className="admin-provider-message">{message}</p>}
    <section className="i4g-catalog-list">{visible.map((row) => <article key={row.id}>
      <div className="i4g-service-icon"><Layers3 size={18}/></div><div className="i4g-service-info"><strong>{row.name}</strong><small>{row.catalogType === "gc" ? "Gift Card" : "Top Up"} · {row.offersCount} باقة · {row.importedCount} مضافة</small></div>
      <div className="i4g-service-actions"><button disabled={pending} onClick={() => run(row.id, () => syncItem4GamerVariations(row.id))}>{workingId === row.id ? <LoaderCircle size={14}/> : <RefreshCw size={14}/>} تحديث الباقات</button><button className="i4g-import-all" disabled={pending || row.offersCount === 0} onClick={() => run(row.id, () => importAllItem4GamerOffers(row.id))}><PackageCheck size={14}/> إضافة كل الباقات</button>{row.productId && <Link href={`/admin/products/${row.productId}`}><Settings2 size={14}/> تعديل المنتج</Link>}</div>
    </article>)}</section>
  </main>;
}
