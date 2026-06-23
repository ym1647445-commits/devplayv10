"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Bell,
  Boxes,
  ClipboardList,
  Headphones,
  PackageCheck,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AdminGuard from "@/components/AdminGuard";

type Order = {
  id: number;
  total_price: number | null;
  status: string | null;
  created_at: string | null;
};

type Product = {
  id: number;
  active: boolean | null;
};

type SupportRequest = {
  id: number;
  status: string | null;
};

function AdminDashboardContent() {
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [support, setSupport] = useState<SupportRequest[]>([]);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const [
      { data: orderRows },
      { data: productRows },
      { data: supportRows },
      { count },
    ] = await Promise.all([
      supabase.from("orders").select("id,total_price,status,created_at"),
      supabase.from("products").select("id,active"),
      supabase.from("support_requests").select("id,status"),
      supabase.from("notifications").select("*", { count: "exact", head: true }),
    ]);

    setOrders(orderRows || []);
    setProducts(productRows || []);
    setSupport(supportRows || []);
    setNotificationsCount(count || 0);
    setLoading(false);
  }

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const waiting = orders.filter((o) => o.status === "Waiting Payment").length;
    const processing = orders.filter((o) => o.status === "Processing").length;
    const completed = orders.filter((o) => o.status === "Completed").length;
    const cancelled = orders.filter((o) => o.status === "Cancelled").length;

    const revenue = orders
      .filter((o) => o.status === "Completed")
      .reduce((sum, o) => sum + Number(o.total_price || 0), 0);

    const pendingSupport = support.filter((s) => s.status === "pending").length;
    const activeProducts = products.filter((p) => p.active).length;

    return {
      totalOrders,
      waiting,
      processing,
      completed,
      cancelled,
      revenue,
      pendingSupport,
      activeProducts,
      totalProducts: products.length,
    };
  }, [orders, products, support]);

  if (loading) {
    return (
      <main className="container admin-dashboard-page">
        <div className="game-loading skeleton" />
      </main>
    );
  }

  return (
    <main className="container admin-dashboard-page">
      <section className="glass-card neon-border admin-dashboard-hero">
        <div>
          <span className="badge">
            <Settings size={14} />
            لوحة التحكم
          </span>

          <h1 className="neon-text">DevPlay Admin</h1>

          <p>إدارة الطلبات والمنتجات والدعم والإشعارات من مكان واحد.</p>
        </div>

        <Link href="/admin/orders" className="btn admin-hero-btn">
          <ClipboardList size={18} />
          إدارة الطلبات
        </Link>
      </section>

      <section className="admin-dashboard-stats">
        <div className="glass-card admin-stat-card">
          <ShoppingBag />
          <span>إجمالي الطلبات</span>
          <strong>{stats.totalOrders}</strong>
        </div>

        <div className="glass-card admin-stat-card warning">
          <BadgeDollarSign />
          <span>مبيعات مكتملة</span>
          <strong>{stats.revenue} ج</strong>
        </div>

        <div className="glass-card admin-stat-card info">
          <Boxes />
          <span>المنتجات النشطة</span>
          <strong>
            {stats.activeProducts}/{stats.totalProducts}
          </strong>
        </div>

        <div className="glass-card admin-stat-card danger">
          <Headphones />
          <span>رسائل دعم معلقة</span>
          <strong>{stats.pendingSupport}</strong>
        </div>
      </section>

      <section className="admin-dashboard-grid">
        <div className="glass-card admin-panel">
          <h2>حالات الطلبات</h2>

          <div className="admin-status-list">
            <div>
              <span>مراجعة الدفع</span>
              <strong>{stats.waiting}</strong>
            </div>

            <div>
              <span>قيد التنفيذ</span>
              <strong>{stats.processing}</strong>
            </div>

            <div>
              <span>مكتملة</span>
              <strong>{stats.completed}</strong>
            </div>

            <div>
              <span>ملغية</span>
              <strong>{stats.cancelled}</strong>
            </div>
          </div>
        </div>

        <div className="glass-card admin-panel">
          <h2>اختصارات الإدارة</h2>

          <div className="admin-shortcuts">
            <Link href="/admin/orders">
              <PackageCheck size={20} />
              الطلبات
            </Link>

            <Link href="/admin/products">
              <Boxes size={20} />
              المنتجات
            </Link>

            <Link href="/admin/notifications">
              <Bell size={20} />
              الإشعارات ({notificationsCount})
            </Link>

            <Link href="/admin/support">
              <Headphones size={20} />
              الدعم الفني
            </Link>

            <Link href="/admin/settings">
              <Settings size={20} />
              الإعدادات
            </Link>

            <Link href="/admin/users">
              <Users size={20} />
              المستخدمين
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
}