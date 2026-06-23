"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Globe,
  Mail,
  MessageCircle,
  Palette,
  Save,
  Settings,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { playSound } from "@/lib/playSound";
import AdminGuard from "@/components/AdminGuard";

type SiteSettings = {
  id: number;
  site_name: string | null;
  whatsapp: string | null;
  vodafone_cash: string | null;
  orange_cash: string | null;
  etisalat_cash: string | null;
  wepay: string | null;
  maintenance_mode: boolean | null;
  primary_color: string | null;
  secondary_color: string | null;
  background_color: string | null;
  site_logo: string | null;
  site_icon: string | null;
  telegram: string | null;
  facebook: string | null;
  tiktok: string | null;
  instagram: string | null;
  support_email: string | null;
};

function AdminSettingsContent() {
  const supabase = createClient();

  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);

    const { data } = await supabase
      .from("site_settings")
      .select("*")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (data) {
      setSettings(data);
    } else {
      const { data: created } = await supabase
        .from("site_settings")
        .insert({
          site_name: "DevPlay Studio",
          whatsapp: "01035966569",
          vodafone_cash: "01035966569",
          maintenance_mode: false,
          primary_color: "#4F8CFF",
          secondary_color: "#00D4FF",
          background_color: "#0B1020",
        })
        .select("*")
        .single();

      setSettings(created);
    }

    setLoading(false);
  }

  function updateField(key: keyof SiteSettings, value: string | boolean) {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  }

  async function saveSettings() {
    if (!settings) return;

    setSaving(true);

    const { error } = await supabase
      .from("site_settings")
      .update({
        site_name: settings.site_name,
        whatsapp: settings.whatsapp,
        vodafone_cash: settings.vodafone_cash,
        orange_cash: settings.orange_cash,
        etisalat_cash: settings.etisalat_cash,
        wepay: settings.wepay,
        maintenance_mode: settings.maintenance_mode,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        background_color: settings.background_color,
        site_logo: settings.site_logo,
        site_icon: settings.site_icon,
        telegram: settings.telegram,
        facebook: settings.facebook,
        tiktok: settings.tiktok,
        instagram: settings.instagram,
        support_email: settings.support_email,
      })
      .eq("id", settings.id);

    setSaving(false);

    if (error) {
      playSound("error");
      alert(error.message);
      return;
    }

    playSound("success");
    alert("تم حفظ الإعدادات");
  }

  if (loading || !settings) {
    return (
      <main className="container admin-settings-page">
        <div className="game-loading skeleton" />
      </main>
    );
  }

  return (
    <main className="container admin-settings-page">
      <section className="glass-card neon-border admin-settings-header">
        <div>
          <span className="badge">
            <Settings size={14} />
            إعدادات الموقع
          </span>

          <h1 className="neon-text">Site Settings</h1>

          <p>تعديل بيانات المتجر، وسائل الدفع، التواصل، الألوان، ووضع الصيانة.</p>
        </div>

        <button className="btn admin-settings-save" onClick={saveSettings} disabled={saving}>
          <Save size={18} />
          {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
      </section>

      <section className="admin-settings-grid">
        <div className="glass-card admin-settings-box">
          <span className="badge">
            <Globe size={14} />
            بيانات المتجر
          </span>

          <label>
            اسم الموقع
            <input
              value={settings.site_name || ""}
              onChange={(e) => updateField("site_name", e.target.value)}
            />
          </label>

          <label>
            رابط اللوجو
            <input
              value={settings.site_logo || ""}
              onChange={(e) => updateField("site_logo", e.target.value)}
            />
          </label>

          <label>
            رابط الأيقونة
            <input
              value={settings.site_icon || ""}
              onChange={(e) => updateField("site_icon", e.target.value)}
            />
          </label>

          <label className="admin-check-row">
            <span>
              <ShieldAlert size={16} />
              وضع الصيانة
            </span>

            <input
              type="checkbox"
              checked={!!settings.maintenance_mode}
              onChange={(e) => updateField("maintenance_mode", e.target.checked)}
            />
          </label>
        </div>

        <div className="glass-card admin-settings-box">
          <span className="badge">
            <Smartphone size={14} />
            وسائل الدفع
          </span>

          <label>
            Vodafone Cash
            <input
              value={settings.vodafone_cash || ""}
              onChange={(e) => updateField("vodafone_cash", e.target.value)}
            />
          </label>

          <label>
            Orange Cash
            <input
              value={settings.orange_cash || ""}
              onChange={(e) => updateField("orange_cash", e.target.value)}
            />
          </label>

          <label>
            Etisalat Cash
            <input
              value={settings.etisalat_cash || ""}
              onChange={(e) => updateField("etisalat_cash", e.target.value)}
            />
          </label>

          <label>
            WE Pay
            <input
              value={settings.wepay || ""}
              onChange={(e) => updateField("wepay", e.target.value)}
            />
          </label>
        </div>

        <div className="glass-card admin-settings-box">
          <span className="badge">
            <MessageCircle size={14} />
            التواصل
          </span>

          <label>
            WhatsApp
            <input
              value={settings.whatsapp || ""}
              onChange={(e) => updateField("whatsapp", e.target.value)}
            />
          </label>

          <label>
            Telegram
            <input
              value={settings.telegram || ""}
              onChange={(e) => updateField("telegram", e.target.value)}
            />
          </label>

          <label>
            Support Email
            <input
              value={settings.support_email || ""}
              onChange={(e) => updateField("support_email", e.target.value)}
            />
          </label>
        </div>

        <div className="glass-card admin-settings-box">
          <span className="badge">
            <Globe size={14} />
            السوشيال ميديا
          </span>

          <label>
            Facebook
            <input
              value={settings.facebook || ""}
              onChange={(e) => updateField("facebook", e.target.value)}
            />
          </label>

          <label>
            Instagram
            <input
              value={settings.instagram || ""}
              onChange={(e) => updateField("instagram", e.target.value)}
            />
          </label>

          <label>
            TikTok
            <input
              value={settings.tiktok || ""}
              onChange={(e) => updateField("tiktok", e.target.value)}
            />
          </label>
        </div>

        <div className="glass-card admin-settings-box admin-settings-colors">
          <span className="badge">
            <Palette size={14} />
            ألوان الموقع
          </span>

          <label>
            اللون الأساسي
            <input
              type="color"
              value={settings.primary_color || "#4F8CFF"}
              onChange={(e) => updateField("primary_color", e.target.value)}
            />
          </label>

          <label>
            اللون الثانوي
            <input
              type="color"
              value={settings.secondary_color || "#00D4FF"}
              onChange={(e) => updateField("secondary_color", e.target.value)}
            />
          </label>

          <label>
            لون الخلفية
            <input
              type="color"
              value={settings.background_color || "#0B1020"}
              onChange={(e) => updateField("background_color", e.target.value)}
            />
          </label>
        </div>

        <div className="glass-card admin-settings-box">
          <span className="badge">
            <BadgeCheck size={14} />
            معاينة سريعة
          </span>

          <div className="settings-preview">
            <strong style={{ color: settings.secondary_color || "#00D4FF" }}>
              {settings.site_name || "DevPlay Studio"}
            </strong>

            <span>WhatsApp: {settings.whatsapp || "-"}</span>
            <span>Vodafone Cash: {settings.vodafone_cash || "-"}</span>
            <span>Maintenance: {settings.maintenance_mode ? "ON" : "OFF"}</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function AdminSettingsPage() {
  return (
    <AdminGuard>
      <AdminSettingsContent />
    </AdminGuard>
  );
}