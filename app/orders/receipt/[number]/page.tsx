import { ArrowRight, BadgeCheck, CircleDollarSign, Clock3, CreditCard, Hash, Mail, PackageCheck, ReceiptText, ShieldCheck, UserRound, WalletCards } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import { ReceiptActions } from "./ReceiptActions";
import styles from "./receipt.module.css";

interface Item{ id:string;product_name:string;offer_name:string|null;product_image_url:string|null;quantity:number;supplier_price_usd:number|string;profit_usd:number|string;unit_price_usd:number|string;total_price_usd:number|string;input_values:Record<string,string>|null;supplier_response:unknown;status:string;created_at:string;updated_at:string }
interface History{id:string;old_status:string|null;new_status:string;note:string|null;created_at:string}
interface Job{id:string;status:string;supplier_status:string|null;sent_at:string|null;completed_at:string|null;created_at:string}
interface Order{id:string;order_id:string;status:string;subtotal_usd:number|string;discount_usd:number|string;total_usd:number|string;usd_to_egp_rate:number|string;total_egp_snapshot:number|string;coupon_code:string|null;customer_note:string|null;admin_note:string|null;failure_reason:string|null;created_at:string;updated_at:string;completed_at:string|null;product_order_items:Item[]|null;product_order_status_history:History[]|null;product_supplier_jobs:Job[]|null}
interface Profile{customer_id:string;full_name:string|null;email:string|null}
interface WalletTx{balance_before_usd:number|string;balance_after_usd:number|string;amount_usd:number|string;created_at:string}

const labels:Record<string,string>={pending:"تم إنشاء الطلب",processing:"قيد التنفيذ",supplier_pending:"لدى المورد",completed:"مكتمل",failed:"فشل التنفيذ",cancelled:"ملغي",refunded:"تم الاسترداد",manual_review:"مراجعة يدوية"};
const money=(value:number|string,digits=2)=>Number(value).toLocaleString("ar-EG",{minimumFractionDigits:digits,maximumFractionDigits:digits});
const date=(value:string)=>new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
function relation<T>(value:T|T[]|null|undefined){return Array.isArray(value)?value[0]??null:value??null}
function codes(value:unknown,result=new Set<string>()):string[]{if(Array.isArray(value)){value.forEach(v=>codes(v,result));return [...result]}if(!value||typeof value!=="object")return [...result];const row=value as Record<string,unknown>;for(const key of ["delivered_code","deliveredCode"]){if(typeof row[key]==="string"&&row[key])result.add(String(row[key]))}for(const key of ["delivered_codes","deliveredCodes"]){if(Array.isArray(row[key]))(row[key] as unknown[]).forEach(v=>typeof v==="string"&&v&&result.add(v))}Object.values(row).forEach(v=>codes(v,result));return [...result]}
function publicInputs(values:Record<string,string>|null){return Object.entries(values??{}).filter(([key,value])=>!key.startsWith("__")&&Boolean(value?.trim()))}

