"use client";

import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  ShoppingBag,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { calculateRewardPoints } from "@/lib/rewardPoints";

import { CartItem } from "@/components/cart/CartItem";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { validateCartCoupon } from "@/app/cart/actions";
import { formatUsd } from "@/lib/productPricing";
import {
  getCartItemsCount,
  getCartSubtotal,
  isCartItemComplete,
  useCartStore,
} from "@/stores/cartStore";

export default function CartPage() {
  const router = useRouter();

  const [couponCode, setCouponCode] =
    useState("");

  const [
    couponMessage,
    setCouponMessage,
  ] = useState("");

  const [
    couponSuccess,
    setCouponSuccess,
  ] = useState(false);
  const [
  validatingCoupon,
  setValidatingCoupon,
] = useState(false);

  const items = useCartStore(
    (state) => state.items,
  );

  const appliedCoupon =
    useCartStore(
      (state) =>
        state.appliedCoupon,
    );

  const cartNotice =
    useCartStore(
      (state) =>
        state.cartNotice,
    );

  const hydrated =
    useCartStore(
      (state) =>
        state.hydrated,
    );

  const clearCart =
    useCartStore(
      (state) =>
        state.clearCart,
    );

  const setAppliedCoupon =
  useCartStore(
    (state) =>
      state.setAppliedCoupon,
  );

  const removeCoupon =
    useCartStore(
      (state) =>
        state.removeCoupon,
    );

  const clearCartNotice =
    useCartStore(
      (state) =>
        state.clearCartNotice,
    );

  if (!hydrated) {
    return (
      <AppShell>
        <div className="cart-loading">
          جاري تحميل السلة...
        </div>
      </AppShell>
    );
  }

  const itemsCount =
    getCartItemsCount(items);

  const subtotal =
    getCartSubtotal(items);

  const discount =
    appliedCoupon?.discount ?? 0;

  const total = Math.max(
    0,
    subtotal - discount,
  );
  const expectedPoints =
  calculateRewardPoints(total);

  const incompleteItems =
    items.filter(
      (item) =>
        !isCartItemComplete(item),
    );

  const checkoutDisabled =
    incompleteItems.length > 0;

  async function handleApplyCoupon(): Promise<void> {
  clearCartNotice();

  const normalizedCode =
    couponCode
      .trim()
      .toUpperCase();

  if (!normalizedCode) {
    return;
  }

  setValidatingCoupon(true);
  setCouponMessage("");
  setCouponSuccess(false);

  const result =
    await validateCartCoupon({
      code: normalizedCode,

      items: items.map(
        (item) => ({
          productId:
            String(item.product.providerData?.mainProductId ?? ""),

          offerId:
            String(item.product.providerData?.storeProductOfferId ?? ""),

          quantity:
            item.quantity,
        }),
      ),
    });

  setValidatingCoupon(false);

  setCouponSuccess(
    result.success,
  );

  setCouponMessage(
    result.message,
  );

  if (
    result.success &&
    result.coupon
  ) {
    setAppliedCoupon(
      result.coupon,
    );

    setCouponCode("");
  }
}

  function handleRemoveCoupon(): void {
    removeCoupon();
    setCouponMessage("");
    setCouponSuccess(false);
  }

  function handleClearCart(): void {
    clearCart();
    setCouponCode("");
    setCouponMessage("");
    setCouponSuccess(false);
  }

  function handleCheckout(): void {
    clearCartNotice();

    if (checkoutDisabled) {
      return;
    }

    router.push("/checkout");
  }

  return (
    <AppShell>
      <section className="cart-page">
        <div className="cart-heading">
          <div>
            <span>
              مراجعة الطلب
            </span>

            <h1>
              سلة التسوق
            </h1>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClearCart}
            >
              <Trash2 size={16} />
              تفريغ
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <span>
              <ShoppingBag
                size={30}
              />
            </span>

            <h2>
              السلة فاضية
            </h2>

            <p>
              ضيفي المنتجات اللي
              محتاجاها وهتظهر هنا.
            </p>

            <Button
              rightIcon={
                <ArrowLeft />
              }
              onClick={() => {
                router.push("/");
              }}
            >
              تصفح المنتجات
            </Button>
          </div>
        ) : (
          <>
            {cartNotice && (
              <div
                className={`cart-notice ${cartNotice.type}`}
                role="alert"
                aria-live="polite"
              >
                <span>
                  {cartNotice.message}
                </span>

                <button
                  type="button"
                  onClick={
                    clearCartNotice
                  }
                  aria-label="إغلاق التنبيه"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="cart-items">
              {items.map(
                (item) => (
                  <CartItem
                    item={item}
                    key={item.id}
                  />
                ),
              )}
            </div>

            <section className="coupon-panel">
              <div className="coupon-panel-title">
                <span>
                  <Tag size={18} />
                </span>

                <div>
                  <strong>
                    عندك كوبون؟
                  </strong>

                  <small>
                    اكتبي الكود وهنتأكد من
                    الشروط والربح تلقائيًا.
                  </small>
                </div>
              </div>

              {appliedCoupon ? (
                <div className="applied-coupon">
                  <div>
                    <CheckCircle2
                      size={18}
                    />

                    <span>
                      <strong>
                        {
                          appliedCoupon.code
                        }
                      </strong>

                      <small>
                        وفرتي{" "}
                        {formatUsd(
                          appliedCoupon.discount,
                        )}
                      </small>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleRemoveCoupon
                    }
                    aria-label="إزالة الكوبون"
                  >
                    <X size={17} />
                  </button>
                </div>
              ) : (
                <div className="coupon-input-row">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(event) => {
                      setCouponCode(
                        event.target.value,
                      );

                      if (
                        couponMessage
                      ) {
                        setCouponMessage(
                          "",
                        );
                      }
                    }}
                    onKeyDown={(event) => {
  if (
    event.key === "Enter" &&
    couponCode.trim() &&
    !validatingCoupon
  ) {
    event.preventDefault();

    void handleApplyCoupon();
  }
}}
                    placeholder="مثال: SAVE20"
                    aria-label="كود الكوبون"
                  />

                  <Button
  size="small"
  onClick={() => {
    void handleApplyCoupon();
  }}
  disabled={
    validatingCoupon ||
    couponCode.trim().length === 0
  }
>
  {validatingCoupon ? (
    <>
      <LoaderCircle
        size={15}
        className="coupon-spinner"
      />

      تحقق
    </>
  ) : (
    "تطبيق"
  )}
</Button>
                </div>
              )}

              {couponMessage && (
                <p
                  className={
                    couponSuccess
                      ? "coupon-message success"
                      : "coupon-message error"
                  }
                  role="status"
                >
                  {couponMessage}
                </p>
              )}
            </section>

            <section className="cart-summary">
              <div>
                <span>
                  عدد المنتجات
                </span>
                <div className="cart-points-preview">
  <span>
    النقاط المتوقعة
  </span>

  <strong>
    +{" "}
    {expectedPoints.toLocaleString(
      "ar-EG",
    )}{" "}
    نقطة
  </strong>
</div>

<p className="cart-points-note">
  تُضاف النقاط إلى حسابك بعد اكتمال
  تنفيذ الطلب بنجاح.
</p>

                <strong>
                  {itemsCount}
                </strong>
              </div>

              <div>
                <span>
                  المجموع الفرعي
                </span>

                <strong>
                  {formatUsd(
                    subtotal,
                  )}
                </strong>
              </div>

              {discount > 0 && (
                <div className="discount-row">
                  <span>
                    خصم الكوبون
                  </span>

                  <strong>
                    -{" "}
                    {formatUsd(
                      discount,
                    )}
                  </strong>
                </div>
              )}

              <div className="cart-total">
                <span>
                  الإجمالي
                </span>

                <strong>
                  {formatUsd(total)}
                </strong>
              </div>

              <Button
                fullWidth
                size="large"
                disabled={
                  checkoutDisabled
                }
                onClick={
                  handleCheckout
                }
              >
                {checkoutDisabled
                  ? "أكملي بيانات المنتجات أولًا"
                  : "متابعة إتمام الطلب"}
              </Button>

              {checkoutDisabled && (
                <p className="checkout-data-warning">
                  يوجد{" "}
                  {incompleteItems.length.toLocaleString(
                    "ar-EG",
                  )}{" "}
                  منتج يحتاج إلى استكمال
                  بيانات التنفيذ.
                </p>
              )}
            </section>
          </>
        )}
      </section>
    </AppShell>
  );
}
