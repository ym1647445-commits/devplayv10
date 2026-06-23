"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Gamepad2,
  Headphones,
  KeyRound,
  Lightbulb,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  PackageCheck,
  Phone,
  PlusCircle,
  Send,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/client";
import { playSound } from "@/lib/playSound";

type Order = {
  id: number;
  product_name: string | null;
  total_price: number | null;
  status: string | null;
  created_at: string | null;
};

function normalizeEgyptPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("20")) return `+${digits}`;
  if (digits.startsWith("0")) return `+20${digits.slice(1)}`;

  return `+20${digits}`;
}

function displayLocalPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("20")) return digits.slice(2);
  if (digits.startsWith("0")) return digits;

  return digits;
}

function statusArabic(status?: string | null) {
  if (status === "Completed") return "مكتمل";
  if (status === "Processing") return "قيد التنفيذ";
  if (status === "Cancelled") return "ملغي";
  if (status === "Waiting Payment") return "بانتظار الدفع";
  return "قيد الانتظار";
}

export default function AccountPage() {
  const supabase = createClient();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [supportType, setSupportType] = useState("support");
  const [supportTitle, setSupportTitle] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [suggestedGame, setSuggestedGame] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [sendingSupport, setSendingSupport] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const normalizedPhone = normalizeEgyptPhone(phone);

  const stats = useMemo(() => {
    const total = orders.length;
    const completed = orders.filter((o) => o.status === "Completed").length;
    const cancelled = orders.filter((o) => o.status === "Cancelled").length;
    const active = orders.filter(
      (o) => o.status === "Waiting Payment" || o.status === "Processing"
    ).length;

    return { total, completed, cancelled, active };
  }, [orders]);

  useEffect(() => {
    loadAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAccount() {
    setLoading(true);

    const { data } = await supabase.auth.getUser();
    const currentUser = data.user;

    if (!currentUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    setUser(currentUser);

    const metaName =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      "";

    const metaPhone = currentUser.user_metadata?.phone || "";

    setFullName(metaName);
    setPhone(displayLocalPhone(metaPhone));

    await loadOrders(currentUser.email || "", normalizeEgyptPhone(metaPhone));

    setLoading(false);
  }

  async function loadOrders(email: string, phoneValue: string) {
  let query = supabase
    .from("orders")
    .select("id,product_name,total_price,status,created_at")
    .order("created_at", { ascending: false });

  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phoneValue.trim();

  if (cleanEmail && cleanPhone) {
    query = query.or(
      `customer_email.eq.${cleanEmail},customer_phone.eq.${cleanPhone}`
    );
  } else if (cleanEmail) {
    query = query.eq("customer_email", cleanEmail);
  } else if (cleanPhone) {
    query = query.eq("customer_phone", cleanPhone);
  } else {
    setOrders([]);
    return;
  }

  const { data, error } = await query;

  if (error) {
    console.log("ACCOUNT ORDERS ERROR:", error.message);
    setOrders([]);
    return;
  }

  setOrders(data || []);
}

  async function saveProfile() {
    if (!user) return;

    setMessage("");
    setErrorMsg("");
    setSavingProfile(true);

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        phone: normalizedPhone,
      },
    });

    setSavingProfile(false);

    if (error) {
      playSound("error");
      setErrorMsg(error.message);
      return;
    }

    playSound("success");
    setMessage("تم تحديث بيانات الحساب بنجاح.");
    await loadAccount();
  }

  async function changePassword() {
    setMessage("");
    setErrorMsg("");

    if (newPassword.length < 6) {
      playSound("error");
      setErrorMsg("كلمة المرور يجب ألا تقل عن 6 أحرف.");
      return;
    }

    if (newPassword !== confirmPassword) {
      playSound("error");
      setErrorMsg("كلمة المرور وتأكيدها غير متطابقين.");
      return;
    }

    setChangingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setChangingPassword(false);

    if (error) {
      playSound("error");
      setErrorMsg(error.message);
      return;
    }

    playSound("success");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("تم تغيير كلمة المرور بنجاح.");
  }

  async function sendSupportRequest() {
    setMessage("");
    setErrorMsg("");

    if (!supportTitle.trim() || !supportMessage.trim()) {
      playSound("error");
      setErrorMsg("اكتب عنوان وتفاصيل الرسالة.");
      return;
    }

    if (supportType === "add_game" && !suggestedGame.trim()) {
      playSound("error");
      setErrorMsg("اكتب اسم اللعبة المقترحة.");
      return;
    }

    setSendingSupport(true);

    const { error } = await supabase.from("support_requests").insert({
      type: supportType,
      customer_name: fullName,
      customer_phone: normalizedPhone,
      customer_email: user?.email,
      title: supportTitle,
      message: supportMessage,
      suggested_game: supportType === "add_game" ? suggestedGame : null,
      status: "pending",
    });

    setSendingSupport(false);

    if (error) {
      playSound("error");
      setErrorMsg(error.message);
      return;
    }

    playSound("success");
    setSupportTitle("");
    setSupportMessage("");
    setSuggestedGame("");
    setMessage("تم إرسال رسالتك بنجاح للإدارة.");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="account-page container">
          <div className="game-loading skeleton" />
        </main>
        <BottomNav />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar />

        <main className="account-page container">
          <section className="account-guest glass-card neon-border">
            <div className="account-avatar guest">
              <User size={58} />
            </div>

            <h1 className="neon-text">تسجيل الدخول مطلوب</h1>

            <p>
              سجلي دخولك أو أنشئي حساب جديد علشان تقدري تتابعي طلباتك وبيانات حسابك.
            </p>

            <div className="success-actions">
              <Link href="/auth/login" className="btn">
                تسجيل الدخول
              </Link>

              <Link href="/auth/register" className="auth-back">
                إنشاء حساب
              </Link>
            </div>
          </section>
        </main>

        <BottomNav />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="account-page container">
        <section className="account-top-grid">
          <div className="account-hero glass-card neon-border">
            <div className="account-avatar">
              <Gamepad2 size={58} />
            </div>

            <div className="account-hero-content">
              <span className="badge">
                <ShieldCheck size={14} />
                حساب موثق
              </span>

              <h1 className="neon-text">أهلًا، {fullName || "DevPlayer"}</h1>

              <p>مرحبًا بك في حسابك الشخصي داخل DevPlay.</p>

              <div className="account-mini-info">
                <div>
                  <Clock size={18} />
                  <span>تاريخ الانضمام</span>
                  <strong>
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString("ar-EG")
                      : "-"}
                  </strong>
                </div>

                <div>
                  <ShieldCheck size={18} />
                  <span>حالة الحساب</span>
                  <strong>مفعل</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="account-quick glass-card">
            <span className="badge">
              <BadgeCheck size={14} />
              اختصارات سريعة
            </span>

            <a href="#profile">
              تعديل البيانات
              <User size={18} />
            </a>

            <a href="#security">
              تغيير كلمة المرور
              <KeyRound size={18} />
            </a>

            <button onClick={logout}>
              تسجيل الخروج
              <LogOut size={18} />
            </button>
          </div>
        </section>

        {(message || errorMsg) && (
          <div className={errorMsg ? "account-alert error" : "account-alert success"}>
            {errorMsg || message}
          </div>
        )}

        <section className="account-stats">
          <motion.div className="account-stat glass-card" whileHover={{ y: -5 }}>
            <PackageCheck />
            <div>
              <strong>{stats.total}</strong>
              <span>إجمالي الطلبات</span>
            </div>
          </motion.div>

          <motion.div className="account-stat glass-card" whileHover={{ y: -5 }}>
            <Loader2 />
            <div>
              <strong>{stats.active}</strong>
              <span>قيد التنفيذ</span>
            </div>
          </motion.div>

          <motion.div className="account-stat glass-card" whileHover={{ y: -5 }}>
            <CheckCircle2 />
            <div>
              <strong>{stats.completed}</strong>
              <span>مكتملة</span>
            </div>
          </motion.div>

          <motion.div className="account-stat glass-card" whileHover={{ y: -5 }}>
            <XCircle />
            <div>
              <strong>{stats.cancelled}</strong>
              <span>ملغية</span>
            </div>
          </motion.div>
        </section>

        <section className="account-grid">
          <div id="profile" className="account-box glass-card">
            <div className="account-box-head">
              <span className="badge">
                <User size={14} />
                البيانات الشخصية
              </span>

              <h2>معلومات الحساب</h2>
            </div>

            <label className="auth-field">
              <span>
                <User size={16} />
                الاسم
              </span>
              <input
                placeholder="اسمك"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>

            <label className="auth-field">
              <span>
                <Phone size={16} />
                رقم الهاتف
              </span>

              <div className="phone-input-wrap">
                <div className="country-code">
                  <span>مصر</span>
                  <strong>+20</strong>
                </div>

                <input
                  type="tel"
                  placeholder="1012345678"
                  value={displayLocalPhone(phone)}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </label>

            <label className="auth-field">
              <span>
                <Mail size={16} />
                البريد الإلكتروني
              </span>
              <input value={user.email || ""} disabled />
            </label>

            <button
              className="btn account-main-btn"
              onClick={saveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? "جاري الحفظ..." : "حفظ البيانات"}
              <BadgeCheck size={18} />
            </button>
          </div>

          <div id="security" className="account-box glass-card">
            <div className="account-box-head">
              <span className="badge">
                <KeyRound size={14} />
                الأمان
              </span>

              <h2>تغيير كلمة المرور</h2>
            </div>

            <p className="account-muted">
              هذه الطريقة تغيّر كلمة المرور مباشرة لأنك مسجلة دخول بالفعل.
            </p>

            <label className="auth-field">
              <span>
                <KeyRound size={16} />
                كلمة المرور الجديدة
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>

            <label className="auth-field">
              <span>
                <KeyRound size={16} />
                تأكيد كلمة المرور
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>

            <button
              className="btn account-main-btn"
              onClick={changePassword}
              disabled={changingPassword}
            >
              {changingPassword ? "جاري التغيير..." : "تغيير كلمة المرور"}
              <ShieldCheck size={18} />
            </button>

            <button className="account-logout" onClick={logout}>
              <LogOut size={18} />
              تسجيل الخروج
            </button>
          </div>
        </section>

        <section className="account-help glass-card">
          <div className="account-help-head">
            <div>
              <span className="badge">
                <Headphones size={14} />
                تحتاج مساعدة؟
              </span>

              <h2>مركز الدعم</h2>

              <p>تواصل معنا واتساب أو ارسل بلاغ / مشكلة / اقتراح.</p>
            </div>

            <a
              href="https://wa.me/201035966569"
              target="_blank"
              className="whatsapp-btn"
            >
              <MessageCircle size={18} />
              واتساب 01035966569
            </a>
          </div>

          <div className="support-types">
            <button
              onClick={() => setSupportType("support")}
              className={supportType === "support" ? "active" : ""}
            >
              <Headphones size={16} />
              دعم
            </button>

            <button
              onClick={() => setSupportType("complaint")}
              className={supportType === "complaint" ? "active" : ""}
            >
              <AlertTriangle size={16} />
              بلاغ / مشكلة
            </button>

            <button
              onClick={() => setSupportType("add_game")}
              className={supportType === "add_game" ? "active" : ""}
            >
              <PlusCircle size={16} />
              إضافة لعبة
            </button>

            <button
              onClick={() => setSupportType("suggestion")}
              className={supportType === "suggestion" ? "active" : ""}
            >
              <Lightbulb size={16} />
              اقتراح عام
            </button>
          </div>

          {supportType === "add_game" && (
            <input
              placeholder="اسم اللعبة المقترحة"
              value={suggestedGame}
              onChange={(e) => setSuggestedGame(e.target.value)}
            />
          )}

          <input
            placeholder="عنوان الرسالة"
            value={supportTitle}
            onChange={(e) => setSupportTitle(e.target.value)}
          />

          <textarea
            placeholder="اكتب التفاصيل..."
            value={supportMessage}
            onChange={(e) => setSupportMessage(e.target.value)}
          />

          <button
            className="btn account-main-btn"
            onClick={sendSupportRequest}
            disabled={sendingSupport}
          >
            {sendingSupport ? "جاري الإرسال..." : "إرسال للإدارة"}
            <Send size={18} />
          </button>
        </section>

        <section className="section">
          <div className="account-section-head">
            <span className="badge">
              <Clock size={14} />
              آخر الطلبات
            </span>

            <Link href="/orders">عرض كل الطلبات</Link>
          </div>

          {orders.length === 0 ? (
            <div className="glass-card orders-empty">
              <h2>لا توجد طلبات مرتبطة بحسابك</h2>
              <p>ابدئي طلب جديد وسيظهر هنا تلقائيًا بعد تسجيل نفس البريد أو الرقم.</p>

              <Link href="/products" className="btn">
                تصفح الألعاب
              </Link>
            </div>
          ) : (
            <div className="account-orders">
              {orders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  href="/orders"
                  className="account-order-card glass-card hover-lift"
                >
                  <div>
                    <span>#{order.id}</span>
                    <h3>{order.product_name}</h3>
                  </div>

                  <div>
                    <strong>{order.total_price} ج</strong>
                    <small>{statusArabic(order.status)}</small>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="bottom-space" />
      </main>

      <BottomNav />
    </>
  );
}