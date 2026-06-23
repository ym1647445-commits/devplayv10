"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  PackageCheck,
  Copy,
  CreditCard,
  Image as ImageIcon,
  Eye,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: number;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  product_name: string | null;
  total_price: number | null;
  status: string | null;
  created_at: string | null;
  delivery_code: string | null;
  delivery_note: string | null;
  payment_method: string | null;
  payment_image: string | null;
};

function statusInfo(status?: string | null) {
  if (status === "Completed") {
    return { label: "مكتمل", icon: CheckCircle2, className: "completed" };
  }

  if (status === "Processing") {
    return { label: "قيد التنفيذ", icon: Loader2, className: "processing" };
  }

  if (status === "Cancelled") {
    return { label: "ملغي", icon: XCircle, className: "cancelled" };
  }

  if (status === "Waiting Payment") {
    return { label: "مراجعة الدفع", icon: CreditCard, className: "waiting" };
  }

  return { label: "قيد الانتظار", icon: Clock, className: "pending" };
}

export default function OrdersPage() {
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [openOrder, setOpenOrder] = useState<number | null>(null);

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadOrders() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    const email = user?.email?.trim().toLowerCase() || "";

    if (!user || !email) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_email", email)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("ORDERS ERROR:", error.message);
      setOrders([]);
      setLoading(false);
      return;
    }

    setOrders(data || []);
    setLoading(false);
  }

  return (
    <>
      <Navbar />

      <main className="container orders-page-compact">
        <section className="orders-header glass-card neon-border orders-compact-hero">
          <span className="badge">
            <PackageCheck size={14} />
            طلباتي
          </span>

          <h1 className="neon-text">متابعة الطلبات</h1>

          <p>هنا تظهر الطلبات المرتبطة ببريد حسابك فقط.</p>
        </section>

        <section className="section">
          {loading ? (
            <div className="game-loading skeleton" />
          ) : orders.length === 0 ? (
            <div className="glass-card orders-empty">
              <h2>لا توجد طلبات</h2>
              <p>أي طلب يتم بنفس بريد حسابك سيظهر هنا تلقائيًا.</p>

              <Link href="/products" className="btn">
                تصفح الألعاب
              </Link>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order, index) => {
                const info = statusInfo(order.status);
                const Icon = info.icon;
                const isOpen = openOrder === order.id;

                return (
                  <motion.div
                    key={order.id}
                    className="order-card glass-card order-card-compact"
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <div className="order-top">
                      <div>
                        <span>طلب رقم</span>
                        <h3>#{order.id}</h3>
                      </div>

                      <div className={`order-status ${info.className}`}>
                        <Icon size={15} />
                        {info.label}
                      </div>
                    </div>

                    <div className="order-main">
                      <h2>{order.product_name}</h2>
                      <strong>{order.total_price} ج</strong>
                    </div>

                    <div className="order-compact-actions">
                      <button
                        className="order-expand-btn"
                        onClick={() => setOpenOrder(isOpen ? null : order.id)}
                      >
                        <Eye size={16} />
                        {isOpen ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                      </button>

                      <Link href={`/orders/${order.id}`} className="order-details-link">
                        صفحة الطلب
                      </Link>
                    </div>

                    {isOpen && (
                      <>
                        <div className="order-details">
                          <div>
                            <span>الاسم</span>
                            <strong>{order.customer_name || "-"}</strong>
                          </div>

                          <div>
                            <span>رقم التواصل</span>
                            <strong>{order.customer_phone || "-"}</strong>
                          </div>

                          <div>
                            <span>طريقة الدفع</span>
                            <strong>{order.payment_method || "-"}</strong>
                          </div>

                          <div>
                            <span>التاريخ</span>
                            <strong>
                              {order.created_at
                                ? new Date(order.created_at).toLocaleString("ar-EG")
                                : "-"}
                            </strong>
                          </div>
                        </div>

                        {order.payment_image && (
                          <div className="payment-proof-note">
                            <ImageIcon size={17} />
                            تم استلام صورة التحويل وسيتم مراجعتها.
                          </div>
                        )}

                        {(order.delivery_code || order.delivery_note) && (
                          <div className="delivery-box">
                            <h4>بيانات التسليم</h4>

                            {order.delivery_code && (
                              <div className="delivery-code">
                                <strong>{order.delivery_code}</strong>

                                <button
                                  onClick={() =>
                                    navigator.clipboard.writeText(order.delivery_code || "")
                                  }
                                >
                                  <Copy size={15} />
                                  نسخ
                                </button>
                              </div>
                            )}

                            {order.delivery_note && <p>{order.delivery_note}</p>}
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        <div className="bottom-space" />
      </main>

      <BottomNav />
    </>
  );
}