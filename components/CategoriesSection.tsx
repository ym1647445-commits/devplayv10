"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Flame, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import ProductCard from "./ProductCard";

type Category = {
  id: number;
  name: string;
  image: string | null;
  active: boolean | null;
  sort_order: number | null;
  slug: string | null;
};

export default function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);

    const { data, error } = await supabase
      .from("categories")
      .select("id,name,image,active,sort_order,slug")
      .eq("active", true)
      .not("slug", "is", null)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Categories error:", error.message);
      setCategories([]);
      setLoading(false);
      return;
    }

    setCategories(data || []);
    setLoading(false);
  }

  const validCategories = useMemo(() => {
    return categories.filter(
      (item) => item.slug && item.slug.trim() !== "" && item.slug !== "null"
    );
  }, [categories]);

  return (
    <section className="section">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
          gap: 14,
        }}
      >
        <div>
          <div className="badge">
            <Sparkles size={14} />
            Popular Categories
          </div>

          <h2
            className="section-title"
            style={{
              marginTop: 12,
              marginBottom: 0,
            }}
          >
            الألعاب والخدمات
          </h2>
        </div>

        <div className="badge">
          <Flame size={14} />
          {validCategories.length} Category
        </div>
      </div>

      {loading ? (
        <div className="games-grid">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="skeleton"
              style={{
                height: 250,
                borderRadius: 24,
              }}
            />
          ))}
        </div>
      ) : validCategories.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: 24,
            color: "#9ca3af",
            fontWeight: 800,
          }}
        >
          لا توجد أقسام مفعّلة حاليًا.
        </div>
      ) : (
        <div className="games-grid">
          {validCategories.map((item) => (
            <Link
              key={item.id}
              href={`/game/${item.slug}`}
              style={{
                textDecoration: "none",
              }}
            >
              <ProductCard
                title={item.name}
                image={item.image || "/assets/default.png"}
              />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}