"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Save,
  CreditCard,
  PackageCheck,
  User,
  Phone,
  Mail,
  BadgeDollarSign,
  ClipboardList,
  MessageSquareText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { playSound } from "@/lib/playSound";
import AdminGuard from "@/components/AdminGuard";

type Order = {
  id: number;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  product_name: string | null;
  total_price: number | null;
  status: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_image: string | null;
  delivery_code: string | null;
  delivery_note: string | null;
  created_at: string | null;
};

const PAYMENT_BUCKET = "payment-proofs";

function statusLabel(status?: string | null) {
  if (status === "Completed") return "مكتمل";
  if (status === "Processing") return "قيد التنفيذ";
  if (status === "Cancelled") return "ملغي";
  if (status === "Waiting Payment") return "مراجعة الدفع";
  return "قيد الانتظار";
}

function normalizeProofPath(value: string) {
  if (!value) return "";

  if (value.includes("/object/public/")) {
    const afterPublic = value.split("/object/public/")[1];
    const parts = afterPublic.split("/");
    parts.shift();
    return parts.join("/");
  }

  if (value.includes("/object/sign/")) {
    const afterSign = value.split("/object/sign/")[1];
    const clean = afterSign.split("?")[0];
    const parts = clean.split("/");
    parts.shift();
    return parts.join("/");
  }

  return value;
}

