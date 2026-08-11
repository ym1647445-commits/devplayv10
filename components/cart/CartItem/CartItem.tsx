"use client";

import {
  Check,
  Minus,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getProductPriceUsd,
} from "@/lib/productPricing";

import {
  useCartStore,
} from "@/stores/cartStore";

import type {
  CartItem as CartItemType,
  CartItemInputValues,
} from "@/types/cart";

import styles from "./CartItem.module.css";

interface CartItemProps {
  item:
    CartItemType;
}

function getUsdToEgpRate(
  item:
    CartItemType,
): number {
  const data =
    item.product
      .providerData;

  if (
    !data ||
    typeof data !==
      "object"
  ) {
    return 50;
  }

  const value =
    Number(
      (
        data as Record<
          string,
          unknown
        >
      ).usdToEgpRate,
    );

  if (
    !Number.isFinite(
      value,
    ) ||
    value <= 0
  ) {
    return 50;
  }

  return value;
}

function formatEgp(
  value: number,
): string {
  return `${Number(
    value,
  ).toLocaleString(
    "ar-EG",
    {
      minimumFractionDigits:
        0,

      maximumFractionDigits:
        2,
    },
  )} ج.م`;
}

function getProviderOfferId(
  item:
    CartItemType,
): string | null {
  const data =
    item.product
      .providerData;

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
    ).providerOfferId;

  return typeof value ===
    "string"
    ? value
    : null;
}

