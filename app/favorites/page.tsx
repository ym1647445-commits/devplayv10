"use client";

import {
  ArrowLeft,
  Heart,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { ProductCard } from "@/components/product/ProductCard";
import { useFavoritesStore } from "@/stores/favoritesStore";

export default function FavoritesPage() {
  const items = useFavoritesStore(
    (state) => state.items,
  );

  const hydrated = useFavoritesStore(
    (state) => state.hydrated,
  );

  const clearFavorites = useFavoritesStore(
    (state) => state.clearFavorites,
  );

  if (!hydrated) {
    return (
      <AppShell>
        <div className="favorites-loading">
          جاري تحميل المفضلة...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="favorites-page">
        <header className="favorites-heading">
          <div>
            <span>المنتجات المحفوظة</span>
            <h1>المفضلة</h1>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={clearFavorites}
            >
              <Trash2 size={16} />
              مسح الكل
            </button>
          )}
        </header>

        {items.length === 0 ? (
          <section className="favorites-empty">
            <span>
              <Heart size={30} />
            </span>

            <h2>المفضلة فاضية</h2>

            <p>
              اضغطي على علامة القلب بجانب أي منتج
              عشان تحفظيه هنا.
            </p>

            <Link href="/">
              تصفح المنتجات
              <ArrowLeft size={17} />
            </Link>
          </section>
        ) : (
          <>
            <div className="favorites-count">
              {items.length.toLocaleString("ar-EG")}{" "}
              منتج محفوظ
            </div>

            <div className="favorites-grid">
              {items.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}