"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Gamepad2, House, Package, User } from "lucide-react";
import { motion } from "framer-motion";

const items = [
  { href: "/", label: "الرئيسية", icon: House },
  { href: "/products", label: "الألعاب", icon: Gamepad2 },
  { href: "/orders", label: "طلباتي", icon: Package },
  { href: "/notifications", label: "الإشعارات", icon: Bell },
  { href: "/account", label: "الحساب", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  const hidden =
    pathname.startsWith("/auth") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/admin");

  if (hidden) return null;

  return (
    <div className="mobile-only">
      <motion.nav
        initial={{ y: 90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="bottom-nav"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "bottom-nav-item active" : "bottom-nav-item"}
            >
              <Icon size={21} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </motion.nav>
    </div>
  );
}