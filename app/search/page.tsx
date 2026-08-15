import { AppShell } from "@/components/layout/AppShell";
import { ProductSearch, type SearchOrder } from "@/components/product/ProductSearch";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/types/product";

interface Row{id:string;slug:string;name_ar:string;name_en:string|null;short_description_ar:string|null;image_url:string|null;badge:string|null;featured:boolean;instant_delivery:boolean;delivery_time:string|null;rating:number|string;reviews_count:number;status:"available"|"busy"|"unavailable";category:{name_ar:string}|Array<{name_ar:string}>|null;store_product_offers:Array<{id:string;name_ar:string;name_en:string|null;supplier_price_usd:number|string;profit_usd:number|string;active:boolean;available:boolean;stock:number|null}>}
interface ProductOrderRow{id:string;order_id:string;status:string;created_at:string;product_order_items:Array<{product_name:string;offer_name:string|null}>|null}
interface DepositRow{id:string;deposit_id:string;status:string;created_at:string;payment_methods:{name:string}|Array<{name:string}>|null}
const relation=<T,>(value:T|T[]|null)=>Array.isArray(value)?value[0]??null:value;

export default async function SearchPage({searchParams}:{searchParams:Promise<{q?:string}>}){
  const{q}=await searchParams;const supabase=await createClient();
  const[{data},{data:{user}}]=await Promise.all([
    supabase.from("store_products").select("id,slug,name_ar,name_en,short_description_ar,image_url,badge,featured,instant_delivery,delivery_time,rating,reviews_count,status,category:store_categories(name_ar),store_product_offers(id,name_ar,name_en,supplier_price_usd,profit_usd,active,available,stock)").eq("active",true).neq("status","unavailable").order("featured",{ascending:false}).order("created_at",{ascending:false}).returns<Row[]>(),
    supabase.auth.getUser(),
  ]);
  const products:Product[]=(data??[]).flatMap(row=>{const offers=(row.store_product_offers??[]).filter(offer=>offer.active&&offer.available&&(offer.stock===null||offer.stock>0));if(!offers.length)return[];const lowest=offers.reduce((best,offer)=>Number(offer.supplier_price_usd)+Number(offer.profit_usd)<Number(best.supplier_price_usd)+Number(best.profit_usd)?offer:best);return[{id:row.id,slug:row.slug,name:row.name_ar,category:relation(row.category)?.name_ar??"ألعاب وخدمات",image:row.image_url??"/devplay-icon.svg",shortDescription:row.short_description_ar??undefined,supplierPriceUsd:Number(lowest.supplier_price_usd),profitUsd:Number(lowest.profit_usd),costPrice:Number(lowest.supplier_price_usd),price:Number(lowest.supplier_price_usd)+Number(lowest.profit_usd),currency:"USD" as const,rating:Number(row.rating??5),reviewsCount:row.reviews_count??0,badge:row.badge??undefined,status:row.status,featured:row.featured,instantDelivery:row.instant_delivery,deliveryTime:row.delivery_time??undefined,requiredFields:[],providerData:{mainProductId:row.id,searchTerms:[row.name_en??"",...offers.flatMap(offer=>[offer.name_ar,offer.name_en??""])]}}]});

  let orders:SearchOrder[]=[];
  if(user){
    const[productOrders,deposits]=await Promise.all([
      supabase.from("product_orders").select("id,order_id,status,created_at,product_order_items(product_name,offer_name)").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50).returns<ProductOrderRow[]>(),
      supabase.from("deposit_requests").select("id,deposit_id,status,created_at,payment_methods(name)").eq("user_id",user.id).order("created_at",{ascending:false}).limit(30).returns<DepositRow[]>(),
    ]);
    orders=[...(productOrders.data??[]).map(order=>{const items=order.product_order_items??[];const title=items.length?items.map(item=>`${item.product_name}${item.offer_name?` - ${item.offer_name}`:""}`).join("، "):"طلب منتجات";return{id:order.id,orderNumber:order.order_id,title,status:order.status,type:"product" as const,createdAt:order.created_at,searchTerms:items.flatMap(item=>[item.product_name,item.offer_name??""])};}),...(deposits.data??[]).map(deposit=>({id:deposit.id,orderNumber:deposit.deposit_id,title:`طلب إضافة رصيد${relation(deposit.payment_methods)?.name?` - ${relation(deposit.payment_methods)?.name}`:""}`,status:deposit.status,type:"deposit" as const,createdAt:deposit.created_at,searchTerms:[relation(deposit.payment_methods)?.name??""]}))];
  }
  return <AppShell><ProductSearch products={products} orders={orders} initialSearch={q??""}/></AppShell>;
}
