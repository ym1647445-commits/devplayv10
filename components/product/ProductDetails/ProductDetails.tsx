"use client";

import {
  ArrowRight,
  CheckCircle2,
  Heart,
  Info,
  Share2,
  ShoppingCart,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Button,
} from "@/components/ui/Button";

import {
  useCartStore,
} from "@/stores/cartStore";

import {
  useFavoritesStore,
} from "@/stores/favoritesStore";

import type {
  Product,
  ProductRequiredField,
} from "@/types/product";

import styles from "./ProductDetails.module.css";

interface ProductOffer {
  id: string;

  providerOfferId: string;

  nameAr: string;
  nameEn: string | null;

  supplierPriceUsd: number;
  profitUsd: number;

  finalPriceUsd: number;

  oldPriceUsd:
    | number
    | null;

  stock:
    | number
    | null;

  requiredFields:
    ProductRequiredField[];

  catalogType:
    | "topup"
    | "gc"
    | null;

  instructionsAr:
    | string
    | null;

  customerNoteAr:
    | string
    | null;
}

interface StoreProductDetails {
  id: string;

  slug: string;

  nameAr: string;
  nameEn: string | null;

  shortDescriptionAr:
    | string
    | null;

  descriptionAr:
    | string
    | null;

  imageUrl:
    | string
    | null;

  featured: boolean;
  instantDelivery: boolean;

  deliveryTime:
    | string
    | null;

  badge:
    | string
    | null;

  usdToEgpRate: number;

  category:
    | {
        id: string;
        nameAr: string;
        slug: string;
      }
    | null;

  defaultRequiredFields:
    ProductRequiredField[];

  offers:
    ProductOffer[];
}

