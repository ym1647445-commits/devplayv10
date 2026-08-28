import type { Metadata } from "next";

import { CinematicIntro, type IntroProduct } from "@/components/home/intro/CinematicIntro";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "اشحن ألعابك | DevPlay",
  description: "مقدمة DevPlay السينمائية لعالم الألعاب والخدمات الرقمية.",
  robots: { index: false, follow: false },
};

interface ProductRow {
  id: string;
  slug: string;
  name_ar: string;
  image_url: string | null;
}

const fallbackProducts: IntroProduct[] = [
  { id: "pubg", name: "PUBG Mobile", image: "/products/pubg-mobile.jpg" },
  { id: "free-fire", name: "Free Fire", image: "/products/free-fire.jpg" },
  { id: "fc-mobile", name: "FC Mobile", image: "/products/fc-mobile.jpg" },
  { id: "roblox", name: "Roblox", image: "/products/roblox.jpg" },
  { id: "steam", name: "Steam", image: "/products/steam.jpg" },
];

export default async function IntroPage() {
  const db = await createClient();
  const { data } = await db
    .from("store_products")
    .select("id,slug,name_ar,image_url")
    .eq("active", true)
    .neq("status", "unavailable")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<ProductRow[]>();

  const products: IntroProduct[] = (data ?? []).map((product) => ({
    id: product.id,
    name: product.name_ar,
    image: product.image_url || "/devplay-app-icon-192.png",
  }));

  return <CinematicIntro products={products.length ? products : fallbackProducts} />;
}
