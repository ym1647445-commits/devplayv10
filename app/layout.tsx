import type { Metadata } from "next";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { PWAClient } from "@/components/pwa/PWAClient";

import "@/styles/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevPlay Top Up",
  description: "متجر DevPlay لشحن الألعاب والخدمات الرقمية بأمان وسرعة.",
  applicationName: "DevPlay Top Up",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "DevPlay", statusBarStyle: "black-translucent" },
  icons: { icon: "/devplay-icon.svg", apple: "/devplay-icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-theme="dark"
      data-accent="violet"
      data-font-size="medium"
      data-density="compact"
      data-reduce-motion="false"
      suppressHydrationWarning
    >
      <body>
  <ThemeProvider>
    <AuthProvider>
      {children}
      <PWAClient />
    </AuthProvider>
  </ThemeProvider>
</body>
    </html>
  );
}
