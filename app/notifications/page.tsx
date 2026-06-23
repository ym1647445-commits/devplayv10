"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bell,
  Clock,
  Gamepad2,
  Gift,
  Megaphone,
  PackageCheck,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/client";

type NotificationItem = {
  id: number;
  title: string | null;
  message: string | null;
  type: string | null;
  order_id?: number | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  created_at: string | null;
};

function iconByType(type?: string | null) {
  if (type === "offer") return Gift;
  if (type === "game") return Gamepad2;
  if (type === "order") return PackageCheck;
  return Megaphone;
}

function typeLabel(type?: string | null) {
  if (type === "offer") return "عرض جديد";
  if (type === "game") return "لعبة جديدة";
  if (type === "order") return "طلب";
  return "تنبيه عام";
}

function normalizeEgyptPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("20")) return `+${digits}`;
  if (digits.startsWith("0")) return `+20${digits.slice(1)}`;

  return `+20${digits}`;
}

export default function NotificationsPage() {
  const supabase = createClient();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markAsRead(latestId: number, email: string) {
    if (!email || !latestId) return;

    await supabase.from("notification_reads").upsert(
      {
        user_email: email,
        last_seen_notification_id: latestId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_email",
      }
    );
  }

  async function loadNotifications() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    const email = user?.email?.trim().toLowerCase() || "";
    const phone = normalizeEgyptPhone(user?.user_metadata?.phone || "");

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("id", { ascending: false });

    const rows = (data || []) as NotificationItem[];

    const visibleRows = rows.filter((item) => {
      if (item.type !== "order") return true;

      const itemEmail = item.customer_email?.trim().toLowerCase() || "";
      const itemPhone = normalizeEgyptPhone(item.customer_phone || "");

      if (!email && !phone) return false;

      return (email && itemEmail === email) || (phone && itemPhone === phone);
    });

    setItems(visibleRows);

    if (visibleRows.length > 0 && email) {
      await markAsRead(visibleRows[0].id, email);
    }

    setLoading(false);
  }

  return (
    <>
      <Navbar />

      <main className="container notifications-page">
        <section className="glass-card neon-border notifications-hero">
          <span className="badge">
            <Bell size={14} />
            الإشعارات
          </span>

          <h1 className="neon-text">آخر التحديثات</h1>

          <p>
            تابعي أخبار المتجر، العروض الجديدة، وتحديثات الطلبات من مكان واحد.
          </p>
        </section>

        {loading ? (
          <div className="game-loading skeleton" />
        ) : items.length === 0 ? (
          <section className="glass-card orders-empty">
            <h2>لا توجد إشعارات حاليًا</h2>
            <p>عند وجود عروض أو تحديثات جديدة ستظهر هنا.</p>

            <Link href="/products" className="btn">
              تصفح الألعاب
            </Link>
          </section>
        ) : (
          <section className="notifications-list">
            {items.map((item) => {
              const Icon = iconByType(item.type);

              return (
                <article key={item.id} className="glass-card notification-card">
                  <div className="notification-icon">
                    <Icon size={24} />
                  </div>

                  <div className="notification-content">
                    <div className="notification-meta">
                      <span>{typeLabel(item.type)}</span>

                      <small>
                        <Clock size={13} />
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString("ar-EG")
                          : "-"}
                      </small>
                    </div>

                    <h2>{item.title}</h2>
                    <p>{item.message}</p>

                    {item.order_id && (
                      <Link href="/orders" className="notification-link">
                        متابعة الطلب #{item.order_id}
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <div className="bottom-space" />
      </main>

      <BottomNav />
    </>
  );
}