"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Gamepad2,
  Package,
  ShoppingCart,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase/supabase";
import { playSound } from "@/lib/playSound";

type Category = {
  id: number;
  name: string;
  image: string | null;
  slug: string | null;
};

type Product = {
  id: number;
  name: string | null;
  price_sell: number | null;
  package_type: string | null;
  badge: string | null;
  description: string | null;
  active: boolean | null;
  tags: string | null;
  order_mode: string | null;
};

const fcTabs = [
  {
    key: "all",
    label: "الكل",
    desc: "كل باقات FC Mobile المتاحة.",
  },
  {
    key: "fc_points_id",
    label: "نقاط FC - ID",
    desc: "شحن نقاط FC عن طريق Player ID فقط.",
  },
  {
    key: "fc_points_account",
    label: "نقاط FC - Account",
    desc: "شحن نقاط FC عن طريق رابط حساب EA ورقم واتساب للتواصل.",
  },
  {
    key: "silver_id",
    label: "Silver - ID",
    desc: "شحن الفضة عن طريق Player ID فقط.",
  },
  {
    key: "silver_account",
    label: "Silver - Account",
    desc: "شحن الفضة عن طريق رابط حساب EA.",
  },
  {
    key: "boosters",
    label: "المعززات والعروض",
    desc: "المعززات اليومية، عروض المتجر، التصاريح والباقات الخاصة.",
  },
  {
    key: "double_charge",
    label: "الشحن المضاعف",
    desc: "باقات نقاط FC مضاعفة بحد شراء محدد لكل حساب.",
  },
  {
    key: "daily_weekly",
    label: "البونص اليومي/الأسبوعي",
    desc: "باقات FC بزيادة بونص حسب الحد اليومي أو الأسبوعي.",
  },
];

function getArabicPackageType(type?: string | null) {
  const map: Record<string, string> = {
    fc_points: "نقاط FC",
    silver: "فضة",
    daily_booster: "معززات",
    double_charge: "شحن مضاعف",
    daily_weekly: "بونص",
    wallet: "رصيد",
    subscription: "اشتراك",
    diamonds: "جواهر",
    uc: "UC",
    cp: "CP",
    token: "توكن",
    gold: "ذهب",
    gems: "جواهر",
    card: "كارت",
    mobile_balance: "رصيد",
    battle_pass: "بطاقة",
    pass: "تصريح",
    pack: "باقة",
  };

  if (!type) return "باقة";
  return map[type] || "باقة";
}

function getProductHint(product: Product) {
  if (product.description) return product.description;

  if (product.order_mode === "player_id" || product.tags?.includes("id")) {
    return "هذه الباقة يتم تنفيذها عن طريق Player ID.";
  }

  if (product.order_mode === "ea_account" || product.tags?.includes("account")) {
    return "هذه الباقة تحتاج رابط حساب EA ورقم واتساب للتواصل.";
  }

  if (product.package_type === "double_charge") {
    return "عرض شحن مضاعف، غالبًا له حد شراء لكل حساب.";
  }

  if (product.package_type === "daily_weekly") {
    return "باقة بونص يومية أو أسبوعية حسب شروط العرض.";
  }

  return "تنفيذ يدوي بعد مراجعة بيانات الطلب والدفع.";
}

function matchFcTab(product: Product, activeTab: string) {
  const type = product.package_type || "";
  const tags = product.tags || "";
  const name = product.name || "";

  if (activeTab === "all") return true;

  if (activeTab === "fc_points_id") {
    return type === "fc_points" && (tags.includes("id") || name.includes("- ID"));
  }

  if (activeTab === "fc_points_account") {
    return type === "fc_points" && (tags.includes("account") || name.includes("EA Account"));
  }

  if (activeTab === "silver_id") {
    return type === "silver" && (tags.includes("id") || name.includes("- ID"));
  }

  if (activeTab === "silver_account") {
    return type === "silver" && (tags.includes("account") || name.includes("EA Account"));
  }

  if (activeTab === "boosters") {
    return ["daily_booster", "web_offer", "pack", "pass"].includes(type);
  }

  if (activeTab === "double_charge") {
    return type === "double_charge";
  }

  if (activeTab === "daily_weekly") {
    return type === "daily_weekly" || type === "daily_fp";
  }

  return true;
}

