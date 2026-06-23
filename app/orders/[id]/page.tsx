"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: number;
  product_name: string | null;
  total_price: number | null;
  status: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  delivery_code: string | null;
  delivery_note: string | null;
  created_at: string | null;
};

function statusArabic(status?: string | null) {
  if (status === "Completed") return "مكتمل";
  if (status === "Processing") return "قيد التنفيذ";
  if (status === "Cancelled") return "ملغي";
  if (status === "Waiting Payment") return "مراجعة الدفع";
  return "قيد الانتظار";
}

export default function OrderDetailsPage() {
  const params = useParams();
  const supabase = createClient();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, []);

  async function loadOrder() {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("id", Number(params.id))
      .single();

    setOrder(data);
    setLoading(false);
  }

  return (
    <>
      <Navbar />

      <main className="container" style={{ paddingTop: 20 }}>
        {loading ? (
          <div className="game-loading skeleton" />
        ) : !order ? (
          <div className="glass-card orders-empty">
            <h2>الطلب غير موجود</h2>
          </div>
        ) : (
          <>
            <div className="glass-card neon-border" style={{ padding: 20 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 15,
                }}
              >
                <h2>طلب #{order.id}</h2>

                <div className={`admin-status ${order.status}`}>
                  {statusArabic(order.status)}
                </div>
              </div>

              <div className="account-mini-info">
                <div>
                  <PackageCheck size={18} />
                  <span>المنتج</span>
                  <strong>{order.product_name}</strong>
                </div>

                <div>
                  <CreditCard size={18} />
                  <span>السعر</span>
                  <strong>{order.total_price} ج</strong>
                </div>

                <div>
                  <Clock size={18} />
                  <span>التاريخ</span>
                  <strong>
                    {order.created_at
                      ? new Date(order.created_at).toLocaleDateString("ar-EG")
                      : "-"}
                  </strong>
                </div>

                <div>
                  <ShieldCheck size={18} />
                  <span>الدفع</span>
                  <strong>{order.payment_method || "-"}</strong>
                </div>
              </div>
            </div>

            {order.delivery_code && (
              <div
                className="glass-card neon-border"
                style={{
                  padding: 20,
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                <CheckCircle2
                  size={36}
                  style={{ marginBottom: 10 }}
                />

                <h3>كود التسليم</h3>

                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: "#00D4FF",
                    marginTop: 12,
                    wordBreak: "break-word",
                  }}
                >
                  {order.delivery_code}
                </div>

                {order.delivery_note && (
                  <p
                    style={{
                      marginTop: 16,
                      color: "#b6c5e1",
                    }}
                  >
                    {order.delivery_note}
                  </p>
                )}
              </div>
            )}

            <div
              style={{
                marginTop: 18,
                marginBottom: 80,
              }}
            >
              <Link href="/orders" className="btn">
                العودة للطلبات
              </Link>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </>
  );
}