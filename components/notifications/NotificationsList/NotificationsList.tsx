"use client";

import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  ChevronLeft,
  CircleDollarSign,
  Gift,
  LoaderCircle,
  PackageCheck,
  Search,
  ShieldAlert,
  TicketPercent,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/app/notifications/actions";
import type { CustomerNotification } from "@/types/notification";

import styles from "./NotificationsList.module.css";

interface NotificationsListProps {
  notifications: CustomerNotification[];
}

type NotificationFilter =
  | "all"
  | "unread";

function formatDate(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "ar-EG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

function getNotificationIcon(
  type: string,
) {
  const normalizedType =
    type.toLowerCase();

  if (
    normalizedType.includes(
      "deposit",
    )
  ) {
    return WalletCards;
  }

  if (
    normalizedType.includes(
      "product_order",
    ) ||
    normalizedType.includes(
      "order",
    )
  ) {
    return PackageCheck;
  }

  if (
    normalizedType.includes(
      "coupon",
    )
  ) {
    return TicketPercent;
  }

  if (
    normalizedType.includes(
      "reward",
    ) ||
    normalizedType.includes(
      "point",
    )
  ) {
    return Gift;
  }

  if (
    normalizedType.includes(
      "security",
    ) ||
    normalizedType.includes(
      "password",
    ) ||
    normalizedType.includes(
      "ban",
    )
  ) {
    return ShieldAlert;
  }

  if (
    normalizedType.includes(
      "wallet",
    ) ||
    normalizedType.includes(
      "refund",
    )
  ) {
    return CircleDollarSign;
  }

  return Bell;
}

export function NotificationsList({
  notifications,
}: NotificationsListProps) {
  const router = useRouter();

  const [filter, setFilter] =
    useState<NotificationFilter>(
      "all",
    );

  const [searchText, setSearchText] =
    useState("");

  const [
    processingId,
    setProcessingId,
  ] = useState<string | null>(
    null,
  );

  const [
    markingAll,
    setMarkingAll,
  ] = useState(false);

  const [message, setMessage] =
    useState<string | null>(
      null,
    );

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.isRead,
    ).length;

  const filteredNotifications =
    useMemo(() => {
      const normalizedSearch =
        searchText
          .trim()
          .toLowerCase();

      return notifications.filter(
        (notification) => {
          const matchesFilter =
            filter === "all" ||
            !notification.isRead;

          if (!matchesFilter) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          const searchableText = [
            notification.title,
            notification.message,
            notification.type,
          ]
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            normalizedSearch,
          );
        },
      );
    }, [
      filter,
      notifications,
      searchText,
    ]);

  async function handleMarkAsRead(
    notificationId: string,
  ): Promise<void> {
    setProcessingId(
      notificationId,
    );

    setMessage(null);

    const result =
      await markNotificationAsRead(
        notificationId,
      );

    setProcessingId(null);
    setMessage(result.message);

    if (result.success) {
      router.refresh();
    }
  }

  async function handleMarkAll(): Promise<void> {
    if (unreadCount === 0) {
      return;
    }

    setMarkingAll(true);
    setMessage(null);

    const result =
      await markAllNotificationsAsRead();

    setMarkingAll(false);
    setMessage(result.message);

    if (result.success) {
      router.refresh();
    }
  }

  async function handleOpenNotification(
    notification: CustomerNotification,
  ): Promise<void> {
    if (!notification.isRead) {
      await handleMarkAsRead(
        notification.id,
      );
    }

    if (
      notification.actionUrl
    ) {
      router.push(
        notification.actionUrl,
      );
    }
  }

  return (
    <section className={styles.wrapper}>
      <section className={styles.toolbar}>
        <div className={styles.filters}>
          <button
            type="button"
            className={
              filter === "all"
                ? styles.activeFilter
                : ""
            }
            onClick={() =>
              setFilter("all")
            }
          >
            <Bell size={15} />

            الكل

            <strong>
              {notifications.length}
            </strong>
          </button>

          <button
            type="button"
            className={
              filter === "unread"
                ? styles.activeFilter
                : ""
            }
            onClick={() =>
              setFilter("unread")
            }
          >
            <BellRing size={15} />

            غير المقروءة

            <strong>
              {unreadCount}
            </strong>
          </button>
        </div>

        <button
          className={
            styles.markAllButton
          }
          type="button"
          disabled={
            markingAll ||
            unreadCount === 0
          }
          onClick={() => {
            void handleMarkAll();
          }}
        >
          {markingAll ? (
            <LoaderCircle
              className={
                styles.spinner
              }
              size={16}
            />
          ) : (
            <CheckCheck size={16} />
          )}

          تعليم الكل كمقروء
        </button>
      </section>

      <label className={styles.search}>
        <Search size={17} />

        <input
          type="search"
          value={searchText}
          onChange={(event) =>
            setSearchText(
              event.target.value,
            )
          }
          placeholder="بحث داخل الإشعارات"
        />
      </label>

      {message && (
        <p className={styles.message}>
          {message}
        </p>
      )}

      {filteredNotifications.length ===
      0 ? (
        <section className={styles.empty}>
          <span>
            <BellRing size={31} />
          </span>

          <h2>
            {filter === "unread"
              ? "مفيش إشعارات جديدة"
              : "مفيش إشعارات"}
          </h2>

          <p>
            تحديثات الطلبات والمحفظة
            والكوبونات هتظهر هنا.
          </p>
        </section>
      ) : (
        <div className={styles.list}>
          {filteredNotifications.map(
            (notification) => {
              const Icon =
                getNotificationIcon(
                  notification.type,
                );

              const processing =
                processingId ===
                notification.id;

              return (
                <article
                  className={`${styles.card} ${
                    !notification.isRead
                      ? styles.unreadCard
                      : ""
                  }`}
                  key={notification.id}
                >
                  <button
                    className={
                      styles.mainButton
                    }
                    type="button"
                    onClick={() => {
                      void handleOpenNotification(
                        notification,
                      );
                    }}
                  >
                    <span
                      className={
                        styles.icon
                      }
                    >
                      <Icon size={19} />

                      {!notification.isRead && (
                        <i />
                      )}
                    </span>

                    <span
                      className={
                        styles.copy
                      }
                    >
                      <span
                        className={
                          styles.titleRow
                        }
                      >
                        <strong>
                          {
                            notification.title
                          }
                        </strong>

                        {!notification.isRead && (
                          <span>
                            جديد
                          </span>
                        )}
                      </span>

                      <p>
                        {
                          notification.message
                        }
                      </p>

                      <small>
                        {formatDate(
                          notification.createdAt,
                        )}
                      </small>
                    </span>

                    {notification.actionUrl && (
                      <ChevronLeft
                        size={17}
                      />
                    )}
                  </button>

                  {!notification.isRead && (
                    <footer>
                      <button
                        type="button"
                        disabled={
                          processing
                        }
                        onClick={() => {
                          void handleMarkAsRead(
                            notification.id,
                          );
                        }}
                      >
                        {processing ? (
                          <LoaderCircle
                            className={
                              styles.spinner
                            }
                            size={14}
                          />
                        ) : (
                          <Check
                            size={14}
                          />
                        )}

                        تعليم كمقروء
                      </button>
                    </footer>
                  )}
                </article>
              );
            },
          )}
        </div>
      )}

      <section className={styles.info}>
        <BellRing size={19} />

        <p>
          إشعارات الأمان وتحديثات الطلبات
          المهمة ستظل تظهر داخل حسابك حتى
          لو أوقفتِ إشعارات العروض.
        </p>
      </section>
    </section>
  );
}