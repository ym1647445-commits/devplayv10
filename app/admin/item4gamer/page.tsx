import { Item4GamerManager } from "./Item4GamerManager";
import { createClient } from "@/lib/supabase/server";

interface CategoryRow { id: string; provider_category_id: string; name: string; catalog_type: "topup" | "gc" }
interface OfferRow { id: string; provider_category_row_id: string; name: string; price: number | string; available: boolean }

export default async function Item4GamerAdminPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: offers }, { data: imported }] = await Promise.all([
    supabase.from("provider_categories").select("id,provider_category_id,name,catalog_type").eq("provider_name", "item4gamer").eq("active", true).order("name").returns<CategoryRow[]>(),
    supabase.from("provider_offers").select("id,provider_category_row_id,name,price,available").eq("provider_name", "item4gamer").order("price").returns<OfferRow[]>(),
    supabase.from("store_product_offers").select("provider_offer_row_id").eq("provider_name", "item4gamer").returns<Array<{ provider_offer_row_id: string | null }>>(),
  ]);
  const importedIds = new Set((imported ?? []).map((row) => row.provider_offer_row_id).filter(Boolean));
  const products = (categories ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    catalogType: category.catalog_type,
    offers: (offers ?? []).filter((offer) => offer.provider_category_row_id === category.id).map((offer) => ({
      id: offer.id, name: offer.name, price: Number(offer.price), available: offer.available, imported: importedIds.has(offer.id),
    })),
  }));
  return <Item4GamerManager products={products}/>;
}
