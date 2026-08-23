"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Gamepad2,
  Gift,
  Headphones,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

const categories = [
  {
    name: "شحن الألعاب",
    description: "كل منتجات الشحن",
    icon: Gamepad2,
    href: "/categories/games",
  },
  {
    name: "العروض",
    description: "أحدث التخفيضات",
    icon: Sparkles,
    href: "/offers",
  },
  {
    name: "الكوبونات",
    description: "خصوماتك المتاحة",
    icon: Gift,
    href: "/coupons",
  },
  {
    name: "المحفظة",
    description: "الرصيد والعمليات",
    icon: WalletCards,
    href: "/wallet",
  },
];

function formatEgpBalance(
  balance: number,
): string {
  return Number(balance).toLocaleString(
    "ar-EG",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

export default function HomePage() {
  const gamesRailRef=useRef<HTMLDivElement>(null);
  const [featuredProducts,setFeaturedProducts]=useState<Array<{id:string;slug:string;name_ar:string;image_url:string|null;short_description_ar:string|null;offers:Array<{supplier_price_usd:number|string;profit_usd:number|string}>}>>([]);
  const [lastViewed,setLastViewed]=useState<{slug:string;name:string;image:string;shortDescription:string}|null>(null);
  const {
    loading,
    user,
    profile,
    wallet,
  } = useAuth();

  const balanceEgp = Number(
    wallet?.balance_egp ?? 0,
  );

  const balanceUsd = Number(
    wallet?.balance_usd ?? 0,
  );

  const firstName =
    profile?.full_name
      ?.trim()
      .split(/\s+/)[0] ?? null;

  useEffect(()=>{let active=true;void Promise.resolve().then(()=>{if(!active)return;try{const saved=localStorage.getItem("devplay-last-viewed-product");setLastViewed(saved?JSON.parse(saved) as {slug:string;name:string;image:string;shortDescription:string}:null)}catch{setLastViewed(null)}});const supabase=createClient();void supabase.from("store_products").select("id,slug,name_ar,image_url,short_description_ar,featured,store_product_offers(supplier_price_usd,profit_usd,active,available,stock)").eq("active",true).neq("status","unavailable").order("featured",{ascending:false}).order("created_at",{ascending:false}).limit(10).then(({data})=>{if(!active)return;setFeaturedProducts((data??[]).map(row=>({id:String(row.id),slug:String(row.slug),name_ar:String(row.name_ar),image_url:row.image_url as string|null,short_description_ar:row.short_description_ar as string|null,offers:((row.store_product_offers??[]) as Array<{supplier_price_usd:number|string;profit_usd:number|string;active:boolean;available:boolean;stock:number|null}>).filter(offer=>offer.active&&offer.available&&(offer.stock===null||offer.stock>0))})).filter(product=>product.offers.length>0))});return()=>{active=false}},[]);

  return (
    <AppShell>
      <section className="mobile-home">
        <div className="home-usage-ticker" aria-label="طريقة استخدام DevPlay"><div>{["اختاري اللعبة والباقـة","أدخلي Player ID أو البريد بدقة","راجعي الطلب وادفعي من المحفظة","نتابع التنفيذ تلقائيًا مع المورد","الكود أو الشحن يظهر داخل طلباتك"].map((text,index)=><span key={text}><b>{index+1}</b>{text}<ArrowLeft size={13}/></span>)}</div></div>
        <section className="home-discovery-hero">
          <div className="home-hero-copy">
            <span className="welcome-label">{user ? `أهلًا ${firstName ?? "بيك"}` : "مرحبًا بك في DevPlay"}</span>
            <h1>كل شحناتك الرقمية في مكان واحد</h1>
            <p>اختاري اللعبة أو الخدمة، حددي الباقة المناسبة، وتابعي طلبك بسهولة من لحظة الدفع حتى التنفيذ.</p>
            <Link className="home-hero-search" href="/search">
              <Search size={19} /><span>ابحثي عن لعبة، بطاقة أو باقة...</span><ArrowLeft size={18} />
            </Link>
            <div className="home-hero-actions">
              <Link href="/products"><Button size="small" leftIcon={<Gamepad2 />}>تصفح المنتجات</Button></Link>
              <Link href="/categories"><Button size="small" variant="ghost" leftIcon={<ArrowLeft />}>كل الأقسام</Button></Link>
            </div>
          </div>
          <aside className="home-hero-wallet">
            <div>
              <span>رصيد محفظتك</span>
              {loading ? <strong>جاري التحميل...</strong> : user ? <><strong>{formatEgpBalance(balanceEgp)} ج.م</strong><small>≈ ${balanceUsd.toFixed(4)}</small></> : <><strong>ابدئي من هنا</strong><small>سجّلي الدخول لمشاهدة رصيدك وطلباتك</small></>}
            </div>
            <Link href={user ? "/wallet/deposit" : "/auth"}><Button size="small">{user ? "إضافة رصيد" : "تسجيل الدخول"}</Button></Link>
          </aside>
        </section>

        <div className="welcome-row home-legacy-intro">
          <div>
            <span className="welcome-label">
              {user
                ? `أهلًا ${firstName ?? "بيك"} 👋`
                : "أهلًا بيك 👋"}
            </span>

            <h1>
              اكتشف خدمات DevPlay
            </h1>
          </div>

          <Link href="/categories">
            <Button
              size="small"
              variant="ghost"
              leftIcon={<ArrowLeft />}
            >
              الكل
            </Button>
          </Link>
        </div>

        <section className="balance-panel home-legacy-intro">
          <div>
            <span>رصيدك الحالي</span>

            {loading ? (
              <strong>
                جاري التحميل...
              </strong>
            ) : user ? (
              <>
                <strong>
                  {formatEgpBalance(
                    balanceEgp,
                  )}{" "}
                  ج.م
                </strong>

                <small>
                  ≈ $
                  {balanceUsd.toFixed(4)}
                </small>
              </>
            ) : (
              <>
                <strong>
                  0.00 ج.م
                </strong>

                <small>
                  سجّلي الدخول لعرض رصيدك
                </small>
              </>
            )}
          </div>

          <Link
            href={
              user
                ? "/wallet/deposit"
                : "/auth"
            }
          >
            <Button size="small">
              {user
                ? "إضافة رصيد"
                : "تسجيل الدخول"}
            </Button>
          </Link>
        </section>

        <section className="home-section-box">
          <div className="section-title-row">
            <h2>الأقسام</h2>

            <Link href="/categories">
              عرض الكل
            </Link>
          </div>

          <div className="category-grid">
            {categories.map(
              (category) => {
                const Icon =
                  category.icon;

                return (
                  <Link
                    className="category-item"
                    href={category.href}
                    key={category.name}
                  >
                    <span>
                      <Icon size={20} />
                    </span>

                    <strong>
                      {category.name}
                    </strong>

                    <small>
                      {
                        category.description
                      }
                    </small>
                  </Link>
                );
              },
            )}
          </div>
        </section>

        <section className="home-section-box home-products-box">
          <div className="section-title-row">
            <div>
              <h2>
                منتجات مميزة
              </h2>

              <span className="section-subtitle">
                اختيارات مقترحة ليك
              </span>
            </div>

            <Link href="/products">
              عرض الكل
            </Link>
          </div>

          <div className="home-games-carousel"><button type="button" className="home-rail-button previous" aria-label="المنتجات السابقة" onClick={()=>gamesRailRef.current?.scrollBy({left:-420,behavior:"smooth"})}><ChevronRight/></button><div className="home-games-rail" ref={gamesRailRef} onWheel={event=>{if(Math.abs(event.deltaY)>Math.abs(event.deltaX)){event.preventDefault();event.currentTarget.scrollBy({left:event.deltaY,behavior:"smooth"})}}}>
            {featuredProducts.map(product=>{const lowest=Math.min(...product.offers.map(offer=>Number(offer.supplier_price_usd)+Number(offer.profit_usd)));return <Link className="store-home-product" href={`/products/${product.slug}`} key={product.id}>{product.image_url?<img src={product.image_url} alt={product.name_ar}/>:<span><Gamepad2/></span>}<strong>{product.name_ar}</strong><small>{product.short_description_ar??`${product.offers.length} باقة متاحة`}</small><b>يبدأ من ${lowest.toFixed(2)}</b></Link>})}
          </div><button type="button" className="home-rail-button next" aria-label="المنتجات التالية" onClick={()=>gamesRailRef.current?.scrollBy({left:420,behavior:"smooth"})}><ChevronLeft/></button></div>
        </section>

        {lastViewed&&<section><div className="section-title-row"><div><h2>آخر منتج شاهدتيه</h2><span className="section-subtitle">ارجعي له بسرعة وكمّلي طلبك</span></div></div><Link className="last-viewed-product" href={`/products/${lastViewed.slug}`}>{lastViewed.image?<img src={lastViewed.image} alt={lastViewed.name}/>:<span><Gamepad2/></span>}<div><small>CONTINUE EXPLORING</small><strong>{lastViewed.name}</strong><p>{lastViewed.shortDescription||"افتحي المنتج واختاري الباقة المناسبة."}</p></div><ArrowLeft/></Link></section>}

        <section className="home-trust-strip">{[{icon:Zap,title:"تنفيذ سريع",text:"ربط مباشر مع المورد ومتابعة حالة الطلب."},{icon:ShieldCheck,title:"محفظة آمنة",text:"السعر والخصم والرصيد يتم التحقق منها على السيرفر."},{icon:Headphones,title:"دعم حقيقي",text:"فريق DevPlay يتابع معك أي مشكلة حتى الحل."}].map(item=>{const Icon=item.icon;return <article key={item.title}><Icon/><div><strong>{item.title}</strong><p>{item.text}</p></div></article>})}</section>

        <section className="home-about"><div><span>ABOUT DEVPLAY</span><h2>تجربة شحن رقمية أبسط، أوضح، وأكثر أمانًا.</h2><p>DevPlay Top Up متجر رقمي لشحن الألعاب والخدمات وشراء البطاقات. نختار الباقات المتاحة من المورد، نتحقق من السعر داخل السيرفر، ونحفظ كل خطوة في طلبك حتى تتابعي التنفيذ من مكان واحد.</p><ul><li><CheckCircle2/> منتجات وباقات تدار من لوحة DevPlay</li><li><CheckCircle2/> دفع مباشر من محفظتك</li><li><CheckCircle2/> متابعة تلقائية للشحن وأكواد التفعيل</li></ul></div><aside><strong>DEVPLAY TOP UP</strong><small>Managed by Shahd Elbary</small><Link href="/products">ابدئي التصفح <ArrowLeft/></Link></aside></section>

        <Link className="home-download-badge" href="/download"><img src="/devplay-app-icon-192.png" alt="تطبيق DevPlay"/><div><small>DEVPLAY WEB APP</small><strong>ثبّتي DevPlay على جهازك</strong><span>تجربة أسرع وتحديثات تلقائية بدون انتظار المتجر</span></div><b>تنزيل التطبيق <Download/></b></Link>

        <footer className="home-footer"><div><strong>Dev<span>Play</span></strong><small>TOP UP · DIGITAL SERVICES</small></div><nav><Link href="/products">المنتجات</Link><Link href="/categories">الأقسام</Link><Link href="/download">تنزيل التطبيق</Link><Link href="/orders">طلباتي</Link><Link href="/settings">الإعدادات</Link></nav><p>© {new Date().getFullYear()} DevPlay Top Up. جميع الحقوق محفوظة.<br/>Developed & managed by Shahd Elbary.</p></footer>
      </section>
    </AppShell>
  );
}
