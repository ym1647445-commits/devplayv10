"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/types/product";

import styles from "./ProductSearch.module.css";

interface ProductSearchProps {
  products: Product[];
  initialSearch?: string;
}

export function ProductSearch({
  products,
  initialSearch = "",
}: ProductSearchProps) {
  const [searchValue, setSearchValue] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] =
    useState("الكل");
  const categories=useMemo(()=>["الكل",...new Set(products.map(product=>product.category).filter(Boolean))],[products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchValue
      .trim()
      .toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        [product.category,product.shortDescription??"",...((product.providerData?.searchTerms as string[]|undefined)??[])].join(" ").toLowerCase().includes(normalizedSearch);

      const matchesCategory =
        selectedCategory === "الكل" ||
        product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchValue, selectedCategory]);

  return (
    <section className={styles.searchPage}>
      <div className={styles.heading}>
        <div>
          <span>بحث سريع</span>
          <h1>دور على خدمتك</h1>
        </div>

        <button
          type="button"
          className={styles.filterButton}
          aria-label="خيارات الفلترة"
        >
          <SlidersHorizontal size={19} />
        </button>
      </div>

      <div className={styles.searchBox}>
        <Search size={19} />

        <input
          type="search"
          value={searchValue}
          onChange={(event) =>
            setSearchValue(event.target.value)
          }
          placeholder="اكتب اسم اللعبة أو الخدمة..."
          aria-label="البحث عن منتج"
          autoFocus
        />

        {searchValue && (
          <button
            type="button"
            onClick={() => setSearchValue("")}
            aria-label="مسح البحث"
          >
            <X size={17} />
          </button>
        )}
      </div>

      <div
        className={styles.categories}
        aria-label="تصفية حسب القسم"
      >
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            className={
              selectedCategory === category
                ? styles.activeCategory
                : ""
            }
            onClick={() =>
              setSelectedCategory(category)
            }
          >
            {category}
          </button>
        ))}
      </div>

      <div className={styles.resultsHeader}>
        <strong>
          {filteredProducts.length} نتيجة
        </strong>

        {(searchValue ||
          selectedCategory !== "الكل") && (
          <button
            type="button"
            onClick={() => {
              setSearchValue("");
              setSelectedCategory("الكل");
            }}
          >
            إعادة الضبط
          </button>
        )}
      </div>

      {filteredProducts.length > 0 ? (
        <div className={styles.productsGrid}>
          {filteredProducts.map((product) => (
            <ProductCard
              product={product}
              key={product.id}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <span>
            <Search size={28} />
          </span>

          <h2>مفيش نتائج مطابقة</h2>

          <p>
            جرّبي تكتبي اسم مختلف أو اختاري قسم
            تاني.
          </p>

          <button
            type="button"
            onClick={() => {
              setSearchValue("");
              setSelectedCategory("الكل");
            }}
          >
            عرض كل المنتجات
          </button>
        </div>
      )}
    </section>
  );
}
