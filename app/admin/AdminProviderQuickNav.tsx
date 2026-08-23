"use client";

import { Boxes, PackagePlus, RefreshCw, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./admin-provider-quick-nav.module.css";

const links = [
  { href: "/admin/item4gamer", label: "المزامنة", icon: RefreshCw },
  { href: "/admin/item4gamer/catalog", label: "منتجات وباقات المورد", icon: PackagePlus },
  { href: "/admin/products", label: "منتجات المتجر", icon: Boxes },
  { href: "/admin/providers", label: "إعدادات المورد", icon: Settings2 },
];

export function AdminProviderQuickNav() {
  const pathname = usePathname();
  return <nav className={styles.nav} aria-label="إدارة Item4Gamer"><span className={styles.brand}><b>Item4Gamer</b><small>المورد النشط</small></span><div>{links.map((item) => { const Icon = item.icon; const active = pathname === item.href || (item.href !== "/admin/item4gamer" && pathname.startsWith(item.href)); return <Link key={item.href} href={item.href} data-active={active}><Icon size={14}/>{item.label}</Link>; })}</div></nav>;
}