function AdminOrdersContent() {
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [proofUrls, setProofUrls] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadOrders() {
    setLoading(true);

    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    const rows = data || [];
    setOrders(rows);

    const urls: Record<number, string> = {};

    for (const order of rows) {
      if (!order.payment_image) continue;

      const path = normalizeProofPath(order.payment_image);

      const { data: signed } = await supabase.storage
        .from(PAYMENT_BUCKET)
        .createSignedUrl(path, 60 * 60);

      if (signed?.signedUrl) urls[order.id] = signed.signedUrl;
    }

    setProofUrls(urls);
    setLoading(false);
  }

  async function sendCompletedEmail(order: Order) {
    if (order.status !== "Completed") return { ok: true };
    if (!order.customer_email) return { ok: false, error: "لا يوجد بريد للعميل." };
    if (!order.delivery_code?.trim()) {
      return { ok: false, error: "اكتبي Delivery Code قبل جعل الطلب مكتمل." };
    }

    const res = await fetch("/api/send-order-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: order.customer_email,
        orderId: order.id,
        productName: order.product_name,
        deliveryCode: order.delivery_code,
        deliveryNote: order.delivery_note,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { ok: false, error: json.error || "فشل إرسال البريد." };
    }

    return { ok: true };
  }

  async function updateOrder(order: Order) {
    if (order.status === "Completed" && !order.delivery_code?.trim()) {
      playSound("error");
      alert("لازم تكتبي Delivery Code قبل إكمال الطلب.");
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({
        status: order.status,
        delivery_code: order.delivery_code,
        delivery_note: order.delivery_note,
        completed_at: order.status === "Completed" ? new Date().toISOString() : null,
      })
      .eq("id", order.id);

    if (error) {
      playSound("error");
      alert(error.message);
      return;
    }

    const emailResult = await sendCompletedEmail(order);

    if (!emailResult.ok) {
      playSound("error");
      alert(`تم حفظ الطلب لكن لم يتم إرسال البريد: ${emailResult.error}`);
      loadOrders();
      return;
    }

    await supabase.from("notifications").insert({
  title: `تحديث الطلب #${order.id}`,
  message: `تم تحديث حالة طلبك إلى: ${statusLabel(order.status)}`,
  type: "order",
  order_id: order.id,
  customer_email: order.customer_email,
  customer_phone: order.customer_phone,
});

    playSound("success");

    if (order.status === "Completed") {
      alert("تم حفظ الطلب وإرسال الكود على البريد بنجاح.");
    } else {
      alert("تم حفظ التعديلات");
    }

    loadOrders();
  }

  const filtered = orders.filter((order) => {
    const q = search.toLowerCase().trim();

    if (!q) return true;

    return (
      String(order.id).includes(q) ||
      order.customer_name?.toLowerCase().includes(q) ||
      order.customer_phone?.includes(q) ||
      order.customer_email?.toLowerCase().includes(q) ||
      order.product_name?.toLowerCase().includes(q)
    );
  });

  return (
    <main className="container admin-orders-page">
      <section className="glass-card neon-border admin-orders-header">
        <div>
          <span className="badge">
            <PackageCheck size={14} />
            لوحة الأدمن
          </span>

          <h1 className="neon-text">إدارة الطلبات</h1>

          <p>مراجعة الدفع، تحديث الحالة، وإرسال كود التسليم للعميل.</p>
        </div>

        <div className="admin-search">
          <Search size={18} />
          <input
            placeholder="بحث برقم الطلب أو العميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      {loading ? (
        <div className="game-loading skeleton" />
      ) : filtered.length === 0 ? (
        <div className="glass-card orders-empty">
          <h2>لا توجد طلبات مطابقة</h2>
          <p>جربي البحث برقم طلب أو رقم هاتف مختلف.</p>
        </div>
      ) : (
        <div className="admin-orders-list">
          {filtered.map((order) => (
            <article key={order.id} className="glass-card admin-order-card">
              <div className="admin-order-head">
                <div>
                  <h2>طلب #{order.id}</h2>
                  <span>
                    {order.created_at
                      ? new Date(order.created_at).toLocaleString("ar-EG")
                      : "-"}
                  </span>
                </div>

                <div className={`admin-status ${order.status || "Pending"}`}>
                  {statusLabel(order.status)}
                </div>
              </div>

              <div className="admin-order-grid">
                <div>
                  <span>
                    <User size={15} />
                    العميل
                  </span>
                  <strong>{order.customer_name || "-"}</strong>
                </div>

                <div>
                  <span>
                    <Phone size={15} />
                    الهاتف
                  </span>
                  <strong>{order.customer_phone || "-"}</strong>
                </div>

                <div>
                  <span>
                    <Mail size={15} />
                    البريد
                  </span>
                  <strong>{order.customer_email || "-"}</strong>
                </div>

                <div>
                  <span>
                    <ClipboardList size={15} />
                    المنتج
                  </span>
                  <strong>{order.product_name || "-"}</strong>
                </div>

                <div>
                  <span>
                    <BadgeDollarSign size={15} />
                    السعر
                  </span>
                  <strong>{order.total_price || 0} ج</strong>
                </div>

                <div>
                  <span>
                    <CreditCard size={15} />
                    الدفع
                  </span>
                  <strong>{order.payment_method || "-"}</strong>
                </div>

                <div className="admin-wide">
                  <span>
                    <MessageSquareText size={15} />
                    مرجع الدفع
                  </span>
                  <strong>{order.payment_reference || "-"}</strong>
                </div>
              </div>

              {proofUrls[order.id] && (
                <div className="admin-proof-box">
                  <div className="admin-proof-head">
                    <strong>صورة التحويل</strong>

                    <a href={proofUrls[order.id]} target="_blank" rel="noreferrer">
                      فتح الصورة
                    </a>
                  </div>

                  <a
                    href={proofUrls[order.id]}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-proof-preview"
                  >
                    <img src={proofUrls[order.id]} alt={`proof-${order.id}`} />
                  </a>
                </div>
              )}

              <div className="admin-edit-section">
                <div className="admin-field">
                  <label>حالة الطلب</label>
                  <select
                    value={order.status || "Waiting Payment"}
                    onChange={(e) =>
                      setOrders((prev) =>
                        prev.map((item) =>
                          item.id === order.id
                            ? { ...item, status: e.target.value }
                            : item
                        )
                      )
                    }
                  >
                    <option value="Waiting Payment">Waiting Payment</option>
                    <option value="Processing">Processing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="admin-field">
                  <label>Delivery Code</label>
                  <input
                    placeholder="مثال: STEAM-XXXX-XXXX"
                    value={order.delivery_code || ""}
                    onChange={(e) =>
                      setOrders((prev) =>
                        prev.map((item) =>
                          item.id === order.id
                            ? { ...item, delivery_code: e.target.value }
                            : item
                        )
                      )
                    }
                  />
                </div>

                <div className="admin-field admin-wide">
                  <label>Delivery Note</label>
                  <textarea
                    placeholder="ملاحظة تظهر للعميل داخل صفحة الطلبات"
                    value={order.delivery_note || ""}
                    onChange={(e) =>
                      setOrders((prev) =>
                        prev.map((item) =>
                          item.id === order.id
                            ? { ...item, delivery_note: e.target.value }
                            : item
                        )
                      )
                    }
                  />
                </div>

                <button className="btn admin-save-btn" onClick={() => updateOrder(order)}>
                  <Save size={18} />
                  حفظ وإرسال عند الإكمال
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default function AdminOrdersPage() {
  return (
    <AdminGuard>
      <AdminOrdersContent />
    </AdminGuard>
  );
}