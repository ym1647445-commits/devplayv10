import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface OfferRow { supplier_price_usd:number|string;profit_usd:number|string;manual_selling_price_usd:number|string|null;active:boolean;available:boolean }
interface ProductRow { id:string;slug:string;name_ar:string;name_en:string|null;short_description_ar:string|null;image_url:string|null;featured:boolean;instant_delivery:boolean;category:{slug:string;name_ar:string}|{slug:string;name_ar:string}[]|null;store_product_offers:OfferRow[] }

export async function GET(){
  const supabase=await createClient();
  const [{data:products,error},{data:settings}]=await Promise.all([
    supabase.from("store_products").select("id,slug,name_ar,name_en,short_description_ar,image_url,featured,instant_delivery,category:store_categories(slug,name_ar),store_product_offers(supplier_price_usd,profit_usd,manual_selling_price_usd,active,available)").eq("active",true).order("featured",{ascending:false}).order("created_at",{ascending:false}).returns<ProductRow[]>(),
    supabase.from("platform_settings").select("usd_to_egp_rate").eq("id",1).maybeSingle<{usd_to_egp_rate:number|string}>(),
  ]);
  if(error)return NextResponse.json({products:[]},{status:500});
  const rate=Number(settings?.usd_to_egp_rate??50);
  const result=(products??[]).map((product)=>{
    const category=Array.isArray(product.category)?product.category[0]??null:product.category;
    const offers=(product.store_product_offers??[]).filter((offer)=>offer.active&&offer.available);
    const prices=offers.map((offer)=>(offer.manual_selling_price_usd===null?Number(offer.supplier_price_usd)+Number(offer.profit_usd):Number(offer.manual_selling_price_usd))*rate).filter(Number.isFinite);
    return {id:product.id,slug:product.slug,nameAr:product.name_ar,nameEn:product.name_en,description:product.short_description_ar,imageUrl:product.image_url,featured:product.featured,instantDelivery:product.instant_delivery,categorySlug:category?.slug??"other",categoryName:category?.name_ar??"خدمات رقمية",offersCount:offers.length,lowestEgp:prices.length?Math.min(...prices):null};
  }).filter((product)=>product.offersCount>0);
  return NextResponse.json({products:result});
}

