"use client";

import {
  Gamepad2,
  Home,
  PackageSearch,
  Search,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./BottomNavigation.module.css";

const navigationItems = [
  {
    label: "الرئيسية",
    href: "/",
    icon: Home,
  },
  {
    label: "البحث",
    href: "/search",
    icon: Search,
  },
  {
    label: "الأقسام",
    href: "/categories",
    icon: Gamepad2,
  },
  {
    label: "طلباتي",
    href: "/orders",
    icon: PackageSearch,
  },
  {
    label: "حسابي",
    href: "/account",
    icon: UserRound,
  },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className={styles.navigation}
      aria-label="التنقل السفلي"
    >
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/"
          ? pathname === "/"
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            className={`${styles.item} ${
              active ? styles.active : ""
            }`}
            href={item.href}
            key={item.label}
          >
            <span className={styles.iconWrapper}>
              <Icon size={20} strokeWidth={2} />
            </span>

            <span className={styles.label}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