export default function GamePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);

  const isFcMobile = slug === "fc-mobile";

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const { data: cat, error: catError } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (catError || !cat) {
        setCategory(null);
        setProducts([]);
        setLoading(false);
        return;
      }

      setCategory(cat);

      const { data: items } = await supabase
        .from("products")
        .select("*")
        .eq("game", cat.name)
        .eq("active", true)
        .order("price_sell", { ascending: true });

      setProducts(items || []);
      setLoading(false);
    }

    if (slug) loadData();
  }, [slug]);

  const visibleProducts = useMemo(() => {
    if (!isFcMobile) return products;
    return products.filter((product) => matchFcTab(product, activeTab));
  }, [products, isFcMobile, activeTab]);

  const activeTabInfo = fcTabs.find((tab) => tab.key === activeTab);

  if (loading) {
    return (
      <main className="container">
        <div className="game-loading skeleton" />
      </main>
    );
  }

  if (!category) {
    return (
      <main className="container">
        <div className="glass-card game-empty">
          <h1>اللعبة غير موجودة</h1>
          <p style={{ color: "#9ca3af", marginTop: 10 }}>
            تأكد أن الـ slug موجود في جدول categories.
          </p>
          <Link href="/" className="btn" style={{ marginTop: 18 }}>
            الرجوع للرئيسية
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <Link href="/" className="game-back">
        <ArrowRight size={18} />
        رجوع للرئيسية
      </Link>

      <section className="game-hero glass-card neon-border">
        <div className="game-hero-content">
          <span className="badge">
            <Gamepad2 size={15} />
            متجر DevPlay
          </span>

          <h1 className="neon-text">{category.name}</h1>

          <p>
            اختر الباقة المناسبة، ثم أكمل بيانات الطلب والدفع اليدوي بأمان.
          </p>

          <div className="game-stats">
            <div>
              <strong>{products.length}</strong>
              <span>باقة متاحة</span>
            </div>

            <div>
              <strong>يدوي</strong>
              <span>تنفيذ الطلب</span>
            </div>

            <div>
              <strong>آمن</strong>
              <span>مراجعة الدفع</span>
            </div>
          </div>
        </div>

        <div className="game-hero-image">
          {category.image ? (
            <Image
              src={category.image}
              alt={category.name}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <Gamepad2 size={90} />
          )}
        </div>
      </section>

      <section className="section">
        <div className="game-section-title">
          <div>
            <span className="badge">
              <Package size={14} />
              الباقات
            </span>

            <h2 className="section-title">اختر الباقة</h2>

            {isFcMobile && activeTabInfo && (
              <p className="game-tab-desc">{activeTabInfo.desc}</p>
            )}
          </div>
        </div>

        {isFcMobile && (
          <div className="fc-tabs">
            {fcTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={activeTab === tab.key ? "fc-tab active" : "fc-tab"}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {visibleProducts.length === 0 ? (
          <div className="glass-card game-empty">
            <h2>لا توجد باقات في هذا القسم حاليًا</h2>
            <p style={{ color: "#9ca3af", marginTop: 10 }}>
              جرّب قسم آخر أو راجع تصنيف الباقات في قاعدة البيانات.
            </p>
          </div>
        ) : (
          <div className="packages-grid">
            {visibleProducts.map((product, index) => (
              <motion.div
                key={product.id}
                className="package-card glass-card hover-lift"
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.03 }}
              >
                <div className="package-top">
                  <div className="package-icon">
                    <BadgeCheck size={22} />
                  </div>

                  <span>{getArabicPackageType(product.package_type)}</span>
                </div>

                <h3>{product.name}</h3>

                <p>{getProductHint(product)}</p>

                <div className="package-price">
                  <strong>{product.price_sell} ج</strong>
                </div>

                <Link href={`/checkout/${product.id}`} className="package-btn">
                  طلب الآن
                  <ShoppingCart size={17} />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <div className="bottom-space" />
    </main>
  );
}