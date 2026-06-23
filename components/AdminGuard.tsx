"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData.user?.email?.trim().toLowerCase() || "";

    setEmail(userEmail);

    if (!userEmail) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("admin_users")
      .select("id,email,active")
      .ilike("email", userEmail)
      .eq("active", true)
      .maybeSingle();

    console.log("ADMIN CHECK:", { userEmail, data, error });

    setAllowed(!!data && !error);
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="container">
        <div className="game-loading skeleton" />
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="container">
        <section className="glass-card neon-border admin-denied">
          <ShieldAlert size={60} />
          <h1>غير مصرح بالدخول</h1>
          <p>الإيميل الحالي: {email || "غير مسجل دخول"}</p>
          <Link href="/auth/login" className="btn">
            تسجيل الدخول
          </Link>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}