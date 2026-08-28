import type { Metadata } from "next";

import { VisualAssistant } from "@/components/assistant/VisualAssistant";
import { PlatformStatusGate } from "@/components/maintenance/PlatformStatusGate";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { createClient } from "@/lib/supabase/server";
import { AuthProvider } from "@/providers/AuthProvider";
import { PWAClient } from "@/components/pwa/PWAClient";
import { DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo/site";

import "@/styles/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "شحن ألعاب وبطاقات رقمية في مصر | DevPlay", template: "%s | DevPlay" },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: "Shahd Elbary", url: SITE_URL }],
  creator: "Shahd Elbary",
  publisher: SITE_NAME,
  category: "Digital gaming top-up and gift cards",
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "ar_EG", alternateLocale: ["en_US"], url: SITE_URL, siteName: SITE_NAME, title: "شحن ألعاب وبطاقات رقمية في مصر | DevPlay", description: DEFAULT_DESCRIPTION, images: [{ url: absoluteUrl("/devplay-app-icon-512.png"), width: 512, height: 512, alt: "DevPlay Top Up" }] },
  twitter: { card: "summary_large_image", title: "DevPlay Top Up", description: DEFAULT_DESCRIPTION, images: [absoluteUrl("/devplay-app-icon-512.png")] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "DevPlay", statusBarStyle: "black-translucent" },
  icons: { icon: "/devplay-app-icon-192.png", apple: "/devplay-app-icon-512.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl" data-theme="dark" data-accent="violet" data-font-size="medium" data-density="compact" data-reduce-motion="false" suppressHydrationWarning>
    <body><OrganizationJsonLd/><ThemeProvider><AuthProvider>{children}<PlatformStatusGate/><VisualAssistant/><PWAClient/></AuthProvider></ThemeProvider></body>
  </html>;
}