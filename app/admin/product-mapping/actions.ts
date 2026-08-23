"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient(); const { data:{ user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id",user.id).single<{role:string;status:string}>();
  if(!profile||profile.status!=="active"||!["admin","super_admin","owner"].includes(profile.role))throw new Error("Admin permission required");
  return { supabase, adminId:user.id };
}

export async function moveProviderOfferToPackage(offerId:string,packageId:string){
  try{const{supabase,adminId}=await requireAdmin();const[{data:offer,error:offerError},{data:pkg,error:packageError}]=await Promise.all([supabase.from("store_product_offers").select("id,product_id,name_ar").eq("id",offerId).single<{id:string;product_id:string;name_ar:string}>(),supabase.from("internal_packages").select("id,product_id,name_ar").eq("id",packageId).single<{id:string;product_id:string;name_ar:string}>()]);if(offerError||packageError||!offer||!pkg)throw new Error("تعذر العثور على الباقة أو عرض المورد.");if(offer.product_id!==pkg.product_id)throw new Error("لا يمكن ربط عرض بمنتج داخلي مختلف.");const{error}=await supabase.from("store_product_offers").update({internal_package_id:pkg.id,updated_at:new Date().toISOString()}).eq("id",offer.id);if(error)throw error;await supabase.from("provider_variations").update({internal_package_id:pkg.id,updated_at:new Date().toISOString()}).eq("store_product_offer_id",offer.id);await supabase.from("activity_logs").insert({actor_id:adminId,action:"provider_offer_package_mapped",entity_type:"store_product_offer",entity_id:offer.id,description:`Mapped ${offer.name_ar} to ${pkg.name_ar}`,new_data:{internal_package_id:pkg.id}});revalidatePath("/admin/product-mapping");return{success:true,message:"تم ربط عرض المورد بالباقة الداخلية."}}catch(error){return{success:false,message:error instanceof Error?error.message:"تعذر حفظ الربط."}}
}

export async function createInternalPackage(input:{productId:string;nameAr:string;canonicalKey:string;countryCode?:string;regionCode?:string}){
  try{const{supabase}=await requireAdmin();const nameAr=input.nameAr.trim();const canonicalKey=input.canonicalKey.trim().toLowerCase();if(!nameAr||!canonicalKey)throw new Error("اسم الباقة والمفتاح الداخلي مطلوبان.");const{data,error}=await supabase.from("internal_packages").insert({product_id:input.productId,name_ar:nameAr,canonical_key:canonicalKey,country_code:input.countryCode?.trim().toUpperCase()||null,region_code:input.regionCode?.trim().toUpperCase()||null}).select("id").single();if(error)throw error;revalidatePath("/admin/product-mapping");return{success:true,message:"تم إنشاء الباقة الداخلية.",id:data.id as string}}catch(error){return{success:false,message:error instanceof Error?error.message:"تعذر إنشاء الباقة."}}
}

export async function mergeInternalPackages(sourcePackageId:string,targetPackageId:string){
  try{const{supabase,adminId}=await requireAdmin();if(sourcePackageId===targetPackageId)throw new Error("اختاري باقتين مختلفتين.");const{data:packages,error}=await supabase.from("internal_packages").select("id,product_id,name_ar").in("id",[sourcePackageId,targetPackageId]);if(error||!packages||packages.length!==2)throw new Error("تعذر قراءة الباقات.");if(packages[0].product_id!==packages[1].product_id)throw new Error("لا يمكن دمج باقات من منتجين مختلفين.");await supabase.from("store_product_offers").update({internal_package_id:targetPackageId,updated_at:new Date().toISOString()}).eq("internal_package_id",sourcePackageId);await supabase.from("provider_variations").update({internal_package_id:targetPackageId,updated_at:new Date().toISOString()}).eq("internal_package_id",sourcePackageId);const{error:hideError}=await supabase.from("internal_packages").update({active:false,metadata:{merged_into:targetPackageId},updated_at:new Date().toISOString()}).eq("id",sourcePackageId);if(hideError)throw hideError;await supabase.from("activity_logs").insert({actor_id:adminId,action:"internal_packages_merged",entity_type:"internal_package",entity_id:targetPackageId,description:"Merged internal packages",new_data:{source_package_id:sourcePackageId,target_package_id:targetPackageId}});revalidatePath("/admin/product-mapping");return{success:true,message:"تم دمج الباقتين مع الاحتفاظ بالطلبات القديمة."}}catch(error){return{success:false,message:error instanceof Error?error.message:"تعذر دمج الباقات."}}
}
