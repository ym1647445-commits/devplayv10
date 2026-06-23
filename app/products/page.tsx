"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Package, Search, Sparkles, Tag } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase/supabase";
import { playSound } from "@/lib/playSound";

type Category = {
  id: number;
  name: string;
  image: string | null;
  slug: string | null;
  active: boolean | null;
  sort_order: number | null;
};

type Product = {
  id: number;
  game: string | null;
  name: string | null;
  price_sell: number | null;
  package_type: string | null;
};

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .eq("active", true)
      .not("slug", "is", null)
      .order("sort_order", { ascending: true });

    const { data: packs } = await supabase
      .from("products")
      .select("id,game,name,price_sell,package_type")
      .eq("active", true)
      .order("price_sell", { ascending: true });

    setCategories(cats || []);
    setProducts(packs || []);
    setLoading(false);
  }

  const filteredCategories = useMemo(() => {
    return categories.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [categories, search]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return [];

    const q = search.toLowerCase();

    return products
      .filter((item) => {
        return (
          item.name?.toLowerCase().includes(q) ||
          item.game?.toLowerCase().includes(q) ||
          item.package_type?.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [products, search]);

  return (
    <>
      <Navbar />

      <main className="container">
        <section className="products-header glass-card neon-border">
          <span className="badge">
            <Sparkles size={14} />
            DevPlay Store
          </span>

          <h1 className="neon-text">الألعاب والخدمات</h1>

          <p>
            ابحث عن لعبة، خدمة، أو باقة محددة مثل PUBG أو Steam أو 60 UC.
          </p>

          <div className="products-search">
            <Search size={20} />
            <input
              placeholder="ابحث عن لعبة أو باقة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {search.trim() && (
            <div className="search-suggestions glass-card">
              {filteredProducts.length === 0 ? (
                <div className="suggestion-empty">لا توجد باقات مطابقة</div>
              ) : (
                filteredProducts.map((item) => (
                  <Link
                    key={item.id}
                    href={`/checkout/${item.id}`}
                    className="suggestion-item"
                  >
                    <div>
                      <strong>{item.game}</strong>
                      <span>{item.name}</span>
                    </div>

                    <b>{item.price_sell} ج</b>
                  </Link>
                ))
              )}
            </div>
          )}
        </section>

        <section className="section">
          <div className="products-section-head">
            <span className="badge">
              <Gamepad2 size={14} />
              Categories
            </span>
            <h2 className="section-title">كل الأقسام</h2>
          </div>

          {loading ? (
            <div className="games-grid">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="skeleton"
                  style={{ height: 250, borderRadius: 24 }}
                />
              ))}
            </div>
          ) : (
            <div className="products-page-grid">
              {filteredCategories.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link
                    href={`/game/${item.slug}`}
                    className="product-page-card glass-card hover-lift"
                  >
                    <div className="product-page-image">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="(max-width:768px) 50vw, 20vw"
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <Gamepad2 size={62} />
                      )}

                      <div className="product-page-overlay" />
                    </div>

                    <div className="product-page-info">
                      <h3>{item.name}</h3>
                      <span>
                        عرض الباقات
                        <Package size={16} />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {search.trim() && (
          <section className="section">
            <div className="products-section-head">
              <span className="badge">
                <Tag size={14} />
                Search Results
              </span>
              <h2 className="section-title">باقات مطابقة للبحث</h2>
            </div>

            <div className="packages-grid">
              {filteredProducts.map((item) => (
                <Link
                  key={item.id}
                  href={`/checkout/${item.id}`}
                  className="mini-package-card glass-card hover-lift"
                >
                  <span>{item.game}</span>
                  <h3>{item.name}</h3>
                  <strong>{item.price_sell} ج</strong>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="bottom-space" />
      </main>

      <BottomNav />
    </>
  );
}