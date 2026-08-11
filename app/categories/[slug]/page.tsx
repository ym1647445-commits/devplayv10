import { ArrowRight, CheckCircle2, Gamepad2, ImageIcon, Search, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";

import styles from "../categories.module.css";

interface CategoryRow { id: string; slug: string; name_ar: string; name_en: string | null; description_ar: string | null; image_url: string | null; }
interface OfferRow { id: string; supplier_price_usd: number | string; profit_usd: number | string; active: boolean; available: boolean; stock: number | null; }
interface ProductRow { id: string; slug: string; name_ar: string; name_en: string | null; short_description_ar: string | null; image_url: string | null; featured: boolean; instant_delivery: boolean; delivery_time: string | null; badge: string | null; active: boolean; category_id: string | null; category: CategoryRow | CategoryRow[] | null; store_product_offers: OfferRow[]; }

function relation<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] ?? null : value; }
function egp(value: number, rate: number) { return `${(value * rate).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م`; }

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [categoryResult, settingsResult] = await Promise.all([
    supabase.from("store_categories").select("id, slug, name_ar, name_en, description_ar, image_url").eq("slug", slug).eq("active", true).maybeSingle<CategoryRow>(),
    supabase.from("platform_settings").select("usd_to_egp_rate").eq("id", 1).maybeSingle<{ usd_to_egp_rate: number | string }>(),
  ]);
  const isGamesLanding = slug === "games" && !categoryResult.data;
  if (!categoryResult.data && !isGamesLanding) notFound();
  const category = categoryResult.data;

  let productsQuery = supabase.from("store_products").select(`id, slug, name_ar, name_en, short_description_ar, image_url, featured, instant_delivery, delivery_time, badge, active, category_id,
    category:store_categories(id, slug, name_ar, name_en, description_ar, image_url),
    store_product_offers(id, supplier_price_usd, profit_usd, active, available, stock)`)
    .eq("active", true).neq("status", "unavailable").order("featured", { ascending: false }).order("created_at", { ascending: false });
  if (category) productsQuery = productsQuery.eq("category_id", category.id);
  const { data, error } = await productsQuery.returns<ProductRow[]>();
  const search = query.q?.trim().toLowerCase() ?? "";
  const rate = Number(settingsResult.data?.usd_to_egp_rate ?? 57);
  const products = (data ?? []).map((product) => {
    const offers = (product.store_product_offers ?? []).filter((offer) => offer.active && offer.available && (offer.stock === null || offer.stock > 0));
    const prices = offers.map((offer) => Number(offer.supplier_price_usd) + Number(offer.profit_usd));
    return { ...product, category: relation(product.category), offers, lowest: prices.length ? Math.min(...prices) : null };
  }).filter((product) => !search || [product.name_ar, product.name_en ?? "", product.short_description_ar ?? ""].join(" ").toLowerCase().includes(search));
  const title = category?.name_ar ?? "شحن الألعاب";
  const description = category?.description_ar ?? "كل ألعاب وخدمات الشحن المباشر المتاحة داخل DevPlay.";

  return <AppShell><main className={styles.page}>
    <Link className={styles.eyebrow} href="/categories"><ArrowRight size={14}/> كل الأقسام</Link>
    <header className={styles.hero}><span className={styles.eyebrow}><Gamepad2 size={15}/>{category?.name_en ?? "GAMES & TOP UP"}</span><h1>{title}</h1><p>{description}</p><div className={styles.stats}><span className={styles.stat}>{products.length} منتج</span><span className={styles.stat}>{products.reduce((n,p)=>n+p.offers.length,0)} باقة متاحة</span></div></header>
    <form action={`/categories/${slug}`} className="categorySearch"><label><Search size={17}/><input name="q" defaultValue={query.q ?? ""} placeholder={`ابحث داخل ${title}...`}/></label><button>بحث</button></form>
    {error ? <div className={styles.error}>تعذر تحميل منتجات القسم.</div> : products.length === 0 ? <div className={styles.empty}><Search size={32}/><strong>لا توجد نتائج</strong><span>جرّبي بحثًا مختلفًا أو تصفحي بقية الأقسام.</span></div> :
      <section className="categoryProducts">{products.map((product)=><Link href={`/products/${product.slug}`} className="categoryProduct" key={product.id}>
        <div className="categoryProductImage">{product.image_url ? <img src={product.image_url} alt={product.name_ar}/> : <ImageIcon size={32}/>} {product.featured && <span><Sparkles size={10}/> مميز</span>}</div>
        <div className="categoryProductBody"><small>{product.category?.name_ar ?? title}</small><strong>{product.name_ar}</strong><p>{product.short_description_ar ?? "اختر الباقة المناسبة وأدخل بيانات التنفيذ."}</p><div><span className={product.offers.length ? "ready" : "closed"}><CheckCircle2 size={11}/>{product.offers.length} باقة</span>{product.instant_delivery && <span className="instant"><Zap size={11}/> سريع</span>}</div><footer><small>{product.lowest === null ? "غير متاح" : "يبدأ من"}</small><strong>{product.lowest === null ? "—" : egp(product.lowest, rate)}</strong></footer></div>
      </Link>)}</section>}
    <style>{`
      .categorySearch{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:9px;border:1px solid var(--border);border-radius:15px;background:var(--surface)}
      .categorySearch label{display:flex;align-items:center;gap:8px;min-height:44px;padding-inline:12px;border:1px solid var(--border);border-radius:11px;background:var(--surface-soft);color:var(--muted)}
      .categorySearch input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--foreground);font:inherit}.categorySearch button{min-width:78px;border:1px solid var(--primary-border);border-radius:11px;background:var(--primary);color:#fff;font-weight:900}
      .categoryProducts{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}.categoryProduct{display:grid;overflow:hidden;min-width:0;border:1px solid var(--border);border-radius:17px;background:var(--surface);color:inherit;text-decoration:none}
      .categoryProductImage{position:relative;display:grid;aspect-ratio:16/9;place-items:center;overflow:hidden;background:var(--surface-soft);color:var(--muted)}.categoryProductImage img{width:100%;height:100%;object-fit:cover}.categoryProductImage>span{position:absolute;top:8px;right:8px;display:flex;gap:4px;padding:5px 7px;border:1px solid var(--primary-border);border-radius:999px;background:var(--primary-soft);color:var(--primary);font-size:8px;font-weight:900}
      .categoryProductBody{display:grid;gap:6px;padding:13px}.categoryProductBody>small{color:var(--primary);font-size:8px;font-weight:800}.categoryProductBody>strong{font-size:15px}.categoryProductBody p{display:-webkit-box;overflow:hidden;margin:0;color:var(--muted);font-size:10px;line-height:1.6;-webkit-line-clamp:2;-webkit-box-orient:vertical}.categoryProductBody>div{display:flex;gap:7px}.categoryProductBody>div span{display:flex;align-items:center;gap:3px;font-size:8px;font-weight:800}.ready{color:var(--success)}.closed{color:var(--danger)}.instant{color:var(--warning)}.categoryProduct footer{display:flex;align-items:end;justify-content:space-between;gap:8px;padding-top:8px;border-top:1px solid var(--border)}.categoryProduct footer small{color:var(--muted);font-size:7px}.categoryProduct footer strong{color:var(--primary);font-size:14px}
      @media(max-width:600px){.categoryProducts{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.categoryProduct{border-radius:13px}.categoryProductImage{aspect-ratio:1/1}.categoryProductBody{padding:9px}.categoryProductBody>strong{font-size:11px}.categoryProductBody p{display:none}.categorySearch{padding:6px}.categorySearch button{min-width:58px}.categoryProduct footer strong{font-size:11px}}
    `}</style>
  </main></AppShell>;
}
