import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import MaintenanceGuard from "@/components/MaintenanceGuard";

const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "DevPlay Studio",
  description: "Game Store",
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
      className={`${cairo.variable}`}
    >
      <body><MaintenanceGuard>{children}</MaintenanceGuard></body>
    </html>
  );
}