export function CartItem({
  item,
}: CartItemProps) {
  const [
    editing,
    setEditing,
  ] = useState(false);

  const [
    draftValues,
    setDraftValues,
  ] =
    useState<CartItemInputValues>(
      item.inputValues,
    );

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState<
    Record<
      string,
      string
    >
  >({});

  const increaseQuantity =
    useCartStore(
      (state) =>
        state.increaseQuantity,
    );

  const decreaseQuantity =
    useCartStore(
      (state) =>
        state.decreaseQuantity,
    );

  const removeItem =
    useCartStore(
      (state) =>
        state.removeItem,
    );

  const updateItemInputs =
    useCartStore(
      (state) =>
        state.updateItemInputs,
    );

  useEffect(() => {
    setDraftValues(
      item.inputValues,
    );
  }, [
    item.inputValues,
  ]);

  const unitPriceUsd =
    getProductPriceUsd(
      item.product,
    );

  const usdToEgpRate =
    getUsdToEgpRate(
      item,
    );

  const unitPriceEgp =
    unitPriceUsd *
    usdToEgpRate;

  const totalEgp =
    unitPriceEgp *
    item.quantity;

  const requiredFields =
    item.product
      .requiredFields ??
    [];

  const hasRequiredFields =
    requiredFields.length >
    0;

  const dataComplete =
    requiredFields.every(
      (field) =>
        !field.required ||
        Boolean(
          item.inputValues[
            field.id
          ]?.trim(),
        ),
    );

  const minimumQuantity =
    Math.max(
      1,
      Number(
        item.product
          .minimumQuantity ??
        1,
      ),
    );

  const maximumQuantity =
    Math.max(
      minimumQuantity,
      Number(
        item.product
          .maximumQuantity ??
        99,
      ),
    );

  const canChangeQuantity =
    maximumQuantity >
    minimumQuantity;

  const providerOfferId =
    useMemo(
      () =>
        getProviderOfferId(
          item,
        ),
      [
        item,
      ],
    );

  function updateDraft(
    fieldId: string,
    value: string,
  ): void {
    setDraftValues(
      (current) => ({
        ...current,

        [fieldId]:
          value,
      }),
    );

    setFieldErrors(
      (current) => ({
        ...current,

        [fieldId]:
          "",
      }),
    );
  }

  function validateInputs():
    boolean {
    const errors:
      Record<
        string,
        string
      > = {};

    requiredFields.forEach(
      (field) => {
        const value =
          draftValues[
            field.id
          ]?.trim() ??
          "";

        if (
          field.required &&
          !value
        ) {
          errors[
            field.id
          ] =
            `برجاء إدخال ${field.label}.`;

          return;
        }

        if (
          field.type ===
            "email" &&
          value &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            value,
          )
        ) {
          errors[
            field.id
          ] =
            "البريد الإلكتروني غير صحيح.";
        }

        if (
          field.type ===
            "url" &&
          value
        ) {
          try {
            new URL(
              value,
            );
          } catch {
            errors[
              field.id
            ] =
              "الرابط غير صحيح.";
          }
        }

        if (
          field.pattern &&
          value
        ) {
          try {
            const expression =
              new RegExp(
                field.pattern,
              );

            if (
              !expression.test(
                value,
              )
            ) {
              errors[
                field.id
              ] =
                field.patternMessage ??
                "البيانات غير صحيحة.";
            }
          } catch {
            /*
             * لو Pattern مكتوب
             * غلط من الأدمن
             * مانمنعش العميل.
             */
          }
        }
      },
    );

    setFieldErrors(
      errors,
    );

    return (
      Object.keys(
        errors,
      ).length === 0
    );
  }

  function saveInputs():
    void {
    if (
      !validateInputs()
    ) {
      return;
    }

    /*
     * نحافظ على metadata
     * الخاصة بالباقة.
     */
    const metadata:
      CartItemInputValues =
      {};

    for (
      const [
        key,
        value,
      ]
      of Object.entries(
        item.inputValues,
      )
    ) {
      if (
        key.startsWith(
          "__",
        )
      ) {
        metadata[
          key
        ] = value;
      }
    }

    updateItemInputs(
      item.id,
      {
        ...metadata,
        ...draftValues,
      },
    );

    setEditing(
      false,
    );
  }

  return (
    <article
      className={
        styles.item
      }
    >
      <div
        className={
          styles.productRow
        }
      >
        {item.product.image ? (
          <img
            className={
              styles.image
            }
            src={
              item.product.image
            }
            alt={
              item.product.name
            }
          />
        ) : (
          <div
            className={
              styles.image
            }
            style={{
              display:
                "grid",

              placeItems:
                "center",

              background:
                "var(--surface-soft)",

              color:
                "var(--muted)",

              fontSize:
                9,
            }}
          >
            DevPlay
          </div>
        )}

        <div
          className={
            styles.details
          }
        >
          <span
            className={
              styles.category
            }
          >
            {
              item.product
                .category
            }
          </span>

          <strong
            className={
              styles.name
            }
          >
            {
              item.product
                .name
            }
          </strong>

          <span
            className={
              styles.unitPrice
            }
          >
            {formatEgp(
              unitPriceEgp,
            )}
          </span>

          {providerOfferId && (
            <small
              style={{
                color:
                  "var(--muted)",

                fontSize:
                  7,

                overflowWrap:
                  "anywhere",
              }}
            >
              كود الباقة:{" "}
              {
                providerOfferId
              }
            </small>
          )}

          <div
            className={
              styles.bottomRow
            }
          >
            {canChangeQuantity ? (
              <div
                className={
                  styles.quantity
                }
              >
                <button
                  type="button"
                  disabled={
                    item.quantity <=
                    minimumQuantity
                  }
                  onClick={() =>
                    decreaseQuantity(
                      item.id,
                    )
                  }
                  aria-label="تقليل الكمية"
                >
                  <Minus
                    size={15}
                  />
                </button>

                <strong>
                  {
                    item.quantity
                  }
                </strong>

                <button
                  type="button"
                  disabled={
                    item.quantity >=
                    maximumQuantity
                  }
                  onClick={() =>
                    increaseQuantity(
                      item.id,
                    )
                  }
                  aria-label="زيادة الكمية"
                >
                  <Plus
                    size={15}
                  />
                </button>
              </div>
            ) : (
              <span
                style={{
                  color:
                    "var(--muted)",

                  fontSize:
                    8,
                }}
              >
                باقة واحدة
              </span>
            )}

            <strong
              className={
                styles.total
              }
            >
              {formatEgp(
                totalEgp,
              )}
            </strong>
          </div>
        </div>

        <button
          className={
            styles.deleteButton
          }
          type="button"
          onClick={() =>
            removeItem(
              item.id,
            )
          }
          aria-label={`حذف ${item.product.name}`}
        >
          <Trash2
            size={17}
          />
        </button>
      </div>

      {hasRequiredFields && (
        <section
          className={
            styles.customerData
          }
        >
          <header
            className={
              styles.dataHeading
            }
          >
            <div>
              <strong>
                بيانات تنفيذ الطلب
              </strong>

              <small
                className={
                  dataComplete
                    ? styles.complete
                    : styles.incomplete
                }
              >
                {dataComplete ? (
                  <>
                    <Check
                      size={12}
                    />

                    البيانات مكتملة
                  </>
                ) : (
                  <>
                    <X
                      size={12}
                    />

                    البيانات ناقصة
                  </>
                )}
              </small>
            </div>

            {!editing && (
              <button
                type="button"
                onClick={() =>
                  setEditing(
                    true,
                  )
                }
              >
                <Pencil
                  size={13}
                />

                تعديل
              </button>
            )}
          </header>

          {editing ? (
            <div
              className={
                styles.inputsGrid
              }
            >
              {requiredFields.map(
                (field) => (
                  <label
                    key={
                      field.id
                    }
                  >
                    <span>
                      {
                        field.label
                      }

                      {field.required &&
                        " *"}
                    </span>

                    <input
                      type={
                        field.type
                      }
                      value={
                        draftValues[
                          field.id
                        ] ??
                        ""
                      }
                      placeholder={
                        field.placeholder
                      }
                      inputMode={
                        field.type ===
                        "number"
                          ? "numeric"
                          : undefined
                      }
                      onChange={(
                        event,
                      ) =>
                        updateDraft(
                          field.id,
                          event
                            .target
                            .value,
                        )
                      }
                    />

                    {fieldErrors[
                      field.id
                    ] ? (
                      <small
                        className={
                          styles.inputError
                        }
                      >
                        {
                          fieldErrors[
                            field.id
                          ]
                        }
                      </small>
                    ) : (
                      field.helperText && (
                        <small>
                          {
                            field.helperText
                          }
                        </small>
                      )
                    )}
                  </label>
                ),
              )}

              <div
                className={
                  styles.dataActions
                }
              >
                <button
                  type="button"
                  onClick={() => {
                    setDraftValues(
                      item.inputValues,
                    );

                    setFieldErrors(
                      {},
                    );

                    setEditing(
                      false,
                    );
                  }}
                >
                  <X
                    size={14}
                  />

                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={
                    saveInputs
                  }
                >
                  <Save
                    size={14}
                  />

                  حفظ البيانات
                </button>
              </div>
            </div>
          ) : (
            <div
              className={
                styles.savedValues
              }
            >
              {requiredFields.map(
                (field) => (
                  <div
                    key={
                      field.id
                    }
                  >
                    <span>
                      {
                        field.label
                      }
                    </span>

                    <strong>
                      {item.inputValues[
                        field.id
                      ] ||
                        "غير مضاف"}
                    </strong>
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      )}
    </article>
  );
}