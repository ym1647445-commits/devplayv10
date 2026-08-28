import {
  ArrowLeft,
  Gamepad2,
  ImageIcon,
  PackageOpen,
} from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";

import styles from "./categories.module.css";

interface OfferRow {
  id: string;
  active: boolean;
  available: boolean;
}

interface ProductRow {
  id: string;
  image_url: string | null;
  active: boolean;
  store_product_offers: OfferRow[];
}

interface CategoryRow {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  image_url: string | null;
  products: ProductRow[];
}

function isMainStoreCategory(category: CategoryRow) {
  const slug = category.slug
    .trim()
    .toLowerCase()
    .replaceAll("_", "-");

  const arabicName = category.name_ar
    .trim()
    .replace(/\s+/g, " ");

  const englishName = category.name_en
    ?.trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  const mainArabicNames = new Set([
    "الألعاب",
    "العاب",
    "شحن الألعاب",
    "شحن العاب",
    "الهدايا",
    "بطاقات الهدايا",
  ]);

  const mainEnglishNames = new Set([
    "games",
    "game top up",
    "game top-up",
    "gift cards",
    "gift card",
  ]);

  return (
    slug === "games" ||
    slug.includes("gift-card") ||
    mainArabicNames.has(arabicName) ||
    Boolean(englishName && mainEnglishNames.has(englishName))
  );
}

export default async function CategoriesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("store_categories")
    .select(`
      id,
      slug,
      name_ar,
      name_en,
      description_ar,
      image_url,
      products:store_products(
        id,
        image_url,
        active,
        store_product_offers(
          id,
          active,
          available
        )
      )
    `)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .returns<CategoryRow[]>();

  const categories = (data ?? [])
    .filter(isMainStoreCategory)
    .map((category) => {
      const products = (category.products ?? []).filter(
        (product) => product.active,
      );

      const offersCount = products.reduce(
        (total, product) =>
          total +
          (product.store_product_offers ?? []).filter(
            (offer) => offer.active && offer.available,
          ).length,
        0,
      );

      return {
        ...category,
        products,
        offersCount,
        cover:
          category.image_url ??
          products.find((product) => product.image_url)?.image_url ??
          null,
      };
    });

  return (
    <AppShell>
      <main className={styles.page}>
        <div className={styles.heading}>
          <div>
            <h1>الأقسام</h1>
            <p>اختاري نوع الخدمة التي تريدين تصفحها.</p>
          </div>

          <Link href="/products">كل المنتجات</Link>
        </div>

        {error ? (
          <div className={styles.error}>
            تعذر تحميل الأقسام حاليًا.
          </div>
        ) : categories.length === 0 ? (
          <div className={styles.empty}>
            <PackageOpen size={34} />
            <strong>لا توجد أقسام متاحة حاليًا</strong>
          </div>
        ) : (
          <section className={styles.grid}>
            {categories.map((category) => (
              <Link
                className={styles.card}
                href={`/categories/${category.slug}`}
                key={category.id}
              >
                <div className={styles.image}>
                  {category.cover ? (
                    <img
                      src={category.cover}
                      alt={category.name_ar}
                    />
                  ) : (
                    <ImageIcon size={36} />
                  )}

                  <span className={styles.badge}>
                    {category.name_en ?? "DevPlay"}
                  </span>
                </div>

                <div className={styles.body}>
                  <div className={styles.copy}>
                    <strong>{category.name_ar}</strong>

                    <p>
                      {category.description_ar ??
                        `تصفحي كل منتجات وباقات ${category.name_ar}.`}
                    </p>
                  </div>

                  <div className={styles.footer}>
                    <span className={styles.meta}>
                      <Gamepad2 size={12} />
                      {category.products.length} منتج ·{" "}
                      {category.offersCount} باقة
                    </span>

                    <span className={styles.open}>
                      فتح القسم
                      <ArrowLeft size={13} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>
    </AppShell>
  );
}