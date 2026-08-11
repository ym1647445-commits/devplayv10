import { Activity, Bell, Boxes, ChevronLeft, CircleDollarSign, Gauge, PackagePlus, PackageSearch, PlugZap, Settings2, ShieldCheck, TicketPercent, UsersRound, WalletCards } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import styles from "./settings.module.css";

interface PlatformSettings { usd_to_egp_rate:number|string;minimum_profit_egp:number|string;api_pricing_mode:string;default_profit_usd:number|string;default_markup_percentage:number|string;low_supplier_balance_usd:number|string;auto_disable_over_balance:boolean;points_per_usd:number;updated_at:string; }
interface SyncRun { status:string;sync_type:string;catalog_type:string|null;offers_found:number;completed_at:string|null;started_at:string;error_message:string|null; }

export default async function AdminSettingsPage(){const supabase=await createClient();const[settingsR,syncR,customersR,ordersR,pendingDepositsR,productsR,offersR]=await Promise.all([
  supabase.from("platform_settings").select("usd_to_egp_rate, minimum_profit_egp, api_pricing_mode, default_profit_usd, default_markup_percentage, low_supplier_balance_usd, auto_disable_over_balance, points_per_usd, updated_at").eq("id",1).maybeSingle<PlatformSettings>(),
  supabase.from("provider_sync_runs").select("status, sync_type, catalog_type, offers_found, completed_at, started_at, error_message").order("started_at",{ascending:false}).limit(1).maybeSingle<SyncRun>(),
  supabase.from("profiles").select("id",{count:"exact",head:true}).eq("role","customer"),
  supabase.from("product_orders").select("id",{count:"exact",head:true}),
  supabase.from("deposit_requests").select("id",{count:"exact",head:true}).in("status",["pending","under_review"]),
  supabase.from("store_products").select("id",{count:"exact",head:true}).eq("active",true),
  supabase.from("store_product_offers").select("id",{count:"exact",head:true}).eq("active",true).eq("available",true),
]);const s=settingsR.data;const sync=syncR.data;const services=[
  {title:"التسعير والأرباح",description:"سعر الدولار وهوامش الربح وحماية Anti-Loss.",href:"/admin/pricing",icon:CircleDollarSign,meta:s?`${Number(s.usd_to_egp_rate).toFixed(2)} ج.م / USD`:"غير متاح",tone:"primary"},
  {title:"API Center",description:"مزامنة كتالوج Flexy ومراجعة حالة الاتصال.",href:"/admin/api-center",icon:PlugZap,meta:sync?`آخر مزامنة: ${sync.status}`:"لا توجد مزامنة",tone:sync?.status==="failed"?"danger":"success"},
  {title:"باقات المورد",description:"استيراد عروض المورد وربطها بالمنتجات الرئيسية.",href:"/admin/provider-offers",icon:PackagePlus,meta:`${offersR.count??0} باقة متاحة`,tone:"primary"},
  {title:"المنتجات",description:"إدارة الألعاب والخدمات والباقات التابعة.",href:"/admin/products",icon:Boxes,meta:`${productsR.count??0} منتج نشط`,tone:"default"},
  {title:"الطلبات",description:"متابعة طلبات العملاء والتنفيذ وحالة المورد.",href:"/admin/orders",icon:PackageSearch,meta:`${ordersR.count??0} طلب`,tone:"default"},
  {title:"العملاء",description:"ملفات العملاء والمحافظ والنقاط والدعم 360°.",href:"/admin/users",icon:UsersRound,meta:`${customersR.count??0} عميل`,tone:"default"},
  {title:"الإيداعات",description:"مراجعة إثباتات التحويل وإضافة الرصيد.",href:"/admin/deposits",icon:WalletCards,meta:`${pendingDepositsR.count??0} تحتاج مراجعة`,tone:(pendingDepositsR.count??0)>0?"warning":"success"},
  {title:"الكوبونات",description:"الخصومات والجمهور والنطاق وحماية الأرباح.",href:"/admin/coupons",icon:TicketPercent,meta:"إدارة العروض",tone:"default"},
  {title:"الإشعارات",description:"إرسال الحملات ومتابعة تنبيهات العملاء.",href:"/admin/notifications",icon:Bell,meta:"مركز التواصل",tone:"default"},
] as const;
return <main className={styles.page}><header className={styles.hero}><div><span><Settings2 size={16}/> ADMIN CONTROL SETTINGS</span><h1>الإعدادات والخدمات</h1><p>مركز موحّد للوصول إلى جميع وحدات الإدارة ومراجعة الإعدادات التشغيلية الحالية.</p></div><Link href="/admin"><Gauge size={16}/> لوحة المعلومات</Link></header>
<section className={styles.snapshot}><article><CircleDollarSign/><span>سعر الدولار</span><strong>{Number(s?.usd_to_egp_rate??0).toFixed(2)} ج.م</strong></article><article><ShieldCheck/><span>أقل ربح آمن</span><strong>{Number(s?.minimum_profit_egp??0).toFixed(2)} ج.م</strong></article><article><Activity/><span>طريقة التسعير</span><strong>{s?.api_pricing_mode??"—"}</strong></article><article><PlugZap/><span>حماية رصيد المورد</span><strong>{s?.auto_disable_over_balance?"مفعّلة":"متوقفة"}</strong></article></section>
<div className={styles.heading}><div><h2>كل خدمات لوحة التحكم</h2><p>اختاري الوحدة المطلوبة لإدارة بياناتها.</p></div><span>{services.length} خدمات</span></div><section className={styles.grid}>{services.map(service=>{const Icon=service.icon;return <Link href={service.href} className={styles.card} data-tone={service.tone} key={service.href}><span className={styles.icon}><Icon size={21}/></span><div><strong>{service.title}</strong><p>{service.description}</p><small>{service.meta}</small></div><ChevronLeft size={17}/></Link>})}</section>
<section className={styles.provider}><div><PlugZap size={20}/><span><strong>حالة آخر مزامنة للمورد</strong><small>{sync?`${sync.sync_type}${sync.catalog_type?` · ${sync.catalog_type}`:""} · ${new Date(sync.completed_at??sync.started_at).toLocaleString("ar-EG")}`:"لم يتم تسجيل مزامنة بعد"}</small></span></div><b data-status={sync?.status??"none"}>{sync?.status??"غير متاح"}</b>{sync?.error_message&&<p>{sync.error_message}</p>}<Link href="/admin/api-center">فتح API Center <ChevronLeft size={14}/></Link></section>
<footer className={styles.note}>آخر تحديث لإعدادات المنصة: {s?.updated_at?new Date(s.updated_at).toLocaleString("ar-EG"):"غير متاح"}. تعديل قيم التسعير يتم من صفحة التسعير المتخصصة لتظل كل الحمايات وعمليات التحقق مفعّلة.</footer></main>}
