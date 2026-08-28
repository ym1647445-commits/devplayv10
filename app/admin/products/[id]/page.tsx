import Link from "next/link";

import type {
  ProductRequiredField,
} from "@/types/product";

import {
  ArrowRight,
  Boxes,
  CircleDollarSign,
  ImageIcon,
  PackageOpen,
  Store,
} from "lucide-react";

import {
  ProductOfferEditor,
} from "@/components/admin/products/ProductOfferEditor";

import { BulkRequiredFieldsEditor } from "@/components/admin/products/BulkRequiredFieldsEditor";
import { ProductRedemptionSettings } from "@/components/admin/products/ProductRedemptionSettings";

import {
  ProductDetailsEditor,
} from "@/components/admin/products/ProductDetailsEditor";

import {
  notFound,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

interface ProductOfferRow {
  id: string;

  provider_offer_id: string;

  name_ar: string;
  name_en: string | null;

  supplier_price_usd:
    | number
    | string;

  profit_usd:
    | number
    | string;

  manual_selling_price_usd: number | string | null;

  old_price_usd:
    | number
    | string
    | null;

  stock:
    | number
    | null;

  available: boolean;
  active: boolean;

  required_fields:
    | ProductRequiredField[]
    | null;

  provider_data: Record<string, unknown> | null;

  instructions_ar:
    | string
    | null;

  customer_note_ar:
    | string
    | null;

  sort_order: number;
}

interface ProductCategoryRow {
  id: string;
  name_ar: string;
  slug: string;
}

interface ProductRow {
  id: string;

  slug: string;

  name_ar: string;
  name_en: string | null;

  short_description_ar:
    | string
    | null;

  description_ar:
    | string
    | null;

  image_url:
    | string
    | null;

  active: boolean;
  featured: boolean;
  instant_delivery: boolean;

  delivery_time:
    | string
    | null;

  badge:
    | string
    | null;

  required_fields:
    | ProductRequiredField[]
    | null;

  provider_data:
    | Record<
        string,
        unknown
      >
    | null;

  category:
    | ProductCategoryRow
    | ProductCategoryRow[]
    | null;

  store_product_offers:
    ProductOfferRow[];
}

function getRelation<T>(
  relation:
    | T
    | T[]
    | null,
): T | null {
  if (
    Array.isArray(
      relation,
    )
  ) {
    return (
      relation[0] ??
      null
    );
  }

  return relation;
}

function formatUsd(
  value: number,
): string {
  return `$${Number(
    value,
  ).toLocaleString(
    "en-US",
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        4,
    },
  )}`;
}

export default async function AdminProductDetailsPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const {
    id,
  } = await params;

  const supabase =
    await createClient();

  const {
    data: product,
    error,
  } = await supabase
    .from(
      "store_products",
    )
    .select(`
      id,
      slug,
      name_ar,
      name_en,
      short_description_ar,
      description_ar,
      image_url,
      active,
      featured,
      instant_delivery,
      delivery_time,
      badge,
      required_fields,
      provider_data,

      category:store_categories(
        id,
        name_ar,
        slug
      ),

      store_product_offers(
        id,
        provider_offer_id,
        name_ar,
        name_en,
        supplier_price_usd,
        profit_usd,
        manual_selling_price_usd,
        old_price_usd,
        stock,
        available,
        active,
        required_fields,
        provider_data,
        instructions_ar,
        customer_note_ar,
        sort_order
      )
    `)
    .eq(
      "id",
      id,
    )
    .single<ProductRow>();

  if (
    error ||
    !product
  ) {
    notFound();
  }

  const category =
    getRelation(
      product.category,
    );

  const offers =
    [
      ...(
        product
          .store_product_offers ??
        []
      ),
    ].sort(
      (
        a,
        b,
      ) =>
        a.sort_order -
        b.sort_order,
    );

  const activeOffers =
    offers.filter(
      (offer) =>
        offer.active,
    );

  const availableOffers =
    offers.filter(
      (offer) =>
        offer.active &&
        offer.available,
    );

  const lowestPrice =
    availableOffers.length >
    0
      ? Math.min(
          ...availableOffers.map(
            (offer) =>
              Number(
                offer
                  .supplier_price_usd,
              ) +
              Number(
                offer
                  .profit_usd,
              ),
          ),
        )
      : null;

  const providerName =
    typeof product
      .provider_data
      ?.provider ===
    "string"
      ? String(
          product
            .provider_data
            ?.provider,
        )
      : "Manual";

  return (
    <section
      style={{
        display:
          "grid",

        gap: 14,

        width:
          "100%",

        maxWidth:
          1250,

        marginInline:
          "auto",
      }}
    >
      <Link
        href="/admin/products"
        style={{
          display:
            "inline-flex",

          width:
            "fit-content",

          alignItems:
            "center",

          gap: 6,

          color:
            "var(--muted)",

          fontSize:
            8,

          textDecoration:
            "none",
        }}
      >
        <ArrowRight
          size={15}
        />

        رجوع للمنتجات
      </Link>

      <header
        style={{
          display:
            "flex",

          alignItems:
            "flex-start",

          justifyContent:
            "space-between",

          flexWrap:
            "wrap",

          gap: 12,
        }}
      >
        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap: 11,

            minWidth:
              0,
          }}
        >
          <span
            style={{
              display:
                "grid",

              width: 58,
              height: 58,

              flexShrink:
                0,

              placeItems:
                "center",

              overflow:
                "hidden",

              border:
                "1px solid var(--border)",

              borderRadius:
                15,

              background:
                "var(--surface-soft)",

              color:
                "var(--primary)",
            }}
          >
            {product.image_url ? (
              <img
                src={
                  product.image_url
                }
                alt={
                  product.name_ar
                }
                style={{
                  width:
                    "100%",

                  height:
                    "100%",

                  objectFit:
                    "cover",
                }}
              />
            ) : (
              <ImageIcon
                size={24}
              />
            )}
          </span>

          <div
            style={{
              display:
                "grid",

              minWidth:
                0,

              gap: 5,
            }}
          >
            <span
              style={{
                color:
                  "var(--primary)",

                fontSize:
                  7,

                fontWeight:
                  900,
              }}
            >
              PRODUCT CONTROL
            </span>

            <h1
              style={{
                margin:
                  0,

                fontSize:
                  23,

                overflowWrap:
                  "anywhere",
              }}
            >
              {
                product.name_ar
              }
            </h1>

            <p
              style={{
                margin:
                  0,

                color:
                  "var(--muted)",

                fontSize:
                  8,

                overflowWrap:
                  "anywhere",
              }}
            >
              {category
                ?.name_ar ??
                "بدون قسم"}

              {" · "}

              {providerName}
            </p>
          </div>
        </div>

        <div
          style={{
            display:
              "flex",

            flexWrap:
              "wrap",

            gap:
              6,
          }}
        >
          <span
            style={{
              padding:
                "7px 9px",

              border:
                "1px solid var(--border)",

              borderRadius:
                999,

              background:
                "var(--surface)",

              color:
                product.active
                  ? "var(--success)"
                  : "var(--danger)",

              fontSize:
                7,

              fontWeight:
                900,
            }}
          >
            {product.active
              ? "نشط"
              : "مخفي"}
          </span>

          {product.featured && (
            <span
              style={{
                padding:
                  "7px 9px",

                border:
                  "1px solid var(--primary-border)",

                borderRadius:
                  999,

                background:
                  "var(--primary-soft)",

                color:
                  "var(--primary)",

                fontSize:
                  7,

                fontWeight:
                  900,
              }}
            >
              مميز
            </span>
          )}
        </div>
      </header>

      <section
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(auto-fit, minmax(150px, 1fr))",

          gap:
            8,
        }}
      >
        <article
          style={{
            display:
              "flex",

            minHeight:
              80,

            alignItems:
              "center",

            gap:
              9,

            padding:
              11,

            border:
              "1px solid var(--border)",

            borderRadius:
              14,

            background:
              "var(--surface)",
          }}
        >
          <Boxes
            size={19}
            color="var(--primary)"
          />

          <div>
            <small
              style={{
                color:
                  "var(--muted)",

                fontSize:
                  6,
              }}
            >
              إجمالي الباقات
            </small>

            <strong
              style={{
                display:
                  "block",

                marginTop:
                  4,

                fontSize:
                  14,
              }}
            >
              {offers.length.toLocaleString(
                "ar-EG",
              )}
            </strong>
          </div>
        </article>

        <article
          style={{
            display:
              "flex",

            minHeight:
              80,

            alignItems:
              "center",

            gap:
              9,

            padding:
              11,

            border:
              "1px solid var(--border)",

            borderRadius:
              14,

            background:
              "var(--surface)",
          }}
        >
          <PackageOpen
            size={19}
            color="var(--primary)"
          />

          <div>
            <small
              style={{
                color:
                  "var(--muted)",

                fontSize:
                  6,
              }}
            >
              الباقات النشطة
            </small>

            <strong
              style={{
                display:
                  "block",

                marginTop:
                  4,

                fontSize:
                  14,
              }}
            >
              {activeOffers.length.toLocaleString(
                "ar-EG",
              )}
            </strong>
          </div>
        </article>

        <article
          style={{
            display:
              "flex",

            minHeight:
              80,

            alignItems:
              "center",

            gap:
              9,

            padding:
              11,

            border:
              "1px solid var(--border)",

            borderRadius:
              14,

            background:
              "var(--surface)",
          }}
        >
          <CircleDollarSign
            size={19}
            color="var(--primary)"
          />

          <div>
            <small
              style={{
                color:
                  "var(--muted)",

                fontSize:
                  6,
              }}
            >
              يبدأ من
            </small>

            <strong
              style={{
                display:
                  "block",

                marginTop:
                  4,

                fontSize:
                  14,
              }}
            >
              {lowestPrice ===
              null
                ? "—"
                : formatUsd(
                    lowestPrice,
                  )}
            </strong>
          </div>
        </article>

        <article
          style={{
            display:
              "flex",

            minHeight:
              80,

            alignItems:
              "center",

            gap:
              9,

            padding:
              11,

            border:
              "1px solid var(--border)",

            borderRadius:
              14,

            background:
              "var(--surface)",
          }}
        >
          <Store
            size={19}
            color="var(--primary)"
          />

          <div>
            <small
              style={{
                color:
                  "var(--muted)",

                fontSize:
                  6,
              }}
            >
              المورد
            </small>

            <strong
              style={{
                display:
                  "block",

                marginTop:
                  4,

                fontSize:
                  12,
              }}
            >
              {providerName}
            </strong>
          </div>
        </article>
      </section>

      <ProductDetailsEditor
        product={{
          id:
            product.id,

          nameAr:
            product.name_ar,

          nameEn:
            product.name_en,

          shortDescriptionAr:
            product.short_description_ar,

          descriptionAr:
            product.description_ar,

          imageUrl:
            product.image_url,

          active:
            product.active,

          featured:
            product.featured,

          deliveryTime:
            product.delivery_time,

          badge:
            product.badge,
        }}
      />

      <section
        style={{
          display:
            "grid",

          gap:
            10,

          padding:
            13,

          border:
            "1px solid var(--border)",

          borderRadius:
            15,

          background:
            "var(--surface)",
        }}
      >
        <header
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",

            flexWrap:
              "wrap",

            gap:
              10,

            paddingBottom:
              10,

            borderBottom:
              "1px solid var(--border)",
          }}
        >
          <div>
            <strong
              style={{
                fontSize:
                  11,
              }}
            >
              باقات المنتج
            </strong>

            <p
              style={{
                margin:
                  "4px 0 0",

                color:
                  "var(--muted)",

                fontSize:
                  7,
              }}
            >
              كل باقة لها سعر وربح وشروط وبيانات تنفيذ مستقلة.
            </p>
          </div>

          <span
            style={{
              padding:
                "6px 9px",

              border:
                "1px solid var(--primary-border)",

              borderRadius:
                999,

              background:
                "var(--primary-soft)",

              color:
                "var(--primary)",

              fontSize:
                7,

              fontWeight:
                900,
            }}
          >
            {offers.length.toLocaleString(
              "ar-EG",
            )}{" "}
            باقة
          </span>
        </header>

        <ProductRedemptionSettings
          productId={product.id}
          initial={{
            steps: Array.isArray(product.provider_data?.redemption_steps)
              ? product.provider_data.redemption_steps.filter((step): step is string => typeof step === "string")
              : typeof product.provider_data?.redemption_instructions_ar === "string"
                ? product.provider_data.redemption_instructions_ar.split("\n").filter(Boolean)
                : [],
            url: typeof product.provider_data?.redemption_url === "string" ? product.provider_data.redemption_url : "",
            assistedEnabled: product.provider_data?.redemption_assisted_enabled === true || product.provider_data?.redemption_mode === "assisted",
            accountLabel: typeof product.provider_data?.redemption_account_label === "string" ? product.provider_data.redemption_account_label : "",
            accountPlaceholder: typeof product.provider_data?.redemption_account_placeholder === "string" ? product.provider_data.redemption_account_placeholder : "",
          }}
        />

        <BulkRequiredFieldsEditor
          productId={product.id}
          initialFields={product.required_fields ?? []}
          initialTargetField={
            typeof product.provider_data?.target_account_field === "string"
              ? product.provider_data.target_account_field
              : null
          }
          offersCount={offers.length}
        />

        {offers.length ===
        0 ? (
          <div
            style={{
              display:
                "grid",

              minHeight:
                160,

              placeItems:
                "center",

              color:
                "var(--muted)",

              fontSize:
                8,

              textAlign:
                "center",
            }}
          >
            لا توجد باقات داخل هذا المنتج حتى الآن.
          </div>
        ) : (
          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fill, minmax(230px, 1fr))",

              gap:
                8,
            }}
          >
            {offers.map(
              (
                offer,
              ) => {
                const supplierPrice =
                  Number(
                    offer
                      .supplier_price_usd,
                  );

                const profit =
                  Number(
                    offer
                      .profit_usd,
                  );

                const manualSellingPrice = offer.manual_selling_price_usd === null ? null : Number(offer.manual_selling_price_usd);

                const finalPrice = manualSellingPrice ?? (supplierPrice + profit);

                return (
                  <article
                    key={
                      offer.id
                    }
                    style={{
                      display:
                        "grid",

                      gap:
                        8,

                      padding:
                        11,

                      border:
                        "1px solid var(--border)",

                      borderRadius:
                        12,

                      background:
                        "var(--surface-soft)",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",

                        alignItems:
                          "flex-start",

                        justifyContent:
                          "space-between",

                        gap:
                          8,
                      }}
                    >
                      <div
                        style={{
                          display:
                            "grid",

                          minWidth:
                            0,

                          gap:
                            4,
                        }}
                      >
                        <strong
                          style={{
                            fontSize:
                              9,

                            overflowWrap:
                              "anywhere",
                          }}
                        >
                          {
                            offer
                              .name_ar
                          }
                        </strong>

                        <small
                          style={{
                            color:
                              "var(--muted)",

                            fontSize:
                              6,

                            overflowWrap:
                              "anywhere",
                          }}
                        >
                          ID:{" "}
                          {
                            offer
                              .provider_offer_id
                          }
                        </small>
                      </div>

                      <span
                        style={{
                          flexShrink:
                            0,

                          color:
                            offer.active &&
                            offer.available
                              ? "var(--success)"
                              : "var(--danger)",

                          fontSize:
                            6,

                          fontWeight:
                            900,
                        }}
                      >
                        {offer.active &&
                        offer.available
                          ? "متاحة"
                          : "غير متاحة"}
                      </span>
                    </div>

                    <div
                      style={{
                        display:
                          "grid",

                        gridTemplateColumns:
                          "repeat(3, minmax(0, 1fr))",

                        gap:
                          5,
                      }}
                    >
                      <span>
                        <small
                          style={{
                            display:
                              "block",

                            color:
                              "var(--muted)",

                            fontSize:
                              5,
                          }}
                        >
                          المورد
                        </small>

                        <strong
                          style={{
                            fontSize:
                              8,
                          }}
                        >
                          {formatUsd(
                            supplierPrice,
                          )}
                        </strong>
                      </span>

                      <span>
                        <small
                          style={{
                            display:
                              "block",

                            color:
                              "var(--muted)",

                            fontSize:
                              5,
                          }}
                        >
                          الربح
                        </small>

                        <strong
                          style={{
                            fontSize:
                              8,
                          }}
                        >
                          {formatUsd(
                            profit,
                          )}
                        </strong>
                      </span>

                      <span>
                        <small
                          style={{
                            display:
                              "block",

                            color:
                              "var(--muted)",

                            fontSize:
                              5,
                          }}
                        >
                          البيع
                        </small>

                        <strong
                          style={{
                            color:
                              "var(--primary)",

                            fontSize:
                              8,
                          }}
                        >
                          {formatUsd(
                            finalPrice,
                          )}
                        </strong>
                      </span>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",

                        justifyContent:
                          "space-between",

                        flexWrap:
                          "wrap",

                        gap:
                          7,

                        color:
                          "var(--muted)",

                        fontSize:
                          6,
                      }}
                    >
                      <span>
                        المخزون:{" "}
                        {offer.stock ??
                          "غير محدد"}
                      </span>

                      <span>
                        ترتيب:{" "}
                        {
                          offer
                            .sort_order
                        }
                      </span>
                    </div>

                    <ProductOfferEditor
                      productId={
                        product.id
                      }
                      offer={{
                        id:
                          offer.id,

                        nameAr:
                          offer.name_ar,

                        nameEn:
                          offer.name_en,

                        supplierPriceUsd:
                          supplierPrice,

                        profitUsd:
                          profit,

                        manualSellingPriceUsd:
                          manualSellingPrice,

                        oldPriceUsd:
                          offer
                            .old_price_usd ===
                          null
                            ? null
                            : Number(
                                offer
                                  .old_price_usd,
                              ),

                        active:
                          offer.active,

                        sortOrder:
                          offer.sort_order,

                        instructionsAr:
                          offer.instructions_ar,

                        customerNoteAr:
                          offer.customer_note_ar,

                        requiredFields:
                          offer.required_fields ??
                          [],

                      }}
                    />
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>
    </section>
  );
}
