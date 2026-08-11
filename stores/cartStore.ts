"use client";

import {
  create,
} from "zustand";

import {
  createJSONStorage,
  persist,
} from "zustand/middleware";

import {
  getProductCostUsd,
  getProductPriceUsd,
} from "@/lib/productPricing";

import type {
  CartItem,
  CartItemInputValues,
} from "@/types/cart";

import type {
  AppliedCoupon,
} from "@/types/coupon";

import type {
  Product,
} from "@/types/product";

interface CartNotice {
  type:
    | "success"
    | "warning"
    | "error";

  message: string;
}

interface CartState {
  items:
    CartItem[];

  appliedCoupon:
    | AppliedCoupon
    | null;

  cartNotice:
    | CartNotice
    | null;

  hydrated:
    boolean;

  addItem: (
    product: Product,
    quantity?: number,
    inputValues?: CartItemInputValues,
  ) => void;

  removeItem: (
    cartItemId: string,
  ) => void;

  increaseQuantity: (
    cartItemId: string,
  ) => void;

  decreaseQuantity: (
    cartItemId: string,
  ) => void;

  setQuantity: (
    cartItemId: string,
    quantity: number,
  ) => void;

  updateItemInputs: (
    cartItemId: string,
    inputValues: CartItemInputValues,
  ) => void;

  setAppliedCoupon: (
    coupon: AppliedCoupon,
  ) => void;

  removeCoupon: () => void;

  clearCartNotice:
    () => void;

  clearCart:
    () => void;

  setHydrated: (
    hydrated: boolean,
  ) => void;
}

function getMinimumQuantity(
  product: Product,
): number {
  const value =
    Number(
      product.minimumQuantity ??
      1,
    );

  if (
    !Number.isFinite(
      value,
    ) ||
    value < 1
  ) {
    return 1;
  }

  return Math.floor(
    value,
  );
}

function getMaximumQuantity(
  product: Product,
): number {
  const minimum =
    getMinimumQuantity(
      product,
    );

  const value =
    Number(
      product.maximumQuantity ??
      99,
    );

  if (
    !Number.isFinite(
      value,
    ) ||
    value <
      minimum
  ) {
    return minimum;
  }

  return Math.floor(
    value,
  );
}

function clampQuantity(
  product: Product,
  quantity: number,
): number {
  const minimum =
    getMinimumQuantity(
      product,
    );

  const maximum =
    getMaximumQuantity(
      product,
    );

  const safe =
    Number.isFinite(
      quantity,
    )
      ? Math.floor(
          quantity,
        )
      : minimum;

  return Math.min(
    maximum,
    Math.max(
      minimum,
      safe,
    ),
  );
}

function getOfferId(
  product: Product,
): string | null {
  const data =
    product.providerData;

  if (
    !data ||
    typeof data !==
      "object"
  ) {
    return null;
  }

  const value =
    (
      data as Record<
        string,
        unknown
      >
    ).storeProductOfferId;

  return typeof value ===
    "string"
    ? value
    : null;
}

function hasCustomerInputs(
  product: Product,
): boolean {
  return (
    (
      product.requiredFields
        ?.length ??
      0
    ) > 0
  );
}

