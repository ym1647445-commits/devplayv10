"use client";

import { ArrowLeft, Gamepad2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import styles from "./QuickRecharge.module.css";

interface QuickRechargeProps {
  userId: string;
}

interface OrderRow {
  product_order_items: Array<{ product_id: string }> | null;
}

interface ProductRow {
  id: string;
  slug: string;
  name_ar: string;
  image_url: string | null;
  featured: boolean;
  store_product_offers: Array<{
    active: boolean;
    available: boolean;
    stock: number | null;
  }> | null;
}

const productSelect = "id,slug,name_ar,image_url,featured,store_categories!inner(slug),store_product_offers(active,available,stock)";

function isAvailable(product: ProductRow) {
  return (product.store_product_offers ?? []).some(
    (offer) =>
      offer.active &&
      offer.available &&
      (offer.stock === null || offer.stock > 0),
  );
}

export function QuickRecharge({ userId }: QuickRechargeProps) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    void (async () => {
      const [ordersResult, featuredResult] = await Promise.all([
        supabase
          .from("product_orders")
          .select("product_order_items(product_id)")
          .eq("user_id", userId)
          .in("status", ["completed", "processing", "supplier_pending"])
          .order("created_at", { ascending: false })
          .limit(6)
          .returns<OrderRow[]>(),
        supabase
          .from("store_products")
          .select(productSelect)
          .eq("active", true)
          .neq("status", "unavailable")
          .eq("store_categories.slug", "games")
          .order("featured", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(8)
          .returns<ProductRow[]>(),
      ]);

      const recentIds = Array.from(
        new Set(
          (ordersResult.data ?? []).flatMap((order) =>
            (order.product_order_items ?? []).map((item) => item.product_id),
          ),
        ),
      ).slice(0, 8);

      let recentProducts: ProductRow[] = [];

      if (recentIds.length > 0) {
        const recentResult = await supabase
          .from("store_products")
          .select(productSelect)
          .in("id", recentIds)
          .eq("active", true)
          .neq("status", "unavailable")
          .eq("store_categories.slug", "games")
          .returns<ProductRow[]>();

        recentProducts = recentResult.data ?? [];
      }

      const recentById = new Map(recentProducts.map((product) => [product.id, product]));
      const orderedRecent = recentIds
        .map((id) => recentById.get(id))
        .filter((product): product is ProductRow => Boolean(product));

      const merged = [...orderedRecent, ...(featuredResult.data ?? [])]
        .filter(isAvailable)
        .filter(
          (product, index, rows) =>
            rows.findIndex((candidate) => candidate.id === product.id) === index,
        )
        .slice(0, 8);

      if (active) {
        setProducts(merged);
        setLoaded(true);
      }
    })().catch(() => {
      if (active) setLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [userId]);

  return (
    <section className={styles.section} aria-labelledby="quick-recharge-title">
      <header className={styles.heading}>
        <div>
          <h2 id="quick-recharge-title">اشحن بسرعة</h2>
          <p>ارجع لألعابك في ثواني</p>
        </div>
        <Link href="/categories/games">عرض الكل <ArrowLeft /></Link>
      </header>

      <div className={styles.rail} aria-label="ألعاب للشحن السريع">
        {!loaded
          ? Array.from({ length: 6 }, (_, index) => (
              <span className={styles.skeleton} aria-hidden="true" key={index} />
            ))
          : products.map((product) => (
              <Link className={styles.game} href={"/products/" + product.slug} key={product.id}>
                <span className={styles.image}>
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt=""
                      width={72}
                      height={72}
                      sizes="72px"
                    />
                  ) : (
                    <Gamepad2 aria-hidden="true" />
                  )}
                </span>
                <strong>{product.name_ar}</strong>
                <small>اختار الباقة</small>
              </Link>
            ))}

        {loaded && products.length === 0 && (
          <Link className={styles.empty} href="/categories/games">
            <Gamepad2 />
            <span><strong>استكشف ألعاب DevPlay</strong><small>اختار لعبتك والباقة المناسبة</small></span>
            <ArrowLeft />
          </Link>
        )}
      </div>
    </section>
  );
}
