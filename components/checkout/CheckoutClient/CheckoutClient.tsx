"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  LoaderCircle,
  PackageCheck,
  PackageSearch,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createCheckoutOrder } from "@/app/checkout/actions";
import {
  showVisualAssistant,
  trackAssistantRequest,
} from "@/components/assistant/visualAssistantEvents";
import { Button } from "@/components/ui/Button";
import { WalletTransactionAnimation } from "@/components/wallet/WalletTransactionAnimation";
import {
  formatUsd,
  getProductPriceUsd,
} from "@/lib/productPricing";
import { useAuth } from "@/providers/AuthProvider";
import {
  getCartSubtotal,
  isCartItemComplete,
  useCartStore,
} from "@/stores/cartStore";
import type { CheckoutOrderResult } from "@/types/checkout";

import styles from "./CheckoutClient.module.css";

function formatEgp(
  value: number,
): string {
  return `${Number(value).toLocaleString(
    "ar-EG",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )} ج.م`;
}

export function CheckoutClient() {
  const {
    user,
    wallet,
    loading: authLoading,
    refreshAuth,
  } = useAuth();

  const items = useCartStore(
    (state) => state.items,
  );

  const hydrated = useCartStore(
    (state) => state.hydrated,
  );

  const appliedCoupon =
    useCartStore(
      (state) =>
        state.appliedCoupon,
    );

  const clearCart = useCartStore(
    (state) => state.clearCart,
  );

  const [customerNote, setCustomerNote] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [successOrder, setSuccessOrder] =
    useState<CheckoutOrderResult | null>(
      null,
    );

  const subtotal =
    getCartSubtotal(items);

  const localDiscount =
    appliedCoupon?.discount ?? 0;

  const estimatedTotal = Math.max(
    0,
    subtotal - localDiscount,
  );

  const balanceUsd = Number(
    wallet?.balance_usd ?? 0,
  );

  const exchangeRate = Number(
    wallet?.usd_to_egp_rate ?? 57,
  );

  const incompleteItems =
    items.filter(
      (item) =>
        !isCartItemComplete(item),
    );

  const hasIncompleteItems =
    incompleteItems.length > 0;

  const estimatedBalanceAfter =
    balanceUsd - estimatedTotal;

  useEffect(() => {
    if (!hydrated || authLoading || items.length === 0) return;

    if (!user) {
      showVisualAssistant({
        mood: "point",
        text: "لازم تسجّلي الدخول قبل إنشاء الطلب عشان نربطه بحسابك.",
        action: { label: "تسجيل الدخول", href: "/auth?next=/checkout" },
        duration: 10000,
        priority: 5,
      });
      return;
    }

    if (hasIncompleteItems) {
      showVisualAssistant({
        mood: "confused",
        text: "في بيانات تنفيذ ناقصة. ارجعي للسلة وكمّليها قبل تأكيد الطلب.",
        action: { label: "إكمال البيانات", href: "/cart" },
        duration: 10000,
        priority: 4,
      });
      return;
    }

    if (balanceUsd < estimatedTotal) {
      showVisualAssistant({
        mood: "sympathy",
        text: `الرصيد ناقص ${formatUsd(estimatedTotal - balanceUsd)}. أضيفي رصيد وبعدها ارجعي كمّلي الطلب.`,
        action: { label: "إضافة رصيد", href: "/wallet/deposit" },
        duration: 11000,
        priority: 5,
      });
    }
  }, [authLoading, balanceUsd, estimatedTotal, hasIncompleteItems, hydrated, items.length, user]);

  async function handleConfirmOrder(): Promise<void> {
    setMessage(null);

    if (!user) {
      setMessage(
        "يجب تسجيل الدخول أولًا.",
      );
      showVisualAssistant({
        mood: "point",
        text: "لازم تسجّلي الدخول قبل إنشاء الطلب عشان نربطه بحسابك.",
        action: { label: "تسجيل الدخول", href: "/auth?next=/checkout" },
        duration: 10000,
        priority: 5,
      });

      return;
    }

    if (items.length === 0) {
      setMessage("السلة فارغة.");
      return;
    }

    if (hasIncompleteItems) {
      setMessage(
        "راجعي بيانات تنفيذ المنتجات الناقصة داخل السلة.",
      );

      return;
    }

    if (
      balanceUsd <
      estimatedTotal
    ) {
      setMessage(
        "رصيد المحفظة غير كافٍ لإتمام الطلب.",
      );

      return;
    }

    const checkoutItems = items.map((item) => {
      const providerData = item.product.providerData;
      const mainProductId =
        providerData && typeof providerData === "object"
          ? (providerData as Record<string, unknown>).mainProductId
          : null;
      const storeProductOfferId =
        providerData && typeof providerData === "object"
          ? (providerData as Record<string, unknown>).storeProductOfferId
          : null;

      return {
        productId:
          typeof mainProductId === "string" ? mainProductId : "",
        offerId:
          typeof storeProductOfferId === "string"
            ? storeProductOfferId
            : "",
        quantity: item.quantity,
        inputValues: item.inputValues,
      };
    });

    if (
      checkoutItems.some(
        (item) => !item.productId || !item.offerId,
      )
    ) {
      setMessage(
        "إحدى الباقات غير مرتبطة ببيانات المتجر الصحيحة. احذفيها من السلة وأضيفيها مجددًا.",
      );
      return;
    }

    setSubmitting(true);

    const result = await createCheckoutOrder({
      items: checkoutItems,

      couponCode:
        appliedCoupon?.code ??
        null,

      customerNote:
        customerNote.trim() ||
        null,
    });

    setSubmitting(false);
    setMessage(result.message);

    if (
      result.success &&
      result.order
    ) {
      setSuccessOrder(
        result.order,
      );
      trackAssistantRequest({
        type: "order",
        id: result.order.id,
        displayId: result.order.orderId,
        status: result.order.status,
      });
      showVisualAssistant({
        mood: "celebrate",
        text: `تم إنشاء الطلب ${result.order.orderId} بنجاح! يلا خلّينا نتابع طلبنا 🎉`,
        action: { label: "متابعة طلبنا", href: "/orders" },
        duration: 12000,
        priority: 6,
      });

      clearCart();

      await refreshAuth();
    } else {
      showVisualAssistant({
        mood: "fall",
        text: result.message || "تعذر إنشاء الطلب. راجعي البيانات وحاولي مرة أخرى.",
        action: { label: "مراجعة السلة", href: "/cart" },
        duration: 11000,
        priority: 5,
      });
    }
  }

  if (
    !hydrated ||
    authLoading
  ) {
    return (
      <section
        className={styles.loading}
      >
        <LoaderCircle
          className={styles.spinner}
          size={24}
        />

        جاري تجهيز بيانات الطلب...
      </section>
    );
  }

  if (successOrder) {
    return (
      <section
        className={styles.successCard}
      >
        {successOrder.walletBalanceAfterEgp !== null && (
          <WalletTransactionAnimation
            previousBalanceEgp={
              successOrder.walletBalanceAfterEgp +
              successOrder.totalEgp
            }
            newBalanceEgp={successOrder.walletBalanceAfterEgp}
            deductedAmountEgp={successOrder.totalEgp}
            successMessage="تم إنشاء الطلب بنجاح"
          />
        )}

        <span
          className={styles.successIcon}
        >
          <CheckCircle2 size={35} />
        </span>

        <span
          className={
            styles.successLabel
          }
        >
          تم إنشاء الطلب
        </span>

        <h1>
          طلبك قيد التنفيذ
        </h1>

        <p>
          تم خصم قيمة الطلب من المحفظة
          وتسجيل العملية بنجاح.
        </p>

        <div
          className={
            styles.orderNumber
          }
        >
          <span>رقم الطلب</span>

          <strong>
            {successOrder.orderId}
          </strong>
        </div>

        <div
          className={
            styles.successSummary
          }
        >
          <div>
            <span>
              المجموع الفرعي
            </span>

            <strong>
              {formatUsd(
                successOrder.subtotalUsd,
              )}
            </strong>
          </div>

          {successOrder.discountUsd >
            0 && (
            <div>
              <span>الخصم</span>

              <strong>
                -{" "}
                {formatUsd(
                  successOrder.discountUsd,
                )}
              </strong>
            </div>
          )}

          <div>
            <span>
              المدفوع من المحفظة
            </span>

            <strong>
              {formatUsd(
                successOrder.totalUsd,
              )}
            </strong>
          </div>

          <div>
            <span>
              المقابل بالجنيه
            </span>

            <strong>
              {formatEgp(
                successOrder.totalEgp,
              )}
            </strong>
          </div>
        </div>

        <div
          className={
            styles.successActions
          }
        >
          <Link href="/orders">
            <PackageSearch size={17} />
            متابعة الطلب
          </Link>

          <Link href="/">
            الرجوع للمتجر
          </Link>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section
        className={styles.empty}
      >
        <PackageSearch size={31} />

        <h2>السلة فارغة</h2>

        <p>
          أضيفي المنتجات أولًا قبل
          الانتقال إلى تأكيد الطلب.
        </p>

        <Link href="/">
          الرجوع للمتجر
        </Link>
      </section>
    );
  }

  return (
    <section className={styles.layout}>
      <div className={styles.mainColumn}>
        <section className={styles.panel}>
          <header
            className={
              styles.panelHeading
            }
          >
            <span>
              <PackageCheck
                size={18}
              />
            </span>

            <div>
              <strong>
                مراجعة المنتجات
              </strong>

              <small>
                تأكدي من المنتج والكمية
                وبيانات التنفيذ.
              </small>
            </div>
          </header>

          <div
            className={
              styles.productsList
            }
          >
            {items.map((item) => {
              const unitPrice =
                getProductPriceUsd(
                  item.product,
                );

              return (
                <article
                  key={item.id}
                  className={
                    styles.product
                  }
                >
                  <img
                    src={
                      item.product.image
                    }
                    alt={
                      item.product.name
                    }
                  />

                  <div>
                    <span>
                      {
                        item.product
                          .category
                      }
                    </span>

                    <strong>
                      {
                        item.product
                          .name
                      }
                    </strong>

                    <small>
                      الكمية:{" "}
                      {item.quantity}
                    </small>
                  </div>

                  <strong>
                    {formatUsd(
                      unitPrice *
                        item.quantity,
                    )}
                  </strong>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.panel}>
          <header
            className={
              styles.panelHeading
            }
          >
            <span>
              <ShieldCheck
                size={18}
              />
            </span>

            <div>
              <strong>
                بيانات تنفيذ الطلب
              </strong>

              <small>
                البيانات التي ستُرسل إلى
                المورد.
              </small>
            </div>
          </header>

          <div
            className={
              styles.executionList
            }
          >
            {items.map((item) => (
              <article key={item.id}>
                <strong>
                  {item.product.name}
                </strong>

                {(item.product
                  .requiredFields ?? [])
                  .length === 0 ? (
                  <p>
                    لا يحتاج بيانات إضافية.
                  </p>
                ) : (
                  <div>
                    {(
                      item.product
                        .requiredFields ??
                      []
                    ).map(
                      (field) => (
                        <span
                          key={
                            field.id
                          }
                        >
                          <small>
                            {
                              field.label
                            }
                          </small>

                          <strong>
                            {item
                              .inputValues[
                              field.id
                            ] ||
                              "غير مضاف"}
                          </strong>
                        </span>
                      ),
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>

          {hasIncompleteItems && (
            <div
              className={
                styles.warning
              }
            >
              <AlertTriangle
                size={18}
              />

              <div>
                <strong>
                  توجد بيانات ناقصة
                </strong>

                <p>
                  ارجعي للسلة وأكملي بيانات
                  المنتجات قبل تأكيد الطلب.
                </p>
              </div>

              <Link href="/cart">
                تعديل
              </Link>
            </div>
          )}
        </section>

        <section className={styles.panel}>
          <header
            className={
              styles.panelHeading
            }
          >
            <span>
              <PackageSearch
                size={18}
              />
            </span>

            <div>
              <strong>
                ملاحظة على الطلب
              </strong>

              <small>
                اختيارية، ولا تضعي بها
                كلمات المرور.
              </small>
            </div>
          </header>

          <textarea
            className={
              styles.customerNote
            }
            value={customerNote}
            maxLength={400}
            onChange={(event) =>
              setCustomerNote(
                event.target.value,
              )
            }
            placeholder="أضيفي ملاحظة تساعد في تنفيذ الطلب"
          />

          <small
            className={
              styles.characterCount
            }
          >
            {customerNote.length}/400
          </small>
        </section>
      </div>

      <aside
        className={styles.summaryColumn}
      >
        <section
          className={styles.summary}
        >
          <header>
            <WalletCards size={19} />

            <div>
              <strong>
                ملخص الدفع
              </strong>

              <small>
                الدفع من محفظة DevPlay
              </small>
            </div>
          </header>

          <div
            className={
              styles.balanceCard
            }
          >
            <span>
              رصيد المحفظة
            </span>

            <strong>
              {formatUsd(balanceUsd)}
            </strong>

            <small>
              ≈{" "}
              {formatEgp(
                balanceUsd *
                  exchangeRate,
              )}
            </small>
          </div>

          <div
            className={
              styles.summaryRows
            }
          >
            <div>
              <span>
                المجموع الفرعي
              </span>

              <strong>
                {formatUsd(subtotal)}
              </strong>
            </div>

            {appliedCoupon && (
              <div
                className={
                  styles.discountRow
                }
              >
                <span>
                  خصم{" "}
                  {
                    appliedCoupon.code
                  }
                </span>

                <strong>
                  -{" "}
                  {formatUsd(
                    localDiscount,
                  )}
                </strong>
              </div>
            )}

            <div
              className={
                styles.totalRow
              }
            >
              <span>
                الإجمالي المتوقع
              </span>

              <strong>
                {formatUsd(
                  estimatedTotal,
                )}
              </strong>
            </div>

            <div>
              <span>
                الرصيد بعد الطلب
              </span>

              <strong>
                {formatUsd(
                  Math.max(
                    0,
                    estimatedBalanceAfter,
                  ),
                )}
              </strong>
            </div>
          </div>

          {balanceUsd <
            estimatedTotal && (
            <div
              className={
                styles.balanceWarning
              }
            >
              <CircleDollarSign
                size={17}
              />

              <p>
                رصيدك غير كافٍ. تحتاجي{" "}
                {formatUsd(
                  estimatedTotal -
                    balanceUsd,
                )}{" "}
                إضافية.
              </p>

              <Link href="/wallet/deposit">
                إضافة رصيد
              </Link>
            </div>
          )}

          {message && (
            <p
              className={styles.message}
              role="alert"
            >
              {message}
            </p>
          )}

          <Button
            fullWidth
            size="large"
            disabled={
              submitting ||
              hasIncompleteItems ||
              balanceUsd <
                estimatedTotal
            }
            onClick={() => {
              void handleConfirmOrder();
            }}
          >
            {submitting ? (
              <>
                <LoaderCircle
                  className={
                    styles.spinner
                  }
                  size={18}
                />

                جاري إنشاء الطلب
              </>
            ) : (
              "تأكيد وخصم الرصيد"
            )}
          </Button>

          <p
            className={
              styles.paymentNotice
            }
          >
            بالضغط على التأكيد سيتم خصم
            الرصيد وإنشاء الطلب، ولا يتم
            إرسال كلمة مرور الحساب للموقع.
          </p>
        </section>

        <Link
          className={styles.backLink}
          href="/cart"
        >
          <ArrowRight size={16} />
          الرجوع إلى السلة
        </Link>
      </aside>
    </section>
  );
}
