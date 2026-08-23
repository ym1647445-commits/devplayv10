import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OfferOrganizer } from "./OfferOrganizer";

export default async function OrganizeOffersPage({ params }:{params:Promise<{id:string}>}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{data:product},{data:groups},{data:offers}] = await Promise.all([
    supabase.from("store_products").select("id,name_ar").eq("id",id).single<{id:string;name_ar:string}>(),
    supabase.from("store_product_offer_groups").select("id,name_ar,name_en,sort_order").eq("product_id",id).order("sort_order"),
    supabase.from("store_product_offers").select("id,name_ar,name_en,offer_group_id,active,available").eq("product_id",id).order("sort_order"),
  ]);
  if (!product) notFound();
  return <main style={{direction:"rtl"}}><div style={{padding:"14px 18px 0"}}><Link href={`/admin/products/${id}`} style={{display:"inline-flex",alignItems:"center",gap:6,color:"var(--muted)"}}><ArrowRight size={16}/> رجوع إلى تعديل {product.name_ar}</Link></div><OfferOrganizer productId={id} groups={(groups??[]).map((g)=>({id:g.id,nameAr:g.name_ar,nameEn:g.name_en,sortOrder:g.sort_order}))} offers={(offers??[]).map((o)=>({id:o.id,nameAr:o.name_ar,nameEn:o.name_en,groupId:o.offer_group_id,active:o.active,available:o.available}))}/></main>;
}

