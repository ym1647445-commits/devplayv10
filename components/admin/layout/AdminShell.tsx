"use client";

import {
  Bell,
  Activity,
  Boxes,
  ChevronLeft,
  CircleDollarSign,
  Gauge,
  Menu,
  PackageSearch,
  PackagePlus,
  Settings,
  ShieldCheck,
  TicketPercent,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { PlugZap } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

import styles from "./AdminShell.module.css";

interface AdminShellProps {
  children: ReactNode;
}

const navigationItems = [
  {
    title: "الرئيسية",
    description: "نظرة عامة على المنصة",
    href: "/admin/dashboard",
    icon: Gauge,
  },
  {
    title: "الإيداعات",
    description: "طلبات إضافة الرصيد",
    href: "/admin/deposits",
    icon: WalletCards,
  },
  {
    title: "الطلبات",
    description: "طلبات المنتجات والتنفيذ",
    href: "/admin/orders",
    icon: PackageSearch,
  },
  {
    title: "العملاء",
    description: "الحسابات والصلاحيات",
    href: "/admin/users",
    icon: UsersRound,
  },
  {
    title: "المنتجات",
    description: "الأسعار وربط المورد",
    href: "/admin/products",
    icon: Boxes,
  },
  {
    title: "باقات المورد",
    description: "استيراد وربط عروض Flexy بالمتجر",
    href: "/admin/provider-offers",
    icon: PackagePlus,
  },
  {
    title: "التسعير",
    description: "الدولار وهوامش الربح",
    href: "/admin/pricing",
    icon: CircleDollarSign,
  },
  {
    title: "الكوبونات",
    description: "الخصومات والشروط",
    href: "/admin/coupons",
    icon: TicketPercent,
  },
  {
    title: "الإشعارات",
    description: "التنبيهات وحملات العملاء",
    href: "/admin/notifications",
    icon: Bell,
  },
  {
    title: "سجل النشاط",
    description: "كل الحركات والتغييرات داخل الموقع",
    href: "/admin/activity",
    icon: Activity,
  },
  {
    title: "API Center",
    description: "المورد والمزامنة وحالة الاتصال",
    href: "/admin/api-center",
    icon: PlugZap,
  },
  {
    title: "الإعدادات",
    description: "إعدادات الموقع والإدارة",
    href: "/admin/settings",
    icon: Settings,
  },
];

function isItemActive(
  pathname: string,
  href: string,
): boolean {
  if (href === "/admin/dashboard") {
    return pathname === "/admin" || pathname === "/admin/dashboard";
  }

  return pathname.startsWith(href);
}

export function AdminShell({
  children,
}: AdminShellProps) {
  const pathname = usePathname();

  const {
    profile,
  } = useAuth();

  const [menuOpen, setMenuOpen] =
    useState(false);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleEscape(
      event: KeyboardEvent,
    ): void {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.body.style.overflow = "hidden";

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow = "";

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [menuOpen]);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerStart}>
          <button
            className={styles.menuButton}
            type="button"
            onClick={() =>
              setMenuOpen(true)
            }
            aria-label="فتح قائمة الإدارة"
          >
            <Menu size={19} />
          </button>

          <Link
            className={styles.brand}
            href="/admin"
          >
            <span className={styles.logo}>
              DP
            </span>

            <span>
              <strong>
                DevPlay Admin
              </strong>

              <small>
                CONTROL CENTER
              </small>
            </span>
          </Link>
        </div>

        <div className={styles.headerActions}>
          <Link
            className={styles.headerIcon}
            href="/admin/notifications"
            aria-label="إشعارات الإدارة"
          >
            <Bell size={18} />

            <span />
          </Link>

          <div className={styles.adminIdentity}>
            <span className={styles.adminAvatar}>
              <ShieldCheck size={19} />
            </span>

            <span className={styles.adminCopy}>
              <strong>
                {profile?.full_name ??
                  "مدير المنصة"}
              </strong>

              <small>
                {profile?.role === "owner"
                  ? "Owner"
                  : profile?.role ??
                    "Admin"}
              </small>
            </span>
          </div>
        </div>
      </header>

      <aside className={styles.desktopSidebar}>
        <div className={styles.sidebarHeading}>
          <span>
            لوحة التحكم
          </span>

          <small>
            DevPlay Top Up
          </small>
        </div>

        <nav className={styles.navigation}>
          {navigationItems.map((item) => {
            const Icon = item.icon;

            const active = isItemActive(
              pathname,
              item.href,
            );

            return (
              <Link
                href={item.href}
                key={item.href}
                onClick={() => setMenuOpen(false)}
                className={
                  active
                    ? styles.activeNavigationItem
                    : ""
                }
              >
                <span
                  className={styles.navigationIcon}
                >
                  <Icon size={18} />
                </span>

                <span
                  className={styles.navigationCopy}
                >
                  <strong>
                    {item.title}
                  </strong>

                  <small>
                    {item.description}
                  </small>
                </span>

                <ChevronLeft size={15} />
              </Link>
            );
          })}
        </nav>

        <Link
          className={styles.storeLink}
          href="/"
        >
          الرجوع إلى المتجر
          <ChevronLeft size={16} />
        </Link>
      </aside>

      <main className={styles.content}>
        {children}
      </main>

      <nav className={styles.mobileDock}>
        {navigationItems
          .slice(0, 5)
          .map((item) => {
            const Icon = item.icon;

            const active = isItemActive(
              pathname,
              item.href,
            );

            return (
              <Link
                href={item.href}
                key={item.href}
                className={
                  active
                    ? styles.mobileDockActive
                    : ""
                }
              >
                <Icon size={18} />

                <span>
                  {item.title}
                </span>
              </Link>
            );
          })}
      </nav>

      {menuOpen && (
        <div
          className={styles.mobileOverlay}
          role="presentation"
          onMouseDown={() =>
            setMenuOpen(false)
          }
        >
          <aside
            className={styles.mobileDrawer}
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className={styles.drawerHeader}>
              <div className={styles.brand}>
                <span className={styles.logo}>
                  DP
                </span>

                <span>
                  <strong>
                    لوحة الإدارة
                  </strong>

                  <small>
                    DEVPLAY TOP UP
                  </small>
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMenuOpen(false)
                }
                aria-label="إغلاق القائمة"
              >
                <X size={18} />
              </button>
            </div>

            <nav className={styles.navigation}>
              {navigationItems.map((item) => {
                const Icon = item.icon;

                const active = isItemActive(
                  pathname,
                  item.href,
                );

                return (
                  <Link
                    href={item.href}
                    key={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={
                      active
                        ? styles.activeNavigationItem
                        : ""
                    }
                  >
                    <span
                      className={
                        styles.navigationIcon
                      }
                    >
                      <Icon size={18} />
                    </span>

                    <span
                      className={
                        styles.navigationCopy
                      }
                    >
                      <strong>
                        {item.title}
                      </strong>

                      <small>
                        {item.description}
                      </small>
                    </span>

                    <ChevronLeft size={15} />
                  </Link>
                );
              })}
            </nav>

            <Link
              className={styles.storeLink}
              href="/"
            >
              الرجوع إلى المتجر
              <ChevronLeft size={16} />
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
