"use client";

import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  LoaderCircle,
  PackageOpen,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { CartItem } from "@/types/cart";

import styles from "./HeaderQuickPreviews.module.css";

interface HeaderNotification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface HeaderQuickPreviewsProps {
  items: CartItem[];
  itemsCount: number;
  isLoggedIn: boolean;
  userId?: string;
}

type OpenPanel = "notifications" | "cart" | null;

function formatRelativeDate(value: string): string {
  const timestamp = new Date(value).getTime();
  const difference = Date.now() - timestamp;
  const minutes = Math.max(1, Math.floor(difference / 60_000));

  if (minutes < 60) return `منذ ${minutes.toLocaleString("ar-EG")} د`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours.toLocaleString("ar-EG")} س`;

  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export function HeaderQuickPreviews({
  items,
  itemsCount,
  isLoggedIn,
  userId,
}: HeaderQuickPreviewsProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [notificationsError, setNotificationsError] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent): void {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpenPanel(null);
      }
    }

    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") setOpenPanel(null);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);


  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  const previewItems = items.slice(0, 3);

  async function loadNotifications(): Promise<void> {
    if (!isLoggedIn || !userId || notificationsLoaded || notificationsLoading) return;

    setNotificationsLoading(true);
    setNotificationsError(false);

    try {
      const { data, error } = await createClient()
        .from("notifications")
        .select("id,title,message,is_read,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5)
        .returns<HeaderNotification[]>();

      setNotifications(data ?? []);
      setNotificationsError(Boolean(error));
      setNotificationsLoaded(!error);
    } catch {
      setNotificationsError(true);
    } finally {
      setNotificationsLoading(false);
    }
  }

  function toggle(panel: Exclude<OpenPanel, null>): void {
    const opening = openPanel !== panel;
    setOpenPanel(opening ? panel : null);

    if (opening && panel === "notifications") {
      void loadNotifications();
    }
  }

  return (
    <div className={styles.root} ref={wrapperRef}>
      <div className={styles.triggerWrapper}>
        <button className={`${styles.trigger} ${openPanel === "notifications" ? styles.triggerOpen : ""}`} type="button" onClick={() => toggle("notifications")} aria-label="معاينة الإشعارات" aria-expanded={openPanel === "notifications"} aria-haspopup="dialog">
          <Bell size={19} />
          {isLoggedIn && (notificationsLoaded ? unreadCount > 0 : true) && <span className={styles.notificationDot} />}
        </button>

        {openPanel === "notifications" && (
          <section className={styles.panel} role="dialog" aria-label="معاينة الإشعارات">
            <header className={styles.panelHeader}><div><strong>الإشعارات</strong><small>آخر تحديثات حسابك</small></div><span><Bell size={17} /></span></header>
            {notificationsLoading ? (
              <div className={styles.empty}><LoaderCircle className={styles.spinner} /><strong>جاري تحميل الإشعارات</strong></div>
            ) : !isLoggedIn ? (
              <div className={styles.empty}><span><Bell /></span><strong>سجّل الدخول لرؤية إشعاراتك</strong></div>
            ) : notificationsError ? (
              <div className={styles.empty}><span><Bell /></span><strong>تعذر تحميل الإشعارات</strong><p>افتح الصفحة الكاملة للمحاولة مرة أخرى.</p></div>
            ) : notifications.length === 0 ? (
              <div className={styles.empty}><span><CheckCircle2 /></span><strong>لا توجد إشعارات جديدة</strong><p>ستظهر تحديثات الطلبات والمحفظة هنا.</p></div>
            ) : (
              <div className={styles.list}>{notifications.map((notification) => (
                <article className={styles.notification} key={notification.id}>
                  <i className={notification.is_read ? styles.readMark : styles.unreadMark} />
                  <div><strong>{notification.title}</strong><p>{notification.message}</p><time dateTime={notification.created_at}>{formatRelativeDate(notification.created_at)}</time></div>
                </article>
              ))}</div>
            )}
            <footer className={styles.panelFooter}><Link href={isLoggedIn ? "/notifications" : "/auth"} onClick={() => setOpenPanel(null)}>{isLoggedIn ? "عرض كل الإشعارات" : "تسجيل الدخول"}<ArrowLeft size={15} /></Link></footer>
          </section>
        )}
      </div>

      <div className={styles.triggerWrapper}>
        <button className={`${styles.trigger} ${openPanel === "cart" ? styles.triggerOpen : ""}`} type="button" onClick={() => toggle("cart")} aria-label={`معاينة السلة، ${itemsCount} عناصر`} aria-expanded={openPanel === "cart"} aria-haspopup="dialog">
          <ShoppingCart size={19} />
          {itemsCount > 0 && <span className={styles.count}>{itemsCount > 99 ? "+99" : itemsCount}</span>}
        </button>

        {openPanel === "cart" && (
          <section className={styles.panel} role="dialog" aria-label="معاينة السلة">
            <header className={styles.panelHeader}><div><strong>سلة المشتريات</strong><small>{itemsCount.toLocaleString("ar-EG")} عنصر</small></div><span><ShoppingCart size={17} /></span></header>
            {previewItems.length === 0 ? (
              <div className={styles.empty}><span><PackageOpen /></span><strong>السلة فارغة حاليًا</strong><p>أضف باقة وستظهر لك هنا بسرعة.</p></div>
            ) : (
              <div className={styles.list}>{previewItems.map((item) => (
                <Link className={styles.cartItem} href={`/products/${item.product.slug}`} key={item.id} onClick={() => setOpenPanel(null)}>
                  {item.product.image ? <img src={item.product.image} alt="" /> : <span className={styles.imageFallback}><PackageOpen size={20} /></span>}
                  <span><strong>{item.product.name}</strong><small>{item.product.category}</small></span><b>× {item.quantity.toLocaleString("ar-EG")}</b>
                </Link>
              ))}</div>
            )}
            <footer className={styles.panelFooter}><Link href="/cart" onClick={() => setOpenPanel(null)}>عرض السلة كاملة <ArrowLeft size={15} /></Link></footer>
          </section>
        )}
      </div>
    </div>
  );
}