export default async function OrderReceiptPage({params}:{params:Promise<{number:string}>}){
  const {number}=await params;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect(`/auth?next=${encodeURIComponent(`/orders/receipt/${number}`)}`);
  const {data,error}=await supabase.from("product_orders").select(`id,order_id,status,subtotal_usd,discount_usd,total_usd,usd_to_egp_rate,total_egp_snapshot,coupon_code,customer_note,admin_note,failure_reason,created_at,updated_at,completed_at,product_order_items(id,product_name,offer_name,product_image_url,quantity,supplier_price_usd,profit_usd,unit_price_usd,total_price_usd,input_values,supplier_response,status,created_at,updated_at),product_order_status_history(id,old_status,new_status,note,created_at),product_supplier_jobs(id,status,supplier_status,sent_at,completed_at,created_at)`).eq("user_id",user.id).eq("order_id",decodeURIComponent(number)).single<Order>();
  if(error||!data)redirect("/");
  const [{data:profileRaw},{data:txRaw}]=await Promise.all([
    supabase.from("profiles").select("customer_id,full_name,email").eq("id",user.id).single<Profile>(),
    supabase.from("account_wallet_transactions").select("balance_before_usd,balance_after_usd,amount_usd,created_at").eq("user_id",user.id).eq("reference_type","product_order").eq("reference_id",data.id).order("created_at",{ascending:false}).limit(1).maybeSingle<WalletTx>(),
  ]);
  const profile=relation(profileRaw),tx=relation(txRaw),items=data.product_order_items??[],history=[...(data.product_order_status_history??[])].sort((a,b)=>+new Date(a.created_at)-+new Date(b.created_at));
  const allCodes=[...new Set(items.flatMap(item=>codes(item.supplier_response)))];const inputRows=items.flatMap(item=>publicInputs(item.input_values).map(([key,value])=>({item:item.offer_name??item.product_name,key,value})));
  const sentAt=(data.product_supplier_jobs??[]).map(j=>j.sent_at).filter(Boolean).sort()[0]??null;const completedAt=data.completed_at??(data.product_supplier_jobs??[]).map(j=>j.completed_at).filter(Boolean).sort().at(-1)??null;
  const title=items.map(item=>`${item.product_name}${item.offer_name?` — ${item.offer_name}`:""}`).join("، ")||"طلب منتجات";const status=labels[data.status]??data.status;
  return <AppShell><main className={styles.page} id="devplay-order-receipt">
    <header className={styles.top}><Link href="/orders"><ArrowRight size={18}/> رجوع</Link><span><ReceiptText size={15}/> فاتورة DevPlay موثقة</span></header>
    <section className={styles.hero}><div><span>DEVPLAY RECEIPT</span><h1>{data.order_id}</h1><p>{title}</p></div><div className={styles.status}><BadgeCheck size={19}/><strong>{status}</strong><small>آخر تحديث {date(data.updated_at)}</small></div></section>
    <ReceiptActions orderNumber={data.order_id} title={title} totalEgp={`${money(data.total_egp_snapshot)} ج.م`} status={status} createdAt={date(data.created_at)}/>
    <section className={styles.timeline}><h2><Clock3 size={18}/> مسيرة الطلب</h2><div className={styles.timelineGrid}>
      <article className={styles.done}><span>1</span><div><strong>تم إنشاء الطلب</strong><small>{date(data.created_at)}</small></div></article>
      <article className={sentAt?styles.done:""}><span>2</span><div><strong>أُرسل للتنفيذ</strong><small>{sentAt?date(sentAt):"بانتظار الإرسال"}</small></div></article>
      <article className={completedAt?styles.done:""}><span>3</span><div><strong>اكتمل الطلب</strong><small>{completedAt?date(completedAt):"جارٍ المتابعة"}</small></div></article>
    </div>{history.length>0&&<div className={styles.history}>{history.map(row=><div key={row.id}><i/><span><strong>{labels[row.new_status]??row.new_status}</strong><small>{date(row.created_at)}{row.note?` · ${row.note}`:""}</small></span></div>)}</div>}</section>
    <section className={styles.grid}>
      <article className={styles.panel}><h2><PackageCheck size={18}/> تفاصيل الباقة</h2>{items.map(item=><div className={styles.item} key={item.id}>{item.product_image_url?<img src={item.product_image_url} alt=""/>:<span className={styles.placeholder}><PackageCheck/></span>}<div><strong>{item.product_name}</strong><small>{item.offer_name??"الباقة المختارة"} · الكمية {item.quantity}</small></div><b>{money(Number(item.total_price_usd)*Number(data.usd_to_egp_rate))} ج.م</b></div>)}</article>
      <article className={styles.panel}><h2><CircleDollarSign size={18}/> الحساب والدفع</h2><dl><div><dt>الإجمالي قبل الخصم</dt><dd>{money(Number(data.subtotal_usd)*Number(data.usd_to_egp_rate))} ج.م</dd></div><div><dt>الخصم</dt><dd>{money(Number(data.discount_usd)*Number(data.usd_to_egp_rate))} ج.م</dd></div><div className={styles.total}><dt>المدفوع</dt><dd>{money(data.total_egp_snapshot)} ج.م</dd></div><div><dt>طريقة الدفع</dt><dd><WalletCards size={14}/> محفظة DevPlay</dd></div>{data.coupon_code&&<div><dt>الكوبون</dt><dd>{data.coupon_code}</dd></div>}</dl></article>
      <article className={styles.panel}><h2><UserRound size={18}/> صاحب الطلب</h2><dl><div><dt><UserRound size={13}/> الاسم</dt><dd>{profile?.full_name??"عميل DevPlay"}</dd></div><div><dt><Hash size={13}/> Customer ID</dt><dd dir="ltr">{profile?.customer_id??"—"}</dd></div><div><dt><Mail size={13}/> البريد</dt><dd dir="ltr">{profile?.email??user.email??"—"}</dd></div></dl></article>
      <article className={styles.panel}><h2><CreditCard size={18}/> حركة المحفظة</h2>{tx?<dl><div><dt>الرصيد قبل</dt><dd>{money(Number(tx.balance_before_usd)*Number(data.usd_to_egp_rate))} ج.م</dd></div><div><dt>المبلغ المخصوم</dt><dd>{money(Number(tx.amount_usd)*Number(data.usd_to_egp_rate))} ج.م</dd></div><div className={styles.total}><dt>الرصيد بعد</dt><dd>{money(Number(tx.balance_after_usd)*Number(data.usd_to_egp_rate))} ج.م</dd></div></dl>:<p className={styles.muted}>حركة المحفظة المرتبطة غير متاحة.</p>}</article>
    </section>
    {inputRows.length>0&&<section className={styles.panel}><h2><ShieldCheck size={18}/> بيانات التنفيذ المرسلة</h2><div className={styles.inputs}>{inputRows.map((row,index)=><article key={`${row.key}-${index}`}><small>{row.item}</small><span>{row.key.replaceAll("_"," ")}</span><strong dir="ltr">{row.value}</strong></article>)}</div></section>}
    {allCodes.length>0&&<section className={styles.codes}><h2><PackageCheck size={18}/> الأكواد المستلمة</h2><p>احتفظي بالكود ولا تشاركيه إلا داخل صفحة الاسترداد الرسمية.</p>{allCodes.map(code=><code dir="ltr" key={code}>{code}</code>)}</section>}
    {(data.customer_note||data.admin_note||data.failure_reason)&&<section className={styles.panel}><h2>ملاحظات الطلب</h2>{data.customer_note&&<p>ملاحظتك: {data.customer_note}</p>}{data.admin_note&&<p>الإدارة: {data.admin_note}</p>}{data.failure_reason&&<p className={styles.danger}>سبب التعثر: {data.failure_reason}</p>}</section>}
    <footer className={styles.footer}><ShieldCheck size={16}/> الفاتورة تعرض Snapshot الطلب وقت الشراء. عند حدوث تأخير يمكنك التواصل مع <Link href="/support">خدمة العملاء</Link>.</footer>
  </main></AppShell>
}
