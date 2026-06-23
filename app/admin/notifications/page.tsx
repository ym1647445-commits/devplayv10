"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Plus,
  Search,
  Trash2,
  Megaphone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AdminGuard from "@/components/AdminGuard";
import { playSound } from "@/lib/playSound";

type Notification = {
  id: number;
  title: string | null;
  message: string | null;
  type: string | null;
  created_at: string | null;
};

function AdminNotificationsContent() {
  const supabase = createClient();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("general");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    setNotifications(data || []);
    setLoading(false);
  }

  async function publishNotification() {
    if (!title.trim() || !message.trim()) {
      alert("اكتبي العنوان والرسالة");
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .insert({
        title,
        message,
        type,
      });

    if (error) {
      playSound("error");
      alert(error.message);
      return;
    }

    playSound("success");

    setTitle("");
    setMessage("");
    setType("general");

    loadNotifications();
  }

  async function deleteNotification(id: number) {
    const ok = confirm("حذف الإشعار؟");

    if (!ok) return;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadNotifications();
  }

  const filtered = notifications.filter((item) => {
    const q = search.toLowerCase();

    return (
      item.title?.toLowerCase().includes(q) ||
      item.message?.toLowerCase().includes(q)
    );
  });

  return (
    <main className="container admin-notifications-page">
      <section className="glass-card neon-border admin-notifications-header">
        <div>
          <span className="badge">
            <Bell size={14} />
            الإشعارات
          </span>

          <h1 className="neon-text">
            إدارة الإشعارات
          </h1>

          <p>
            إرسال إشعارات عامة لجميع العملاء.
          </p>
        </div>

        <div className="admin-search">
          <Search size={18} />

          <input
            placeholder="بحث في الإشعارات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <section className="glass-card admin-add-notification">
        <h2>
          إضافة إشعار جديد
        </h2>

        <input
          placeholder="عنوان الإشعار"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="محتوى الإشعار"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="general">
            عام
          </option>

          <option value="offer">
            عرض
          </option>

          <option value="game">
            لعبة جديدة
          </option>

          <option value="news">
            خبر
          </option>
        </select>

        <button
          className="btn"
          onClick={publishNotification}
        >
          <Plus size={18} />
          نشر الإشعار
        </button>
      </section>

      {loading ? (
        <div className="game-loading skeleton" />
      ) : (
        <section className="admin-notifications-list">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="glass-card admin-notification-card"
            >
              <div className="admin-notification-top">
                <div>
                  <h3>{item.title}</h3>

                  <span>
                    {item.created_at
                      ? new Date(
                          item.created_at
                        ).toLocaleString("ar-EG")
                      : "-"}
                  </span>
                </div>

                <button
                  className="admin-delete-btn"
                  onClick={() =>
                    deleteNotification(item.id)
                  }
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="notification-type">
                <Megaphone size={15} />
                {item.type}
              </div>

              <p>{item.message}</p>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

export default function AdminNotificationsPage() {
  return (
    <AdminGuard>
      <AdminNotificationsContent />
    </AdminGuard>
  );
}