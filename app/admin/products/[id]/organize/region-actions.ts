"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface RawAttribute { key?:string; name?:string; label?:string; value?:string }
interface OfferRow { id:string; name_ar:string; name_en:string|null; provider_data:Record<string,unknown>|null }

async function adminClient(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)throw new Error("يجب تسجيل الدخول أولًا.");
  const {data:profile}=await supabase.from("profiles").select("role,status").eq("id",user.id).single<{role:string;status:string}>();
  if(!profile||profile.status!=="active"||!["admin","super_admin","owner"].includes(profile.role))throw new Error("ليس لديك صلاحية لتنظيم الباقات.");
  return {supabase,adminId:user.id};
}

function attributes(offer:OfferRow):RawAttribute[]{
  const raw=offer.provider_data?.raw_data;
  if(!raw||typeof raw!=="object")return [];
  const values=(raw as Record<string,unknown>).attributes;
  return Array.isArray(values)?values as RawAttribute[]:[];
}

function regionOf(offer:OfferRow){
  const attribute=attributes(offer).find((item)=>item.key==="pa_region"||item.name?.toLowerCase()==="region");
  if(attribute?.value||attribute?.label)return {code:String(attribute.value??attribute.label).trim().toLowerCase(),label:String(attribute.label??attribute.value).trim()};
  const match=offer.name_ar.match(/\s-\s([^,]+),\s/);
  return match?{code:match[1].trim().toLowerCase().replace(/[^a-z0-9]+/g,"-"),label:match[1].trim()}:null;
}

function regionArabic(code:string,label:string){
  if(["global","worldwide","ww"].includes(code))return "عالمي";
  if(/^[a-z]{2}$/i.test(code)){
    try{return new Intl.DisplayNames(["ar"],{type:"region"}).of(code.toUpperCase())??label}catch{}
  }
  return label;
}

function safeKey(value:string){return value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"unknown"}

export async function organizeOffersSmart(productId:string):Promise<{success:boolean;message:string}> {
  try{
    const {supabase,adminId}=await adminClient();
    const {data:product}=await supabase.from("store_products").select("slug,name_ar,provider_data").eq("id",productId).single<{slug:string;name_ar:string;provider_data:Record<string,unknown>|null}>();
    if(!product)throw new Error("المنتج غير موجود.");
    const {data:offers,error}=await supabase.from("store_product_offers").select("id,name_ar,name_en,provider_data").eq("product_id",productId).eq("active",true).returns<OfferRow[]>();
    if(error)throw error;
    const rows=offers??[];
    const regions=rows.map((offer)=>({offer,region:regionOf(offer)}));
    const distinctRegions=new Map(regions.filter((row)=>row.region).map((row)=>[row.region!.code,row.region!]));

    if(distinctRegions.size>=2||product.provider_data?.catalog_type==="gc"){
      const groupIds=new Map<string,string>();let order=0;
      for(const [code,region] of distinctRegions){
        const key=`region-${safeKey(code)}`;
        const {data:group,error:groupError}=await supabase.from("store_product_offer_groups").upsert({product_id:productId,group_key:key,name_ar:regionArabic(code,region.label),name_en:region.label,sort_order:order++},{onConflict:"product_id,group_key"}).select("id").single<{id:string}>();
        if(groupError)throw groupError;groupIds.set(code,group.id);
      }
      let unknownId:string|null=null;
      if(regions.some((row)=>!row.region)){
        const {data:group,error:groupError}=await supabase.from("store_product_offer_groups").upsert({product_id:productId,group_key:"region-unknown",name_ar:"منطقة غير محددة",name_en:"Unspecified region",sort_order:order},{onConflict:"product_id,group_key"}).select("id").single<{id:string}>();
        if(groupError)throw groupError;unknownId=group.id;
      }
      for(const row of regions){const groupId=row.region?groupIds.get(row.region.code):unknownId;const {error:updateError}=await supabase.from("store_product_offers").update({offer_group_id:groupId,updated_at:new Date().toISOString()}).eq("id",row.offer.id).eq("product_id",productId);if(updateError)throw updateError}
      await supabase.from("activity_logs").insert({actor_id:adminId,action:"offers_region_organized",entity_type:"store_product",entity_id:productId,description:`Organized ${rows.length} offers into ${distinctRegions.size+(unknownId?1:0)} regions`});
      revalidatePath(`/admin/products/${productId}/organize`);revalidatePath(`/products/${product.slug}`);
      return {success:true,message:`تم تصنيف ${rows.length.toLocaleString("ar-EG")} باقة حسب ${(distinctRegions.size+(unknownId?1:0)).toLocaleString("ar-EG")} دولة/منطقة.`};
    }

    const definitions=[
      {key:"wow",ar:"WOW والعملات الخاصة",test:(v:string)=>/wow/i.test(v)},
      {key:"memberships",ar:"الاشتراكات والباقات الخاصة",test:(v:string)=>/(prime|membership|subscription|month|weekly|pass|pack|materials|emblem)/i.test(v)},
      {key:"id-topup",ar:"شحن مباشر بالـ ID",test:(_v:string)=>true},
    ];
    const ids=new Map<string,string>();
    for(const [index,definition] of definitions.entries()){const {data:group,error:groupError}=await supabase.from("store_product_offer_groups").upsert({product_id:productId,group_key:definition.key,name_ar:definition.ar,sort_order:index},{onConflict:"product_id,group_key"}).select("id").single<{id:string}>();if(groupError)throw groupError;ids.set(definition.key,group.id)}
    for(const offer of rows){const text=`${offer.name_ar} ${offer.name_en??""}`;const definition=definitions.find((item)=>item.test(text))!;const {error:updateError}=await supabase.from("store_product_offers").update({offer_group_id:ids.get(definition.key),updated_at:new Date().toISOString()}).eq("id",offer.id).eq("product_id",productId);if(updateError)throw updateError}
    revalidatePath(`/admin/products/${productId}/organize`);revalidatePath(`/products/${product.slug}`);
    return {success:true,message:`تم تنظيم ${rows.length.toLocaleString("ar-EG")} باقة حسب نوعها.`};
  }catch(error){return {success:false,message:error instanceof Error?error.message:"تعذر التنظيم الذكي."}}
}

