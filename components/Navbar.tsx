"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bell,
  Gamepad2,
  LogIn,
  LogOut,
  Search,
  ShieldCheck,
  User2,
} from "lucide-react";
import { motion } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [notificationsCount, setNotificationsCount] = useState(0);

  useEffect(() => {
    loadNavbar();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        loadUnreadCount(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadNavbar() {
    const { data: userData } = await supabase.auth.getUser();
    setUser(userData.user);
    await loadUnreadCount(userData.user);
  }

  async function loadUnreadCount(currentUser: User | null) {
    const email = currentUser?.email?.trim().toLowerCase();

    const { data: latest } = await supabase
      .from("notifications")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestId = latest?.id || 0;

    if (!latestId) {
      setNotificationsCount(0);
      return;
    }

    if (!email) {
      setNotificationsCount(latestId);
      return;
    }

    const { data: readData } = await supabase
      .from("notification_reads")
      .select("last_seen_notification_id")
      .eq("user_email", email)
      .maybeSingle();

    const lastSeen = readData?.last_seen_notification_id || 0;

    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .gt("id", lastSeen);

    setNotificationsCount(count || 0);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45 }}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(7, 11, 22, 0.72)",
        backdropFilter: "blur(22px)",
        borderBottom: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <div
        className="container"
        style={{
          height: 82,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="icon-btn pulse-glow">
            <Gamepad2 size={22} />
          </div>

          <div>
            <h1
              className="neon-text"
              style={{ fontSize: 28, fontWeight: 950, lineHeight: 1 }}
            >
              DevPlay
            </h1>
            <span style={{ color: "#8ea6d9", fontSize: 13, fontWeight: 700 }}>
              Digital Gaming Store
            </span>
          </div>
        </Link>

        <nav className="desktop-nav">
          <Link href="/">الرئيسية</Link>
          <Link href="/products">الألعاب</Link>
          <Link href="/orders">طلباتي</Link>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/products" className="icon-btn" aria-label="Search">
            <Search size={20} />
          </Link>

          <Link
            href="/notifications"
            className="icon-btn"
            aria-label="Notifications"
            style={{ position: "relative" }}
          >
            <Bell size={20} />

            {notificationsCount > 0 && (
              <span className="nav-notification-badge">
                {notificationsCount > 99 ? "99+" : notificationsCount}
              </span>
            )}
          </Link>

          {user ? (
            <>
              <Link href="/account" className="icon-btn" aria-label="Account">
                <User2 size={20} />
              </Link>

              <button onClick={logout} className="icon-btn" aria-label="Logout">
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <Link href="/auth/login" className="icon-btn" aria-label="Login">
              <LogIn size={20} />
            </Link>
          )}

          {user?.email === "yasovip0123@gmail.com" && (
  <Link href="/admin" className="admin-pill">
    <ShieldCheck size={17} />
    Admin
  </Link>
)}
        </div>
      </div>
    </motion.header>
  );
}