import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }:{params:Promise<{slug:string}>}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase.from("store_products").select("id").eq("slug", slug).eq("active", true).maybeSingle<{id:string}>();
  if (!product) return NextResponse.json({ groups: [], offers: [] });
  const [{ data: groups, error: groupsError }, { data: offers, error: offersError }] = await Promise.all([
    supabase.from("store_product_offer_groups").select("id,name_ar,name_en,sort_order").eq("product_id", product.id).eq("active", true).order("sort_order"),
    supabase.from("store_product_offers").select("id,name_ar,offer_group_id,sort_order").eq("product_id", product.id).eq("active", true).eq("available", true).order("sort_order"),
  ]);
  if (groupsError || offersError) return NextResponse.json({ groups: [], offers: [] });
  return NextResponse.json({ groups: groups ?? [], offers: offers ?? [] });
}

