import { BadgePercent, Clock3, ImageIcon, Search, Sparkles, Tag, Zap } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";

interface CategoryRow { id: string; slug: string; name_ar: string; }
interface ProductRow { id: string; slug: string; name_ar: string; image_url: string | null; badge: string | null; featured: boolean; instant_delivery: boolean; delivery_time: string | null; category: CategoryRow | CategoryRow[] | null; }
interface OfferRow { id: string; name_ar: string; supplier_price_usd: number | string; profit_usd: number | string; old_price_usd: number | string | null; stock: number | null; product: ProductRow | ProductRow[] | null; }
function one<T>(value:T|T[]|null):T|null{return Array.isArray(value)?value[0]??null:value}
function money(value:number,rate:number){return `${(value*rate).toLocaleString("ar-EG",{maximumFractionDigits:2})} ج.م`}

export default async function OffersPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const [offersResult, categoriesResult, settingsResult] = await Promise.all([
    supabase.from("store_product_offers").select(`id, name_ar, supplier_price_usd, profit_usd, old_price_usd, stock,
      product:store_products!inner(id, slug, name_ar, image_url, badge, featured, instant_delivery, delivery_time, active,
        category:store_categories(id, slug, name_ar))`)
      .eq("active",true).eq("available",true).eq("product.active",true).order("sort_order",{ascending:true}).returns<OfferRow[]>(),
    supabase.from("store_categories").select("id, slug, name_ar").eq("active",true).order("sort_order",{ascending:true}).returns<CategoryRow[]>(),
    supabase.from("platform_settings").select("usd_to_egp_rate").eq("id",1).maybeSingle<{usd_to_egp_rate:number|string}>(),
  ]);
  const rate = Number(settingsResult.data?.usd_to_egp_rate ?? 57);
  const search = params.q?.trim().toLowerCase() ?? "";
  const categorySlug = params.category ?? "all";
  const normalized = (offersResult.data ?? []).map((offer)=>{
    const product=one(offer.product); const category=product?one(product.category):null;
    const price=Number(offer.supplier_price_usd)+Number(offer.profit_usd); const old=offer.old_price_usd===null?null:Number(offer.old_price_usd);
    const discount=old!==null&&old>price?Math.round(((old-price)/old)*100):0;
    return {...offer,product,category,price,old,discount};
  }).filter((offer)=>offer.product && (offer.stock===null||offer.stock>0))
    .filter((offer)=>!search||[offer.name_ar,offer.product?.name_ar??"",offer.category?.name_ar??""].join(" ").toLowerCase().includes(search))
    .filter((offer)=>categorySlug==="all"||offer.category?.slug===categorySlug)
    .sort((a,b)=>b.discount-a.discount||Number(b.product?.featured)-Number(a.product?.featured));
  const discountedCount=normalized.filter((offer)=>offer.discount>0).length;

  return <AppShell><main className="offersPage">
    <header className="offersHero"><div><span><Sparkles size={15}/> DEVPLAY OFFERS</span><h1>عروض وباقات مختارة</h1><p>اكتشفي الباقات المتاحة الآن. السعر النهائي يُحسب من سعر المورد والربح ثم يُعرض بالجنيه المصري.</p></div><aside><BadgePercent size={24}/><strong>{discountedCount}</strong><small>عرض بسعر مخفض</small></aside></header>
    <form action="/offers" className="offersFilters"><label><Search size={17}/><input name="q" defaultValue={params.q??""} placeholder="ابحثي عن لعبة أو باقة..."/></label><select name="category" defaultValue={categorySlug}><option value="all">كل الأقسام</option>{(categoriesResult.data??[]).map(c=><option value={c.slug} key={c.id}>{c.name_ar}</option>)}</select><button>تطبيق</button></form>
    <div className="offersTitle"><div><h2>الباقات المتاحة</h2><p>{normalized.length} باقة مطابقة</p></div><Link href="/categories">تصفح الأقسام</Link></div>
    {offersResult.error?<div className="offersState">تعذر تحميل العروض حاليًا.</div>:normalized.length===0?<div className="offersState"><Tag size={32}/><strong>لا توجد عروض مطابقة</strong><span>غيّري البحث أو القسم لعرض باقات أخرى.</span></div>:
      <section className="offersGrid">{normalized.map(offer=><Link href={`/products/${offer.product!.slug}`} className="offerCard" key={offer.id}>
        <div className="offerImage">{offer.product!.image_url?<img src={offer.product!.image_url} alt={offer.product!.name_ar}/>:<ImageIcon size={34}/>} {offer.discount>0?<b>-{offer.discount}%</b>:offer.product!.badge&&<b>{offer.product!.badge}</b>}</div>
        <div className="offerBody"><small>{offer.category?.name_ar??"خدمات رقمية"}</small><h3>{offer.product!.name_ar}</h3><strong className="offerName">{offer.name_ar}</strong><div className="offerMeta">{offer.product!.instant_delivery&&<span><Zap size={11}/> تنفيذ سريع</span>}{offer.product!.delivery_time&&<span><Clock3 size={11}/>{offer.product!.delivery_time}</span>}</div>
        <footer><div>{offer.old!==null&&offer.old>offer.price&&<del>{money(offer.old,rate)}</del>}<strong>{money(offer.price,rate)}</strong></div><span>اختيار الباقة</span></footer></div>
      </Link>)}</section>}
    <style>{`
      .offersPage{display:grid;gap:18px;width:100%;max-width:1280px;margin:auto;padding:22px 16px 90px}.offersHero{display:flex;align-items:end;justify-content:space-between;gap:18px;padding:26px;border:1px solid var(--primary-border);border-radius:20px;background:linear-gradient(135deg,var(--surface),var(--primary-soft))}.offersHero>div{display:grid;gap:7px}.offersHero>div>span{display:flex;align-items:center;gap:6px;color:var(--primary);font-size:10px;font-weight:900}.offersHero h1{margin:0;font-size:clamp(28px,5vw,44px)}.offersHero p{max-width:650px;margin:0;color:var(--muted);font-size:12px;line-height:1.8}.offersHero aside{display:grid;min-width:120px;justify-items:center;gap:2px;padding:14px;border:1px solid var(--border);border-radius:15px;background:var(--surface);color:var(--primary)}.offersHero aside strong{font-size:22px}.offersHero aside small{color:var(--muted);font-size:8px}.offersFilters{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;padding:9px;border:1px solid var(--border);border-radius:15px;background:var(--surface)}.offersFilters label{display:flex;align-items:center;gap:8px;padding-inline:12px;border:1px solid var(--border);border-radius:10px;background:var(--surface-soft);color:var(--muted)}.offersFilters input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--foreground);font:inherit}.offersFilters select,.offersFilters button{min-height:43px;padding-inline:13px;border:1px solid var(--border);border-radius:10px;background:var(--surface-soft);color:var(--foreground);font:inherit}.offersFilters button{border-color:var(--primary-border);background:var(--primary);color:#fff;font-weight:900}.offersTitle{display:flex;align-items:end;justify-content:space-between}.offersTitle h2,.offersTitle p{margin:0}.offersTitle p{color:var(--muted);font-size:9px}.offersTitle a{color:var(--primary);font-size:10px;font-weight:900}.offersGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}.offerCard{display:grid;overflow:hidden;border:1px solid var(--border);border-radius:17px;background:var(--surface);color:inherit;text-decoration:none}.offerImage{position:relative;display:grid;aspect-ratio:16/8;place-items:center;overflow:hidden;background:var(--surface-soft);color:var(--muted)}.offerImage img{width:100%;height:100%;object-fit:cover}.offerImage b{position:absolute;top:9px;right:9px;padding:6px 8px;border:1px solid var(--primary-border);border-radius:999px;background:var(--primary);color:#fff;font-size:8px}.offerBody{display:grid;gap:5px;padding:13px}.offerBody>small{color:var(--primary);font-size:8px;font-weight:800}.offerBody h3{margin:0;font-size:14px}.offerName{color:var(--muted);font-size:11px}.offerMeta{display:flex;flex-wrap:wrap;gap:7px}.offerMeta span{display:flex;align-items:center;gap:3px;color:var(--muted);font-size:8px}.offerMeta span:first-child{color:var(--success)}.offerCard footer{display:flex;align-items:end;justify-content:space-between;gap:8px;margin-top:4px;padding-top:9px;border-top:1px solid var(--border)}.offerCard footer>div{display:grid;gap:2px}.offerCard del{color:var(--muted);font-size:8px}.offerCard footer strong{color:var(--primary);font-size:14px}.offerCard footer>span{font-size:9px;font-weight:900}.offersState{display:grid;min-height:230px;place-items:center;align-content:center;gap:8px;border:1px dashed var(--border);border-radius:17px;color:var(--muted)}
      @media(max-width:600px){.offersPage{gap:13px;padding:14px 10px 84px}.offersHero{align-items:stretch;padding:18px}.offersHero h1{font-size:25px}.offersHero p{font-size:9px}.offersHero aside{min-width:78px}.offersFilters{grid-template-columns:minmax(0,1fr) auto;padding:6px}.offersFilters select{max-width:105px}.offersFilters button{grid-column:1/-1;min-height:38px}.offersGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.offerCard{border-radius:13px}.offerImage{aspect-ratio:1/1}.offerBody{padding:9px}.offerBody h3{font-size:11px}.offerName{font-size:9px}.offerMeta{display:none}.offerCard footer{display:grid}.offerCard footer>span{display:none}.offerCard footer strong{font-size:11px}}
    `}</style>
  </main></AppShell>;
}
