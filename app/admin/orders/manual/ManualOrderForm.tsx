"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, CheckCircle2, CircleDollarSign, PackagePlus, ShieldCheck, UserRound } from "lucide-react";
import type { ProductRequiredField } from "@/types/product";
import { createAdminManualOrder } from "./actions";
import styles from "./manual.module.css";

type Wallet={balance_usd:number|string;is_frozen:boolean};
type Customer={id:string;customer_id:string;full_name:string|null;email:string|null;phone:string|null;status:string;account_wallets:Wallet[]|null};
type Offer={id:string;product_id:string;provider_offer_id:string|null;name_ar:string;name_en:string|null;supplier_price_usd:number|string;profit_usd:number|string;manual_selling_price_usd:number|string|null;stock:number|null;active:boolean;available:boolean;required_fields:ProductRequiredField[]|null;provider_data:Record<string,unknown>|null};
type Product={id:string;name_ar:string;name_en:string|null;minimum_quantity:number;maximum_quantity:number;required_fields:ProductRequiredField[]|null;provider_data:Record<string,unknown>|null;store_product_offers:Offer[]|null};

export function ManualOrderForm({customers,products,rate,defaultCustomer,canComplimentary}:{customers:Customer[];products:Product[];rate:number;defaultCustomer:string;canComplimentary:boolean}){
  const [customerId,setCustomerId]=useState(customers.some(c=>c.id===defaultCustomer)?defaultCustomer:"");
  const [productId,setProductId]=useState(""); const [offerId,setOfferId]=useState(""); const [quantity,setQuantity]=useState(1);
  const [inputs,setInputs]=useState<Record<string,string>>({}); const [payment,setPayment]=useState<"wallet"|"complimentary">("wallet");
  const [fulfillment,setFulfillment]=useState<"supplier"|"manual">("supplier"); const [note,setNote]=useState("");
  const [result,setResult]=useState<{success:boolean;message:string;orderId?:string}|null>(null); const [pending,start]=useTransition();
  const customer=customers.find(c=>c.id===customerId); const product=products.find(p=>p.id===productId);
  const offers=product?.store_product_offers??[]; const offer=offers.find(o=>o.id===offerId);
  const fields=offer?.provider_data?.catalog_type==="gc"
    ? []
    : offer?.required_fields?.length
      ? offer.required_fields
      : (product?.required_fields??[]);
  const offerPrice=(value:Offer)=>value.manual_selling_price_usd===null?Number(value.supplier_price_usd)+Number(value.profit_usd):Number(value.manual_selling_price_usd);
  const total=offer?offerPrice(offer)*quantity:0;
  const wallet=customer?.account_wallets?.[0];
  function selectProduct(id:string){setProductId(id);setOfferId("");setInputs({});setResult(null)}
  function submit(){setResult(null);start(async()=>setResult(await createAdminManualOrder({userId:customerId,productId,offerId,quantity,inputValues:inputs,paymentMode:payment,fulfillmentMode:fulfillment,adminNote:note})))}
  return <><header className={styles.header}><div><Link href="/admin/orders"><ArrowRight size={15}/> الطلبات</Link><span>MANUAL ORDER DESK</span><h1>إنشاء طلب يدوي للعميل</h1><p>سعر الباقة وبيانات المورد يُقرآن من قاعدة البيانات، ولا يمكن تعديلهما من هذه الصفحة.</p></div><ShieldCheck size={34}/></header>
  <div className={styles.layout}><section className={styles.form}>
    <Step icon={<UserRound/>} title="1. العميل"><label>ابحثي بالاسم أو Customer ID أو البريد أو الهاتف<select value={customerId} onChange={e=>setCustomerId(e.target.value)}><option value="">اختاري العميل</option>{customers.map(c=><option key={c.id} value={c.id}>{c.customer_id} — {c.full_name??"بدون اسم"} — {c.email??c.phone??"لا توجد وسيلة اتصال"}</option>)}</select></label>{customer&&<div className={styles.customer}><strong>{customer.full_name??customer.customer_id}</strong><span>{customer.customer_id} · {customer.email??"بدون بريد"} · {customer.phone??"بدون هاتف"}</span><small>الرصيد ${Number(wallet?.balance_usd??0).toFixed(4)} {wallet?.is_frozen?"— المحفظة مجمدة":""}</small></div>}</Step>
    <Step icon={<PackagePlus/>} title="2. المنتج والباقة"><div className={styles.two}><label>المنتج<select value={productId} onChange={e=>selectProduct(e.target.value)}><option value="">اختاري المنتج</option>{products.map(p=><option key={p.id} value={p.id}>{p.name_ar}</option>)}</select></label><label>الباقة<select value={offerId} onChange={e=>{setOfferId(e.target.value);setInputs({});setResult(null)}} disabled={!product}><option value="">اختاري الباقة</option>{offers.map(o=><option key={o.id} value={o.id}>{o.name_ar} — ${offerPrice(o).toFixed(4)}</option>)}</select></label></div><label>الكمية<input type="number" min={product?.minimum_quantity??1} max={product?.maximum_quantity??100} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label></Step>
    {offer&&<Step icon={<ShieldCheck/>} title="3. بيانات التنفيذ والتحقق">{fields.length===0?<div className={styles.safe}>هذه الباقة لا تطلب ID أو بيانات إضافية، ويمكن إنشاؤها بدون ID.</div>:<div className={styles.fields}>{fields.map(field=><label key={field.id}>{field.label}{field.required&&<b> *</b>}<input type={field.type||"text"} required={field.required} placeholder={field.placeholder} pattern={field.pattern} value={inputs[field.id]??""} onChange={e=>setInputs(v=>({...v,[field.id]:e.target.value}))}/>{field.helperText&&<small>{field.helperText}</small>}</label>)}</div>}</Step>}
    <Step icon={<CircleDollarSign/>} title="4. الدفع والتنفيذ"><div className={styles.choices}><label><input type="radio" checked={payment==="wallet"} onChange={()=>setPayment("wallet")}/> خصم من محفظة العميل</label>{canComplimentary&&<label><input type="radio" checked={payment==="complimentary"} onChange={()=>setPayment("complimentary")}/> مجاني / تعويض إداري</label>}</div><div className={styles.choices}><label><input type="radio" checked={fulfillment==="supplier"} onChange={()=>setFulfillment("supplier")}/> إرسال إلى Flexy</label><label><input type="radio" checked={fulfillment==="manual"} onChange={()=>setFulfillment("manual")}/> تنفيذ يدوي بدون المورد</label></div><label>سبب إنشاء الطلب / ملاحظة الإدارة<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="مثال: العميل تواصل مع الدعم ولم يتمكن من إدخال الطلب بنفسه"/></label></Step>
    {result&&<div className={result.success?styles.success:styles.error}>{result.message}{result.success&&result.orderId&&<Link href={`/admin/orders?order=${result.orderId}`}>فتح الطلب</Link>}</div>}
    <button className={styles.submit} onClick={submit} disabled={pending||!customerId||!offerId||note.trim().length<3}>{pending?"جارٍ التحقق والإنشاء...":"مراجعة وإنشاء الطلب"}</button>
  </section><aside className={styles.summary}><h2>ملخص موثوق</h2><span>العميل<strong>{customer?.customer_id??"—"}</strong></span><span>المنتج<strong>{product?.name_ar??"—"}</strong></span><span>الباقة<strong>{offer?.name_ar??"—"}</strong></span><span>Flexy Offer ID<strong>{offer?.provider_offer_id??"—"}</strong></span><span>الإجمالي<strong>{payment==="complimentary"?"مجانًا":`${(total*rate).toFixed(2)} ج.م`}</strong></span><p><CheckCircle2/> سيتم التحقق مرة أخرى داخل PostgreSQL قبل الخصم والإنشاء.</p></aside></div></>;
}
function Step({icon,title,children}:{icon:React.ReactNode;title:string;children:React.ReactNode}){return <section className={styles.step}><h2>{icon}{title}</h2>{children}</section>}
