import { BulkCatalogManager } from "./BulkCatalogManager";
import { createClient } from "@/lib/supabase/server";

interface Category { id: string; name: string; catalog_type: "topup" | "gc"; provider_category_id: string }
interface Offer { provider_category_row_id: string; imported_to_store: boolean }
interface Product { id: string; provider_data: Record<string, unknown> | null }

export default async function Item4GamerCatalogPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: offers }, { data: products }] = await Promise.all([
    supabase.from("provider_categories").select("id,name,catalog_type,provider_category_id").eq("provider_name", "item4gamer").eq("active", true).order("name").returns<Category[]>(),
    supabase.from("provider_offers").select("provider_category_row_id,imported_to_store").eq("provider_name", "item4gamer").returns<Offer[]>(),
    supabase.from("store_products").select("id,provider_data").returns<Product[]>(),
  ]);
  const productByProviderId = new Map((products ?? []).map((product) => [String(product.provider_data?.provider_product_id ?? product.provider_data?.provider_category_id ?? ""), product.id]));
  const rows = (categories ?? []).map((category) => {
    const categoryOffers = (offers ?? []).filter((offer) => offer.provider_category_row_id === category.id);
    return { id: category.id, name: category.name, catalogType: category.catalog_type, offersCount: categoryOffers.length, importedCount: categoryOffers.filter((offer) => offer.imported_to_store).length, productId: productByProviderId.get(category.provider_category_id) ?? null };
  });
  return <BulkCatalogManager rows={rows}/>;
}