interface ProductDetailsProps {
  product:
    StoreProductDetails;
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

export function ProductDetails({
  product,
}: ProductDetailsProps) {
  useEffect(()=>{try{localStorage.setItem("devplay-last-viewed-product",JSON.stringify({id:product.id,slug:product.slug,name:product.nameAr,image:product.imageUrl??"",shortDescription:product.shortDescriptionAr??"",viewedAt:new Date().toISOString()}))}catch{}},[product.id,product.slug,product.nameAr,product.imageUrl,product.shortDescriptionAr]);
  const [
    selectedOfferId,
    setSelectedOfferId,
  ] = useState(
    product.offers[0]?.id ??
      "",
  );

  const [
    inputValues,
    setInputValues,
  ] = useState<
    Record<
      string,
      string
    >
  >({});

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState<
    Record<
      string,
      string
    >
  >({});

  const [
    message,
    setMessage,
  ] = useState("");

  const selectedOffer =
    useMemo(() => {
      return (
        product.offers.find(
          (offer) =>
            offer.id ===
            selectedOfferId,
        ) ??
        product.offers[0] ??
        null
      );
    }, [
      product.offers,
      selectedOfferId,
    ]);

  const requiredFields =
    useMemo(() => {
      // Gift cards deliver a code and never inherit Player ID from the
      // parent product. Only direct top-up offers may use that fallback.
      if (selectedOffer?.catalogType === "gc") {
        return [];
      }

      if (
        selectedOffer &&
        selectedOffer
          .requiredFields
          .length > 0
      ) {
        return selectedOffer
          .requiredFields;
      }

      return product
        .defaultRequiredFields;
    }, [
      selectedOffer,
      product
        .defaultRequiredFields,
    ]);

  function selectOffer(offerId:string){setSelectedOfferId(offerId);setInputValues({});setFieldErrors({});setMessage("")}

  const addItem =
    useCartStore(
      (state) =>
        state.addItem,
    );

  const compatibilityProduct =
    useMemo(() => {
      const offer =
        selectedOffer;

      return {
        id:
          offer
            ? `${product.id}:${offer.id}`
            : product.id,

        slug:
          product.slug,

        name:
          offer
            ? `${product.nameAr} - ${offer.nameAr}`
            : product.nameAr,

        image:
          product.imageUrl ??
          "",

        category:
          product.category
            ?.nameAr ??
          "خدمات رقمية",

        shortDescription:
          product.shortDescriptionAr ??
          "",

        description:
          product.descriptionAr ??
          "",

        supplierPriceUsd:
          offer
            ?.supplierPriceUsd ??
          0,

        costPrice: offer?.supplierPriceUsd ?? 0,
        price: offer ? offer.supplierPriceUsd + offer.profitUsd : 0,
        currency: "USD",
        fallbackUsdRate: product.usdToEgpRate,

        profitUsd:
          offer
            ?.profitUsd ??
          0,

        oldPriceUsd:
          offer
            ?.oldPriceUsd ??
          null,

        minimumQuantity:
          1,

        maximumQuantity:
          1,

        requiredFields,

        status:
          offer
            ? "available"
            : "unavailable",

        instantDelivery:
          product.instantDelivery,

        deliveryTime:
          product.deliveryTime,

        badge:
          product.badge,

        featured:
          product.featured,

        rating:
          5,

        reviewsCount:
          0,

        providerData: {
          mainProductId:
            product.id,

          storeProductOfferId:
            offer?.id ??
            null,

          providerOfferId:
            offer
              ?.providerOfferId ??
            null,

          usdToEgpRate:
            product.usdToEgpRate,
        },
      } as Product;
    }, [
      product,
      requiredFields,
      selectedOffer,
    ]);

  const toggleFavorite =
    useFavoritesStore(
      (state) =>
        state.toggleFavorite,
    );

  const isFavorite =
    useFavoritesStore(
      (state) =>
        state.items.some(
          (item) =>
            item.id ===
            compatibilityProduct.id,
        ),
    );

  const finalPriceEgp =
    selectedOffer
      ? selectedOffer
          .finalPriceUsd *
        product.usdToEgpRate
      : 0;

  const oldPriceEgp =
    selectedOffer
      ?.oldPriceUsd ===
      null ||
    selectedOffer
      ?.oldPriceUsd ===
      undefined
      ? null
      : selectedOffer.oldPriceUsd *
        product.usdToEgpRate;

  function updateField(
    fieldId: string,
    value: string,
  ) {
    setInputValues(
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

  function validateFields() {
    const errors:
      Record<
        string,
        string
      > = {};

    requiredFields.forEach(
      (field) => {
        const value =
          inputValues[
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
            "برجاء إدخال بريد إلكتروني صحيح.";
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
              "برجاء إدخال رابط صحيح.";
          }
        }

        if (
          field.pattern &&
          value
        ) {
          try {
            const regex =
              new RegExp(
                field.pattern,
              );

            if (
              !regex.test(
                value,
              )
            ) {
              errors[
                field.id
              ] =
                field.patternMessage ??
                `قيمة ${field.label} غير صحيحة.`;
            }
          } catch {
            // تجاهل Pattern غير صالح من الأدمن.
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

  function handleAddToCart() {
    if (
      !selectedOffer
    ) {
      setMessage(
        "اختار الباقة الأول.",
      );

      return;
    }

    if (
      !validateFields()
    ) {
      setMessage(
        "راجع البيانات المطلوبة.",
      );

      return;
    }

    addItem(
      compatibilityProduct,
      1,
      {
        ...inputValues,

        __product_id:
          product.id,

        __offer_id:
          selectedOffer.id,

        __provider_offer_id:
          selectedOffer
            .providerOfferId,

        __offer_name:
          selectedOffer
            .nameAr,
      },
    );

    setMessage(
      `تمت إضافة ${selectedOffer.nameAr} للسلة.`,
    );

    window.setTimeout(
      () =>
        setMessage(""),
      3000,
    );
  }

  async function handleShare() {
    try {
      if (
        navigator.share
      ) {
        await navigator.share({
          title:
            product.nameAr,

          text:
            product.shortDescriptionAr ??
            product.nameAr,

          url:
            window.location.href,
        });

        return;
      }

      await navigator
        .clipboard
        .writeText(
          window.location.href,
        );

      setMessage(
        "تم نسخ رابط المنتج.",
      );
    } catch {
      setMessage(
        "تعذر مشاركة المنتج.",
      );
    }
  }

  return (
    <section
      className={
        styles.page
      }
    >
      <div
        className={
          styles.topActions
        }
      >
        <button
          type="button"
          onClick={() =>
            window.history.back()
          }
          aria-label="رجوع"
        >
          <ArrowRight
            size={18}
          />
        </button>

        <div>
          <button
            type="button"
            className={
              isFavorite
                ? styles.favoriteActive
                : ""
            }
            onClick={() =>
              toggleFavorite(
                compatibilityProduct,
              )
            }
          >
            <Heart
              size={18}
              fill={
                isFavorite
                  ? "currentColor"
                  : "none"
              }
            />
          </button>

          <button
            type="button"
            onClick={
              handleShare
            }
          >
            <Share2
              size={18}
            />
          </button>
        </div>
      </div>

      {message && (
        <div
          className={
            styles.notice
          }
        >
          <CheckCircle2
            size={16}
          />

          {message}
        </div>
      )}

      <div
        className={
          styles.productLayout
        }
      >
        <section
          className={
            styles.imagePanel
          }
        >
          {product.imageUrl ? (
            <img
              src={
                product.imageUrl
              }
              alt={
                product.nameAr
              }
            />
          ) : (
            <div
              className={
                styles.noImage
              }
            >
              <Sparkles
                size={32}
              />

              <span>
                DevPlay
              </span>
            </div>
          )}

          {product.badge && (
            <span
              className={
                styles.badge
              }
            >
              {
                product.badge
              }
            </span>
          )}

          {product.instantDelivery && (
            <span
              className={
                styles.instant
              }
            >
              <Zap
                size={12}
              />

              تنفيذ سريع
            </span>
          )}
        </section>

        <section
          className={
            styles.information
          }
        >
          <div
            className={
              styles.productHeading
            }
          >
            <span
              className={
                styles.category
              }
            >
              {product.category
                ?.nameAr ??
                "خدمات رقمية"}
            </span>

            <h1>
              {
                product.nameAr
              }
            </h1>

            {product.nameEn && (
              <small
                className={
                  styles.englishName
                }
              >
                {
                  product.nameEn
                }
              </small>
            )}
          </div>

          <div
            className={
              styles.rating
            }
          >
            <Star
              size={14}
              fill="currentColor"
            />

            <strong>
              5.0
            </strong>

            <span>
              خدمة موثوقة
            </span>
          </div>

          {product.shortDescriptionAr && (
            <p
              className={
                styles.shortDescription
              }
            >
              {
                product.shortDescriptionAr
              }
            </p>
          )}

          <section
            className={
              styles.offerSection
            }
          >
            <div
              className={
                styles.sectionTitle
              }
            >
              <strong>
                اختر الباقة
              </strong>

              <small>
                اختار الباقة المناسبة ليك
              </small>
            </div>

            {product.offers.length ===
            0 ? (
              <div
                className={
                  styles.noFields
                }
              >
                لا توجد باقات متاحة حاليًا.
              </div>
            ) : (
              <div
                className={
                  styles.offersGrid
                }
              >
                {product.offers.map(
                  (offer) => {
                    const selected =
                      selectedOffer
                        ?.id ===
                      offer.id;

                    const priceEgp =
                      offer.finalPriceUsd *
                      product.usdToEgpRate;

                    return (
                      <button
                        key={
                          offer.id
                        }
                        type="button"
                        className={
                          selected
                            ? `${styles.offerCard} ${styles.offerSelected}`
                            : styles.offerCard
                        }
                        onClick={() => selectOffer(offer.id)}
                      >
                        <div>
                          <strong>
                            {
                              offer.nameAr
                            }
                          </strong>

                          {offer.nameEn && (
                            <small>
                              {
                                offer.nameEn
                              }
                            </small>
                          )}
                        </div>

                        <span>
                          {formatEgp(
                            priceEgp,
                          )}
                        </span>

                        {selected && (
                          <CheckCircle2
                            size={16}
                          />
                        )}
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </section>

          {selectedOffer && (
            <>
              <section
                className={
                  styles.pricePanel
                }
              >
                <div>
                  <small>
                    سعر الباقة
                  </small>

                  <strong>
                    {formatEgp(
                      finalPriceEgp,
                    )}
                  </strong>

                  {oldPriceEgp !==
                    null &&
                    oldPriceEgp >
                      finalPriceEgp && (
                      <del>
                        {formatEgp(
                          oldPriceEgp,
                        )}
                      </del>
                    )}
                </div>

                <div
                  className={
                    styles.priceMeta
                  }
                >
                  <span>
                    <CheckCircle2
                      size={14}
                    />

                    متاحة الآن
                  </span>

                  {product.deliveryTime && (
                    <small>
                      {
                        product.deliveryTime
                      }
                    </small>
                  )}
                </div>
              </section>

              {selectedOffer.customerNoteAr && (
                <div
                  className={
                    styles.customerNote
                  }
                >
                  <Info
                    size={17}
                  />

                  <span>
                    {
                      selectedOffer
                        .customerNoteAr
                    }
                  </span>
                </div>
              )}

              <section
                className={
                  styles.requiredFields
                }
              >
                <div
                  className={
                    styles.sectionTitle
                  }
                >
                  <strong>
                    البيانات المطلوبة
                  </strong>

                  <small>
                    اكتب البيانات بدقة عشان الشحن يتم بدون مشاكل
                  </small>
                </div>

                {requiredFields.length >
                0 ? (
                  requiredFields.map(
                    (field) => (
                      <label
                        key={
                          field.id
                        }
                        className={
                          styles.inputField
                        }
                      >
                        <span>
                          {
                            field.label
                          }

                          {field.required && (
                            <b>
                              *
                            </b>
                          )}
                        </span>

                        <input
                          type={
                            field.type
                          }
                          value={
                            inputValues[
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
                            updateField(
                              field.id,
                              event
                                .target
                                .value,
                            )
                          }
                          aria-invalid={
                            Boolean(
                              fieldErrors[
                                field.id
                              ],
                            )
                          }
                        />

                        {fieldErrors[
                          field.id
                        ] ? (
                          <small
                            className={
                              styles.fieldError
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
                  )
                ) : (
                  <div
                    className={
                      styles.noFields
                    }
                  >
                    لا تحتاج هذه الباقة لبيانات إضافية.
                  </div>
                )}
              </section>

              {selectedOffer.instructionsAr && (
                <section
                  className={
                    styles.instructions
                  }
                >
                  <strong>
                    تعليمات الباقة
                  </strong>

                  <p>
                    {
                      selectedOffer
                        .instructionsAr
                    }
                  </p>
                </section>
              )}
            </>
          )}

          {product.descriptionAr && (
            <section
              className={
                styles.description
              }
            >
              <strong>
                وصف الخدمة
              </strong>

              <p>
                {
                  product.descriptionAr
                }
              </p>
            </section>
          )}

          <div
            className={
              styles.purchaseBar
            }
          >
            <div>
              <small>
                الإجمالي
              </small>

              <strong>
                {selectedOffer
                  ? formatEgp(
                      finalPriceEgp,
                    )
                  : "—"}
              </strong>
            </div>

            <Button
              size="large"
              disabled={
                !selectedOffer
              }
              rightIcon={
                <ShoppingCart
                  size={18}
                />
              }
              onClick={
                handleAddToCart
              }
            >
              {selectedOffer
                ? "إضافة للسلة"
                : "غير متوفر"}
            </Button>
          </div>
        </section>
      </div>
    </section>
  );
}
