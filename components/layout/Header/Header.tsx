"use client";

import {
  Bell,
  ChevronDown,
  CircleUserRound,
  Coins,
  Gift,
  Heart,
  LogIn,
  LogOut,
  PackageSearch,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  TicketPercent,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useAuth } from "@/providers/AuthProvider";
import {
  getCartItemsCount,
  useCartStore,
} from "@/stores/cartStore";

import styles from "./Header.module.css";

function formatEgpBalance(
  balance: number,
): string {
  return Number(balance).toLocaleString(
    "ar-EG",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  );
}

function getFirstName(
  fullName:
    | string
    | null
    | undefined,
): string {
  const safeName =
    fullName?.trim();

  if (!safeName) {
    return "حسابي";
  }

  return safeName.split(/\s+/)[0];
}

export function Header() {
  const [menuOpen, setMenuOpen] =
    useState(false);

  const menuRef =
    useRef<HTMLDivElement | null>(null);

  const {
    loading,
    user,
    profile,
    wallet,
    signOut,
  } = useAuth();

  const items = useCartStore(
    (state) => state.items,
  );

  const cartHydrated = useCartStore(
    (state) => state.hydrated,
  );

  const itemsCount = cartHydrated
    ? getCartItemsCount(items)
    : 0;

  const isLoggedIn = Boolean(
    user && profile,
  );

  const isAdmin =
    profile?.role === "admin" ||
    profile?.role ===
      "super_admin" ||
    profile?.role === "owner";

  const firstName = getFirstName(
    profile?.full_name,
  );

  const balanceEgp = Number(
    wallet?.balance_egp ?? 0,
  );

  const balanceUsd = Number(
    wallet?.balance_usd ?? 0,
  );

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ): void {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setMenuOpen(false);
      }
    }

    function handleEscape(
      event: KeyboardEvent,
    ): void {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  const menuItems = [
    {
      title: "حسابي",
      href: "/account",
      icon: CircleUserRound,
    },
    {
      title: "طلباتي",
      href: "/orders",
      icon: PackageSearch,
    },
    {
      title: "المحفظة",
      href: "/wallet",
      icon: WalletCards,
    },
    {
      title: "كوبوناتي",
      href: "/coupons",
      icon: TicketPercent,
    },
    {
      title: "النقاط والمكافآت",
      href: "/rewards",
      icon: Gift,
    },
    {
      title: "المفضلة",
      href: "/favorites",
      icon: Heart,
    },
    {
      title: "الإعدادات",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <header className={styles.header}>
      <Link
        className={styles.brand}
        href="/"
        aria-label="الصفحة الرئيسية"
      >
        <span className={styles.logo}>
          DP
        </span>

        <span className={styles.brandText}>
          <strong>
            DevPlay
          </strong>

          <small>
            TOP UP
          </small>
        </span>
      </Link>

      <div className={styles.actions}>
        {isLoggedIn && (
          <Link
            className={
              styles.walletButton
            }
            href="/wallet"
            aria-label={`رصيد المحفظة ${balanceEgp} جنيه، يعادل ${balanceUsd} دولار`}
          >
            <WalletCards size={17} />

            <span
              className={
                styles.walletText
              }
            >
              <small>
                الرصيد
              </small>

              <strong>
                {formatEgpBalance(
                  balanceEgp,
                )}{" "}
                ج.م
              </strong>
            </span>
          </Link>
        )}

        <Link
          className={styles.iconButton}
          href="/search"
          aria-label="البحث"
        >
          <Search size={19} />
        </Link>

        <Link
          className={styles.iconButton}
          href="/notifications"
          aria-label="الإشعارات"
        >
          <Bell size={19} />

          {isLoggedIn && (
            <span
              className={
                styles.notificationDot
              }
            />
          )}
        </Link>

        <Link
          className={styles.iconButton}
          href="/cart"
          aria-label={`السلة، ${itemsCount} عناصر`}
        >
          <ShoppingCart size={19} />

          {itemsCount > 0 && (
            <span
              className={
                styles.cartCount
              }
            >
              {itemsCount > 99
                ? "+99"
                : itemsCount}
            </span>
          )}
        </Link>

        {loading ? (
          <span
            className={
              styles.accountSkeleton
            }
            aria-label="جاري تحميل الحساب"
          />
        ) : isLoggedIn && profile ? (
          <div
            className={
              styles.accountWrapper
            }
            ref={menuRef}
          >
            <button
              className={
                styles.accountButton
              }
              type="button"
              onClick={() =>
                setMenuOpen(
                  (current) =>
                    !current,
                )
              }
              aria-expanded={
                menuOpen
              }
              aria-haspopup="menu"
            >
              <span
                className={styles.avatar}
              >
                {profile.avatar_url ? (
                  <img
                    src={
                      profile.avatar_url
                    }
                    alt=""
                  />
                ) : (
                  <CircleUserRound
                    size={20}
                  />
                )}
              </span>

              <span
                className={
                  styles.accountCopy
                }
              >
                <strong>
                  {firstName}
                </strong>

                <small>
                  {
                    profile.customer_id
                  }
                </small>
              </span>

              <ChevronDown
                className={
                  menuOpen
                    ? styles.chevronOpen
                    : ""
                }
                size={14}
              />
            </button>

            {menuOpen && (
              <div
                className={
                  styles.accountMenu
                }
                role="menu"
              >
                <div
                  className={
                    styles.menuProfile
                  }
                >
                  <span
                    className={
                      styles.menuAvatar
                    }
                  >
                    <CircleUserRound
                      size={23}
                    />
                  </span>

                  <span>
                    <strong>
                      {profile.full_name ??
                        "عميل DevPlay"}
                    </strong>

                    <small>
                      {
                        profile.customer_id
                      }
                    </small>
                  </span>
                </div>

                <div
                  className={
                    styles.quickStats
                  }
                >
                  <Link
                    href="/wallet"
                    onClick={() =>
                      setMenuOpen(false)
                    }
                  >
                    <WalletCards
                      size={15}
                    />

                    <span>
                      <small>
                        الرصيد
                      </small>

                      <strong>
                        {formatEgpBalance(
                          balanceEgp,
                        )}{" "}
                        ج.م
                      </strong>

                      <small>
                        ≈ $
                        {balanceUsd.toFixed(
                          3,
                        )}
                      </small>
                    </span>
                  </Link>

                  <Link
                    href="/rewards"
                    onClick={() =>
                      setMenuOpen(false)
                    }
                  >
                    <Coins size={15} />

                    <span>
                      <small>
                        النقاط
                      </small>

                      <strong>
                        {profile.points}
                      </strong>
                    </span>
                  </Link>
                </div>

                {isAdmin && (
                  <Link
                    className={
                      styles.adminLink
                    }
                    href="/admin/dashboard"
                    role="menuitem"
                    onClick={() =>
                      setMenuOpen(false)
                    }
                  >
                    <ShieldCheck
                      size={18}
                    />

                    لوحة الإدارة
                  </Link>
                )}

                <nav
                  className={
                    styles.menuLinks
                  }
                >
                  {menuItems.map(
                    (item) => {
                      const Icon =
                        item.icon;

                      return (
                        <Link
                          href={
                            item.href
                          }
                          key={
                            item.title
                          }
                          role="menuitem"
                          onClick={() =>
                            setMenuOpen(
                              false,
                            )
                          }
                        >
                          <Icon
                            size={17}
                          />

                          {item.title}
                        </Link>
                      );
                    },
                  )}
                </nav>

                <button
                  className={
                    styles.logoutButton
                  }
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void signOut();
                  }}
                >
                  <LogOut size={17} />

                  تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            className={
              styles.loginButton
            }
            href="/auth"
          >
            <LogIn size={17} />

            <span>دخول</span>
          </Link>
        )}
      </div>
    </header>
  );
}
