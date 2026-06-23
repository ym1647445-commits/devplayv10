"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Headphones,
  Lightbulb,
  PlusCircle,
  Save,
  Search,
  Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { playSound } from "@/lib/playSound";
import AdminGuard from "@/components/AdminGuard";

type SupportRequest = {
  id: number;
  type: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  title: string | null;
  message: string | null;
  suggested_game: string | null;
  status: string | null;
  admin_note: string | null;
  created_at: string | null;
};

function typeLabel(type: string) {
  if (type === "complaint") return "بلاغ / مشكلة";
  if (type === "add_game") return "إضافة لعبة";
  if (type === "suggestion") return "اقتراح عام";
  return "دعم فني";
}

function typeIcon(type: string) {
  if (type === "complaint") return <AlertTriangle size={18} />;
  if (type === "add_game") return <PlusCircle size={18} />;
  if (type === "suggestion") return <Lightbulb size={18} />;
  return <Headphones size={18} />;
}

function AdminSupportContent() {
  const supabase = createClient();

  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<number | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);

    const { data } = await supabase
      .from("support_requests")
      .select("*")
      .order("created_at", { ascending: false });

    setRequests(data || []);
    setLoading(false);
  }

  async function sendReplyEmail(item: SupportRequest) {
    if (!item.customer_email) {
      return { ok: false, error: "لا يوجد بريد للعميل." };
    }

    if (!item.admin_note?.trim()) {
      return { ok: false, error: "اكتبي رد الإدارة أولًا." };
    }

    const res = await fetch("/api/send-support-reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: item.customer_email,
        requestId: item.id,
        title: item.title,
        message: item.message,
        adminReply: item.admin_note,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { ok: false, error: json.error || "فشل إرسال البريد." };
    }

    return { ok: true };
  }

  async function saveRequest(item: SupportRequest) {
    setSendingId(item.id);

    const { error } = await supabase
      .from("support_requests")
      .update({
        status: item.status,
        admin_note: item.admin_note,
      })
      .eq("id", item.id);

    if (error) {
      setSendingId(null);
      playSound("error");
      alert(error.message);
      return;
    }

    let emailMessage = "";

    if (item.admin_note?.trim()) {
      const emailResult = await sendReplyEmail(item);

      if (!emailResult.ok) {
        setSendingId(null);
        playSound("error");
        alert(`تم حفظ الرد لكن لم يتم إرسال البريد: ${emailResult.error}`);
        loadRequests();
        return;
      }

      emailMessage = " وتم إرسال الرد على البريد";
    }

    setSendingId(null);
    playSound("success");
    alert(`تم حفظ الرسالة${emailMessage}`);
    loadRequests();
  }

  const filtered = requests.filter((item) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;

    return (
      item.customer_name?.toLowerCase().includes(q) ||
      item.customer_phone?.includes(q) ||
      item.customer_email?.toLowerCase().includes(q) ||
      item.title?.toLowerCase().includes(q) ||
      item.message?.toLowerCase().includes(q) ||
      item.suggested_game?.toLowerCase().includes(q) ||
      String(item.id).includes(q)
    );
  });

  return (
    <main className="container admin-support-page">
      <section className="glass-card neon-border admin-support-header">
        <div>
          <span className="badge">
            <Headphones size={14} />
            الدعم الفني
          </span>

          <h1 className="neon-text">رسائل العملاء</h1>

          <p>تابعي البلاغات، الاقتراحات، وارسلي رد الإدارة على بريد العميل.</p>
        </div>

        <div className="admin-search">
          <Search size={18} />
          <input
            placeholder="بحث في الرسائل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      {loading ? (
        <div className="game-loading skeleton" />
      ) : filtered.length === 0 ? (
        <div className="glass-card orders-empty">
          <h2>لا توجد رسائل</h2>
          <p>لا توجد رسائل دعم مطابقة للبحث.</p>
        </div>
      ) : (
        <section className="admin-support-list">
          {filtered.map((item) => (
            <article key={item.id} className="glass-card admin-support-card">
              <div className="admin-support-top">
                <div className="support-type-badge">
                  {typeIcon(item.type)}
                  {typeLabel(item.type)}
                </div>

                <span>
                  #{item.id} ·{" "}
                  {item.created_at
                    ? new Date(item.created_at).toLocaleString("ar-EG")
                    : "-"}
                </span>
              </div>

              <h2>{item.title}</h2>

              <div className="admin-support-meta">
                <div>
                  <span>الاسم</span>
                  <strong>{item.customer_name || "-"}</strong>
                </div>

                <div>
                  <span>الهاتف</span>
                  <strong>{item.customer_phone || "-"}</strong>
                </div>

                <div>
                  <span>البريد</span>
                  <strong>{item.customer_email || "-"}</strong>
                </div>

                {item.suggested_game && (
                  <div>
                    <span>اللعبة المقترحة</span>
                    <strong>{item.suggested_game}</strong>
                  </div>
                )}
              </div>

              <div className="support-message-box">
                <span>رسالة العميل</span>
                <p>{item.message}</p>
              </div>

              <div className="admin-support-edit">
                <select
                  value={item.status || "pending"}
                  onChange={(e) =>
                    setRequests((prev) =>
                      prev.map((r) =>
                        r.id === item.id ? { ...r, status: e.target.value } : r
                      )
                    )
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>

                <textarea
                  placeholder="اكتبي رد الإدارة هنا وسيتم إرساله للبريد عند الحفظ"
                  value={item.admin_note || ""}
                  onChange={(e) =>
                    setRequests((prev) =>
                      prev.map((r) =>
                        r.id === item.id
                          ? { ...r, admin_note: e.target.value }
                          : r
                      )
                    )
                  }
                />

                <button
                  className="btn"
                  onClick={() => saveRequest(item)}
                  disabled={sendingId === item.id}
                >
                  {sendingId === item.id ? (
                    <>
                      <Send size={18} />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      حفظ وإرسال الرد
                    </>
                  )}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default function AdminSupportPage() {
  return (
    <AdminGuard>
      <AdminSupportContent />
    </AdminGuard>
  );
}