"use client";

import { useEffect, useState } from "react";
import { Wrench, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SiteSettings = {
  maintenance_mode: boolean | null;
  site_name: string | null;
  whatsapp: string | null;
};

export default function MaintenanceGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkMaintenance();
  }, []);

  async function checkMaintenance() {
    const { data: settingsData } = await supabase
      .from("site_settings")
      .select("maintenance_mode,site_name,whatsapp")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    setSettings(settingsData);

    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email?.trim().toLowerCase();

    if (email) {
      const { data: adminData } = await supabase
        .from("admin_users")
        .select("id")
        .ilike("email", email)
        .eq("active", true)
        .maybeSingle();

      setIsAdmin(!!adminData);
    }

    setLoading(false);
  }

  if (loading) {
    return <>{children}</>;
  }

  if (settings?.maintenance_mode && !isAdmin) {
    const whatsapp = settings.whatsapp || "01035966569";
    const cleanPhone = whatsapp.replace(/\D/g, "");
    const waPhone = cleanPhone.startsWith("20")
      ? cleanPhone
      : `20${cleanPhone.startsWith("0") ? cleanPhone.slice(1) : cleanPhone}`;

    return (
      <main className="maintenance-page">
        <section className="maintenance-card glass-card neon-border">
          <div className="maintenance-icon">
            <Wrench size={58} />
          </div>

          <h1 className="neon-text">{settings.site_name || "DevPlay Studio"}</h1>

          <h2>الموقع تحت الصيانة حاليًا</h2>

          <p>
            بنجهز تجربة أفضل ليك. تقدر تتواصل معانا على واتساب لو عندك طلب عاجل.
          </p>

          <a
            href={`https://wa.me/${waPhone}`}
            target="_blank"
            className="btn maintenance-btn"
          >
            <MessageCircle size={18} />
            تواصل واتساب
          </a>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}