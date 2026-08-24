import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo/site";

interface Product{slug:string;updated_at:string}
interface Category{slug:string}
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const supabase=await createClient();
  const [productsResult,categoriesResult]=await Promise.all([
    supabase.from("store_products").select("slug,updated_at").eq("active",true).neq("status","unavailable").returns<Product[]>(),
    supabase.from("store_categories").select("slug").eq("active",true).returns<Category[]>(),
  ]);
  const now=new Date();
  const core=[
    {url:`${SITE_URL}/`,lastModified:now,changeFrequency:"daily" as const,priority:1},
    {url:`${SITE_URL}/products`,lastModified:now,changeFrequency:"daily" as const,priority:.95},
    {url:`${SITE_URL}/games-topup`,lastModified:now,changeFrequency:"weekly" as const,priority:.95},
    {url:`${SITE_URL}/gift-cards-egypt`,lastModified:now,changeFrequency:"weekly" as const,priority:.9},
    {url:`${SITE_URL}/categories`,lastModified:now,changeFrequency:"weekly" as const,priority:.8},
    {url:`${SITE_URL}/offers`,lastModified:now,changeFrequency:"daily" as const,priority:.75},
    {url:`${SITE_URL}/support`,lastModified:now,changeFrequency:"monthly" as const,priority:.55},
  ];
  const products=(productsResult.data??[]).map(row=>({url:`${SITE_URL}/products/${encodeURIComponent(row.slug)}`,lastModified:new Date(row.updated_at),changeFrequency:"daily" as const,priority:.85}));
  const categories=(categoriesResult.data??[]).map(row=>({url:`${SITE_URL}/categories/${encodeURIComponent(row.slug)}`,lastModified:now,changeFrequency:"weekly" as const,priority:.7}));
  return [...core,...products,...categories];
}
