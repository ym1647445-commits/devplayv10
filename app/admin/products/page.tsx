"use client";

import { useEffect, useState } from "react";
import { Boxes, Plus, Save, Search, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { playSound } from "@/lib/playSound";
import AdminGuard from "@/components/AdminGuard";

type Product = {
  id: number;
  category: string | null;
  game: string | null;
  name: string | null;
  price_sell: number | null;
  need: string | null;
  delivery_type: string | null;
  package_type: string | null;
  active: boolean | null;
};

const emptyProduct = {
  category: "games",
  game: "",
  name: "",
  price_sell: 0,
  need: "player_id",
  delivery_type: "manual",
  package_type: "package",
  active: true,
};

function AdminProductsContent() {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [newProduct, setNewProduct] = useState(emptyProduct);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);

    const { data } = await supabase
      .from("products")
      .select("id,category,game,name,price_sell,need,delivery_type,package_type,active")
      .order("id", { ascending: false });

    setProducts(data || []);
    setLoading(false);
  }

  async function addProduct() {
    if (!newProduct.game || !newProduct.name) {
      playSound("error");
      alert("اكتبي اسم اللعبة واسم الباقة.");
      return;
    }

    const { error } = await supabase.from("products").insert(newProduct);

    if (error) {
      playSound("error");
      alert(error.message);
      return;
    }

    playSound("success");
    setNewProduct(emptyProduct);
    loadProducts();
  }

  async function saveProduct(product: Product) {
    const { error } = await supabase
      .from("products")
      .update({
        category: product.category,
        game: product.game,
        name: product.name,
        price_sell: product.price_sell,
        need: product.need,
        delivery_type: product.delivery_type,
        package_type: product.package_type,
        active: product.active,
      })
      .eq("id", product.id);

    if (error) {
      playSound("error");
      alert(error.message);
      return;
    }

    playSound("success");
    alert("تم حفظ المنتج");
  }

  async function deleteProduct(id: number) {
    const ok = confirm("هل تريد حذف المنتج؟");
    if (!ok) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      playSound("error");
      alert(error.message);
      return;
    }

    playSound("success");
    loadProducts();
  }

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.game?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  function updateProduct(id: number, key: keyof Product, value: any) {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [key]: value } : p))
    );
  }

  return (
    <main className="container admin-products-page">
      <section className="glass-card neon-border admin-products-header">
        <div>
          <span className="badge">
            <Boxes size={14} />
            المنتجات
          </span>

          <h1 className="neon-text">إدارة المنتجات</h1>

          <p>إضافة وتعديل الأسعار والباقات من لوحة الأدمن.</p>
        </div>

        <div className="admin-search">
          <Search size={18} />
          <input
            placeholder="بحث عن لعبة أو باقة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <section className="glass-card admin-product-form">
        <h2>إضافة منتج جديد</h2>

        <div className="admin-product-grid">
          <input
            placeholder="Category"
            value={newProduct.category}
            onChange={(e) =>
              setNewProduct({ ...newProduct, category: e.target.value })
            }
          />

          <input
            placeholder="Game"
            value={newProduct.game}
            onChange={(e) =>
              setNewProduct({ ...newProduct, game: e.target.value })
            }
          />

          <input
            placeholder="Package Name"
            value={newProduct.name}
            onChange={(e) =>
              setNewProduct({ ...newProduct, name: e.target.value })
            }
          />

          <input
            type="number"
            placeholder="Price"
            value={newProduct.price_sell}
            onChange={(e) =>
              setNewProduct({
                ...newProduct,
                price_sell: Number(e.target.value),
              })
            }
          />

          <select
            value={newProduct.need}
            onChange={(e) =>
              setNewProduct({ ...newProduct, need: e.target.value })
            }
          >
            <option value="player_id">Player ID</option>
            <option value="player_id_region">Player ID + Region</option>
            <option value="ea_account_link">EA Account Link</option>
            <option value="phone">Phone</option>
            <option value="contact_or_email">Contact Or Email</option>
          </select>

          <input
            placeholder="Package Type"
            value={newProduct.package_type}
            onChange={(e) =>
              setNewProduct({ ...newProduct, package_type: e.target.value })
            }
          />
        </div>

        <button className="btn admin-product-add" onClick={addProduct}>
          <Plus size={18} />
          إضافة المنتج
        </button>
      </section>

      {loading ? (
        <div className="game-loading skeleton" />
      ) : (
        <section className="admin-products-list">
          {filtered.map((product) => (
            <div key={product.id} className="glass-card admin-product-card">
              <div className="admin-product-title">
                <div>
                  <span>#{product.id}</span>
                  <h3>{product.game}</h3>
                </div>

                <label className="admin-switch">
                  <input
                    type="checkbox"
                    checked={!!product.active}
                    onChange={(e) =>
                      updateProduct(product.id, "active", e.target.checked)
                    }
                  />
                  نشط
                </label>
              </div>

              <div className="admin-product-grid">
                <input
                  value={product.category || ""}
                  onChange={(e) =>
                    updateProduct(product.id, "category", e.target.value)
                  }
                />

                <input
                  value={product.game || ""}
                  onChange={(e) =>
                    updateProduct(product.id, "game", e.target.value)
                  }
                />

                <input
                  value={product.name || ""}
                  onChange={(e) =>
                    updateProduct(product.id, "name", e.target.value)
                  }
                />

                <input
                  type="number"
                  value={product.price_sell || 0}
                  onChange={(e) =>
                    updateProduct(product.id, "price_sell", Number(e.target.value))
                  }
                />

                <select
                  value={product.need || "player_id"}
                  onChange={(e) =>
                    updateProduct(product.id, "need", e.target.value)
                  }
                >
                  <option value="player_id">Player ID</option>
                  <option value="player_id_region">Player ID + Region</option>
                  <option value="ea_account_link">EA Account Link</option>
                  <option value="phone">Phone</option>
                  <option value="contact_or_email">Contact Or Email</option>
                </select>

                <input
                  value={product.package_type || ""}
                  onChange={(e) =>
                    updateProduct(product.id, "package_type", e.target.value)
                  }
                />
              </div>

              <div className="admin-product-actions">
                <button className="btn" onClick={() => saveProduct(product)}>
                  <Save size={18} />
                  حفظ
                </button>

                <button
                  className="admin-delete-btn"
                  onClick={() => deleteProduct(product.id)}
                >
                  <Trash2 size={18} />
                  حذف
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

export default function AdminProductsPage() {
  return (
    <AdminGuard>
      <AdminProductsContent />
    </AdminGuard>
  );
}