export const useCartStore =
  create<CartState>()(
    persist(
      (
        set,
        get,
      ) => {
        function updateItems(
          updater: (
            items:
              CartItem[],
          ) => CartItem[],
        ): void {
          const state =
            get();

          const nextItems =
            updater(
              state.items,
            );

          if (
            state.appliedCoupon
          ) {
            set({
              items:
                nextItems,

              appliedCoupon:
                null,

              cartNotice: {
                type:
                  "warning",

                message:
                  "تم تغيير محتوى السلة، لذلك أُزيل الكوبون. طبّقيه مرة أخرى للتأكد من الشروط.",
              },
            });

            return;
          }

          set({
            items:
              nextItems,
          });
        }

        return {
          items:
            [],

          appliedCoupon:
            null,

          cartNotice:
            null,

          hydrated:
            false,

          addItem: (
            product,
            quantity = 1,
            inputValues = {},
          ) => {
            const safeQuantity =
              clampQuantity(
                product,
                quantity,
              );

            updateItems(
              (items) => {
                const requiresInputs =
                  hasCustomerInputs(
                    product,
                  );

                /*
                 * لو الباقة تحتاج
                 * Player ID أو بيانات
                 * تنفيذ، نخزن كل إضافة
                 * كعنصر مستقل.
                 */
                if (
                  requiresInputs
                ) {
                  return [
                    ...items,

                    {
                      id:
                        crypto.randomUUID(),

                      product,

                      quantity:
                        safeQuantity,

                      inputValues,
                    },
                  ];
                }

                const selectedOfferId =
                  getOfferId(
                    product,
                  );

                /*
                 * الدمج يتم فقط لو:
                 * نفس المنتج
                 * + نفس الباقة
                 * + بدون بيانات تنفيذ.
                 */
                const existingItem =
                  items.find(
                    (item) => {
                      const existingOfferId =
                        getOfferId(
                          item.product,
                        );

                      return (
                        item
                          .product
                          .id ===
                          product.id &&
                        existingOfferId ===
                          selectedOfferId &&
                        Object.keys(
                          item.inputValues,
                        ).length ===
                          0
                      );
                    },
                  );

                if (
                  existingItem
                ) {
                  return items.map(
                    (item) => {
                      if (
                        item.id !==
                        existingItem.id
                      ) {
                        return item;
                      }

                      return {
                        ...item,

                        quantity:
                          clampQuantity(
                            item.product,
                            item.quantity +
                              safeQuantity,
                          ),
                      };
                    },
                  );
                }

                return [
                  ...items,

                  {
                    id:
                      crypto.randomUUID(),

                    product,

                    quantity:
                      safeQuantity,

                    inputValues:
                      {},
                  },
                ];
              },
            );

            set({
              cartNotice: {
                type:
                  "success",

                message:
                  "تمت إضافة الباقة إلى السلة.",
              },
            });
          },

          removeItem: (
            cartItemId,
          ) => {
            updateItems(
              (items) =>
                items.filter(
                  (item) =>
                    item.id !==
                    cartItemId,
                ),
            );

            set({
              cartNotice: {
                type:
                  "warning",

                message:
                  "تم حذف الباقة من السلة.",
              },
            });
          },

          increaseQuantity: (
            cartItemId,
          ) => {
            updateItems(
              (items) =>
                items.map(
                  (item) => {
                    if (
                      item.id !==
                      cartItemId
                    ) {
                      return item;
                    }

                    return {
                      ...item,

                      quantity:
                        clampQuantity(
                          item.product,
                          item.quantity +
                            1,
                        ),
                    };
                  },
                ),
            );
          },

          decreaseQuantity: (
            cartItemId,
          ) => {
            updateItems(
              (items) =>
                items.flatMap(
                  (item) => {
                    if (
                      item.id !==
                      cartItemId
                    ) {
                      return [
                        item,
                      ];
                    }

                    const minimum =
                      getMinimumQuantity(
                        item.product,
                      );

                    if (
                      item.quantity <=
                      minimum
                    ) {
                      return [];
                    }

                    return [
                      {
                        ...item,

                        quantity:
                          item.quantity -
                          1,
                      },
                    ];
                  },
                ),
            );
          },

          setQuantity: (
            cartItemId,
            quantity,
          ) => {
            updateItems(
              (items) =>
                items.flatMap(
                  (item) => {
                    if (
                      item.id !==
                      cartItemId
                    ) {
                      return [
                        item,
                      ];
                    }

                    if (
                      quantity <=
                      0
                    ) {
                      return [];
                    }

                    return [
                      {
                        ...item,

                        quantity:
                          clampQuantity(
                            item.product,
                            quantity,
                          ),
                      },
                    ];
                  },
                ),
            );
          },

          updateItemInputs: (
            cartItemId,
            inputValues,
          ) => {
            updateItems(
              (items) =>
                items.map(
                  (item) =>
                    item.id ===
                    cartItemId
                      ? {
                          ...item,

                          inputValues,
                        }
                      : item,
                ),
            );

            if (
              !get()
                .appliedCoupon
            ) {
              set({
                cartNotice: {
                  type:
                    "success",

                  message:
                    "تم حفظ بيانات تنفيذ الباقة.",
                },
              });
            }
          },

          setAppliedCoupon: (
            coupon,
          ) => {
            set({
              appliedCoupon:
                coupon,

              cartNotice: {
                type:
                  "success",

                message:
                  `تم تطبيق ${coupon.title} بنجاح.`,
              },
            });
          },

          removeCoupon:
            () => {
              set({
                appliedCoupon:
                  null,

                cartNotice: {
                  type:
                    "warning",

                  message:
                    "تمت إزالة الكوبون من السلة.",
                },
              });
            },

          clearCartNotice:
            () => {
              set({
                cartNotice:
                  null,
              });
            },

          clearCart:
            () => {
              set({
                items:
                  [],

                appliedCoupon:
                  null,

                cartNotice:
                  null,
              });
            },

          setHydrated: (
            hydrated,
          ) => {
            set({
              hydrated,
            });
          },
        };
      },

      {
        /*
         * v4 بدل v3
         * عشان السلة القديمة
         * متلخبطش النظام الجديد.
         */
        name:
          "devplay-cart-v4",

        storage:
          createJSONStorage(
            () =>
              localStorage,
          ),

        partialize: (
          state,
        ) => ({
          items:
            state.items,

          appliedCoupon:
            state.appliedCoupon,
        }),

        onRehydrateStorage:
          () => {
            return (
              state,
            ) => {
              state?.setHydrated(
                true,
              );
            };
          },
      },
    ),
  );

export function getCartItemsCount(
  items:
    CartItem[],
): number {
  return items.reduce(
    (
      total,
      item,
    ) =>
      total +
      item.quantity,
    0,
  );
}

export function getCartSubtotal(
  items:
    CartItem[],
): number {
  return items.reduce(
    (
      total,
      item,
    ) =>
      total +
      getProductPriceUsd(
        item.product,
      ) *
        item.quantity,
    0,
  );
}

export function getCartTotalCost(
  items:
    CartItem[],
): number {
  return items.reduce(
    (
      total,
      item,
    ) =>
      total +
      getProductCostUsd(
        item.product,
      ) *
        item.quantity,
    0,
  );
}

export function isCartItemComplete(
  item:
    CartItem,
): boolean {
  return (
    item.product
      .requiredFields
      ?.every(
        (field) => {
          if (
            !field.required
          ) {
            return true;
          }

          return Boolean(
            item.inputValues[
              field.id
            ]?.trim(),
          );
        },
      ) ??
    true
  );
}