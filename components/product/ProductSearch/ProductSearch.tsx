"use client";

import { PackageCheck, ReceiptText, Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/types/product";

import styles from "./ProductSearch.module.css";

export interface SearchOrder {
  id: string;
  orderNumber: string;
  title: string;
  status: string;
  type: "product" | "deposit";
  createdAt: string;
  searchTerms: string[];
}

interface ProductSearchProps {
  products: Product[];
  orders?: SearchOrder[];
  initialSearch?: string;
}
const orderStatusLabels:Record<string,string>={pending:"قيد المراجعة",processing:"قيد التنفيذ",supplier_pending:"عند المورد",completed:"مكتمل",manual_review:"مراجعة يدوية",failed:"فشل",refunded:"تم الاسترداد",cancelled:"ملغي",under_review:"قيد المراجعة",approved:"تمت الموافقة",rejected:"مرفوض",needs_information:"مطلوب بيانات",frozen:"مجمّد"};

export function ProductSearch({
  products,
  orders = [],
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

  const filteredOrders=useMemo(()=>{const query=searchValue.trim().toLowerCase();if(!query)return[];return orders.filter(order=>[order.orderNumber,order.title,order.status,orderStatusLabels[order.status]??"",...order.searchTerms].join(" ").toLowerCase().includes(query))},[orders,searchValue]);

  return (
    <section className={styles.searchPage}>
      <div className={styles.heading}>
        <div>
          <span>بحث سريع</span>
          <h1>دور على خدمتك أو طلبك</h1>
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
          placeholder="اسم لعبة، باقة أو رقم طلب..."
          aria-label="البحث عن منتج أو طلب"
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
          {filteredProducts.length + filteredOrders.length} نتيجة
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

      {filteredOrders.length>0&&<section className={styles.ordersSection}><div className={styles.sectionTitle}><strong>طلباتك</strong><span>{filteredOrders.length}</span></div><div className={styles.ordersList}>{filteredOrders.map(order=><Link href="/orders" className={styles.orderCard} key={`${order.type}-${order.id}`}><span>{order.type==="product"?<PackageCheck size={18}/>:<ReceiptText size={18}/>}</span><div><strong dir="ltr">{order.orderNumber}</strong><p>{order.title}</p><small>{new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium"}).format(new Date(order.createdAt))}</small></div><b>{orderStatusLabels[order.status]??order.status}</b></Link>)}</div></section>}

      {filteredProducts.length > 0 ? (
        <div className={styles.productsGrid}>
          {filteredProducts.map((product) => (
            <ProductCard
              product={product}
              key={product.id}
            />
          ))}
        </div>
      ) : filteredOrders.length===0 ? (
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
      ):null}
    </section>
  );
}
