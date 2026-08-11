import Link from "next/link";

import {
  Boxes,
  CheckCircle2,
  Gamepad2,
  ImageIcon,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";

import {
  AppShell,
} from "@/components/layout/AppShell";

import {
  createClient,
} from "@/lib/supabase/server";

interface StoreOfferRow {
  id: string;

  supplier_price_usd:
    | number
    | string;

  profit_usd:
    | number
    | string;

  available: boolean;
  active: boolean;

  stock:
    | number
    | null;
}

interface StoreCategoryRow {
  id: string;

  slug: string;

  name_ar: string;

  name_en:
    | string
    | null;
}

interface StoreProductRow {
  id: string;

  slug: string;

  name_ar: string;

  name_en:
    | string
    | null;

  short_description_ar:
    | string
    | null;

  image_url:
    | string
    | null;

  featured: boolean;

  instant_delivery: boolean;

  delivery_time:
    | string
    | null;

  badge:
    | string
    | null;

  active: boolean;

  category:
    | StoreCategoryRow
    | StoreCategoryRow[]
    | null;

  store_product_offers:
    StoreOfferRow[];
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
        2,
    },
  )}`;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
  }>;
}) {
  const params =
    await searchParams;

  const search =
    params.q
      ?.trim()
      .toLowerCase() ??
    "";

  const selectedCategory =
    params.category ??
    "all";

  const supabase =
    await createClient();

  const [
    productsResult,
    categoriesResult,
  ] = await Promise.all([
    supabase
      .from(
        "store_products",
      )
      .select(`
        id,
        slug,
        name_ar,
        name_en,
        short_description_ar,
        image_url,
        featured,
        instant_delivery,
        delivery_time,
        badge,
        active,

        category:store_categories(
          id,
          slug,
          name_ar,
          name_en
        ),

        store_product_offers(
          id,
          supplier_price_usd,
          profit_usd,
          available,
          active,
          stock
        )
      `)
      .eq(
        "active",
        true,
      )
      .order(
        "featured",
        {
          ascending:
            false,
        },
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .returns<
        StoreProductRow[]
      >(),

    supabase
      .from(
        "store_categories",
      )
      .select(`
        id,
        slug,
        name_ar,
        name_en
      `)
      .eq(
        "active",
        true,
      )
      .order(
        "sort_order",
        {
          ascending:
            true,
        },
      )
      .returns<
        StoreCategoryRow[]
      >(),
  ]);

  const products =
    productsResult.data ??
    [];

  const categories =
    categoriesResult.data ??
    [];

  const normalizedProducts =
    products.map(
      (product) => {
        const category =
          getRelation(
            product.category,
          );

        const offers =
          (
            product
              .store_product_offers ??
            []
          ).filter(
            (offer) =>
              offer.active &&
              offer.available,
          );

        const prices =
          offers.map(
            (offer) =>
              Number(
                offer
                  .supplier_price_usd,
              ) +
              Number(
                offer
                  .profit_usd,
              ),
          );

        const lowestPrice =
          prices.length >
          0
            ? Math.min(
                ...prices,
              )
            : null;

        return {
          ...product,

          category,

          availableOffers:
            offers,

          lowestPrice,
        };
      },
    );

  const filteredProducts =
    normalizedProducts.filter(
      (product) => {
        const matchesSearch =
          !search ||
          [
            product.name_ar,
            product.name_en ??
              "",
            product
              .short_description_ar ??
              "",
            product.category
              ?.name_ar ??
              "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(
              search,
            );

        const matchesCategory =
          selectedCategory ===
            "all" ||
          product.category
            ?.slug ===
            selectedCategory;

        return (
          matchesSearch &&
          matchesCategory &&
          product.availableOffers.length > 0
        );
      },
    );

  const totalOffers =
    normalizedProducts.reduce(
      (
        total,
        product,
      ) =>
        total +
        product
          .availableOffers
          .length,
      0,
    );

  return (
    <AppShell>
      <main
        className="productsPage"
      >
        {/* =========================
            العنوان
        ========================= */}

        <header
          className="productsHero"
        >
          <div
            className="productsHeroText"
          >
            <span
              className="productsEyebrow"
            >
              <Sparkles
                size={15}
              />

              DEVPLAY STORE
            </span>

            <h1>
              تصفح الخدمات
            </h1>

            <p>
              اختار اللعبة أو الخدمة، وبعدها اختار الباقة المناسبة ليك.
            </p>
          </div>

          <div
            className="productsStats"
          >
            <span>
              <Boxes
                size={16}
              />

              {
                normalizedProducts.length
              }{" "}
              خدمة
            </span>

            <span>
              <Gamepad2
                size={16}
              />

              {
                totalOffers
              }{" "}
              باقة
            </span>
          </div>
        </header>

        {/* =========================
            البحث
        ========================= */}

        <form
          action="/products"
          method="get"
          className="productsSearch"
        >
          <label>
            <Search
              size={18}
              color="var(--muted)"
            />

            <input
              type="search"
              name="q"
              defaultValue={
                params.q ??
                ""
              }
              placeholder="ابحث عن لعبة أو خدمة..."
            />

            {selectedCategory !==
              "all" && (
              <input
                type="hidden"
                name="category"
                value={
                  selectedCategory
                }
              />
            )}
          </label>

          <button
            type="submit"
          >
            بحث
          </button>
        </form>

        {/* =========================
            الأقسام
        ========================= */}

        <section
          className="productsCategories"
        >
          <Link
            href={
              search
                ? `/products?q=${encodeURIComponent(
                    params.q ??
                      "",
                  )}`
                : "/products"
            }
            className={
              selectedCategory ===
              "all"
                ? "categoryChip active"
                : "categoryChip"
            }
          >
            الكل
          </Link>

          {categories.map(
            (category) => {
              const href =
                search
                  ? `/products?category=${encodeURIComponent(
                      category.slug,
                    )}&q=${encodeURIComponent(
                      params.q ??
                        "",
                    )}`
                  : `/products?category=${encodeURIComponent(
                      category.slug,
                    )}`;

              const selected =
                selectedCategory ===
                category.slug;

              return (
                <Link
                  key={
                    category.id
                  }
                  href={
                    href
                  }
                  className={
                    selected
                      ? "categoryChip active"
                      : "categoryChip"
                  }
                >
                  {
                    category.name_ar
                  }
                </Link>
              );
            },
          )}
        </section>

        {/* =========================
            النتائج
        ========================= */}

        <section
          className="productsResultsHeader"
        >
          <strong>
            المنتجات
          </strong>

          <span>
            {
              filteredProducts.length
            }{" "}
            نتيجة
          </span>
        </section>

        {productsResult.error ? (
          <div
            className="productsError"
          >
            تعذر تحميل المنتجات حاليًا.
          </div>
        ) : filteredProducts.length ===
          0 ? (
          <div
            className="productsEmpty"
          >
            <Search
              size={32}
            />

            <strong>
              مفيش نتائج
            </strong>

            <span>
              جرّب اسم تاني أو اختار قسم مختلف.
            </span>
          </div>
        ) : (
          <section
            className="productsGrid"
          >
            {filteredProducts.map(
              (product) => {
                const offersCount =
                  product
                    .availableOffers
                    .length;

                const hasOffers =
                  offersCount >
                  0;

                return (
                  <Link
                    key={
                      product.id
                    }
                    href={`/products/${product.slug}`}
                    className="productCard"
                  >
                    <div
                      className="productImage"
                    >
                      {product.image_url ? (
                        <img
                          src={
                            product.image_url
                          }
                          alt={
                            product.name_ar
                          }
                        />
                      ) : (
                        <ImageIcon
                          size={34}
                          color="var(--muted)"
                        />
                      )}

                      {product.featured && (
                        <span
                          className="featuredBadge"
                        >
                          <Sparkles
                            size={11}
                          />

                          مميز
                        </span>
                      )}

                      {product.instant_delivery && (
                        <span
                          className="fastBadge"
                        >
                          <Zap
                            size={11}
                          />

                          سريع
                        </span>
                      )}
                    </div>

                    <div
                      className="productBody"
                    >
                      <div
                        className="productCopy"
                      >
                        <span>
                          {product.category
                            ?.name_ar ??
                            "خدمات رقمية"}
                        </span>

                        <strong>
                          {
                            product.name_ar
                          }
                        </strong>

                        {product
                          .short_description_ar && (
                          <p>
                            {
                              product
                                .short_description_ar
                            }
                          </p>
                        )}
                      </div>

                      <div
                        className="productFooter"
                      >
                        <div>
                          <small>
                            {hasOffers
                              ? "يبدأ من"
                              : "الباقات"}
                          </small>

                          <strong>
                            {product.lowestPrice !==
                            null
                              ? formatUsd(
                                  product.lowestPrice,
                                )
                              : "غير متاحة"}
                          </strong>
                        </div>

                        <div
                          className="offersInfo"
                        >
                          <span
                            className={
                              hasOffers
                                ? "available"
                                : "unavailable"
                            }
                          >
                            <CheckCircle2
                              size={12}
                            />

                            {
                              offersCount
                            }{" "}
                            باقة
                          </span>

                          {product.delivery_time && (
                            <small>
                              {
                                product.delivery_time
                              }
                            </small>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              },
            )}
          </section>
        )}
      </main>

      <style>{`
        .productsPage {
          display: grid;
          gap: 20px;
          width: 100%;
          max-width: 1350px;
          margin-inline: auto;
          padding: 20px 16px 60px;
        }

        .productsHero {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
        }

        .productsHeroText {
          display: grid;
          gap: 6px;
        }

        .productsEyebrow {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 6px;
          color: var(--primary);
          font-size: 10px;
          font-weight: 900;
        }

        .productsHero h1 {
          margin: 0;
          font-size: clamp(26px, 5vw, 40px);
        }

        .productsHero p {
          max-width: 650px;
          margin: 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.8;
        }

        .productsStats {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .productsStats > span {
          display: inline-flex;
          min-height: 40px;
          align-items: center;
          gap: 7px;
          padding-inline: 12px;
          border: 1px solid var(--border);
          border-radius: 11px;
          background: var(--surface);
          font-size: 10px;
        }

        .productsSearch {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
          padding: 10px;
          border: 1px solid var(--border);
          border-radius: 15px;
          background: var(--surface);
        }

        .productsSearch label {
          display: flex;
          min-height: 46px;
          align-items: center;
          gap: 8px;
          padding-inline: 12px;
          border: 1px solid var(--border);
          border-radius: 11px;
          background: var(--surface-soft);
        }

        .productsSearch input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text);
          font: inherit;
        }

        .productsSearch button {
          min-width: 80px;
          border: 1px solid var(--primary-border);
          border-radius: 11px;
          background: var(--primary);
          color: #fff;
          font-weight: 900;
          cursor: pointer;
        }

        .productsCategories {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: none;
        }

        .productsCategories::-webkit-scrollbar {
          display: none;
        }

        .categoryChip {
          display: inline-flex;
          min-height: 39px;
          flex-shrink: 0;
          align-items: center;
          padding-inline: 14px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--surface);
          color: var(--text);
          font-size: 10px;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
        }

        .categoryChip.active {
          border-color: var(--primary);
          background: var(--primary-soft);
          color: var(--primary);
          font-weight: 900;
        }

        .productsResultsHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .productsResultsHeader strong {
          font-size: 15px;
        }

        .productsResultsHeader span {
          color: var(--muted);
          font-size: 10px;
        }

        .productsError {
          padding: 20px;
          border: 1px solid var(--danger);
          border-radius: 14px;
          color: var(--danger);
          text-align: center;
        }

        .productsEmpty {
          display: grid;
          min-height: 250px;
          place-items: center;
          align-content: center;
          gap: 9px;
          padding: 20px;
          border: 1px dashed var(--border);
          border-radius: 16px;
          color: var(--muted);
          text-align: center;
        }

        .productsGrid {
          display: grid;
          grid-template-columns:
            repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
        }

        .productCard {
          display: grid;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 17px;
          background: var(--surface);
          color: inherit;
          text-decoration: none;
          min-width: 0;
        }

        .productImage {
          position: relative;
          display: grid;
          aspect-ratio: 16 / 9;
          place-items: center;
          overflow: hidden;
          background: var(--surface-soft);
        }

        .productImage img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .featuredBadge,
        .fastBadge {
          position: absolute;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 999px;
          font-size: 8px;
          font-weight: 900;
        }

        .featuredBadge {
          top: 10px;
          right: 10px;
          padding: 6px 8px;
          border: 1px solid var(--primary-border);
          background: var(--primary-soft);
          color: var(--primary);
        }

        .fastBadge {
          bottom: 10px;
          left: 10px;
          padding: 6px 8px;
          background: rgba(0, 0, 0, .65);
          color: #fff;
        }

        .productBody {
          display: grid;
          gap: 9px;
          padding: 13px;
        }

        .productCopy {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .productCopy > span {
          color: var(--primary);
          font-size: 8px;
          font-weight: 800;
        }

        .productCopy > strong {
          font-size: 15px;
          overflow-wrap: anywhere;
        }

        .productCopy p {
          display: -webkit-box;
          overflow: hidden;
          margin: 0;
          color: var(--muted);
          font-size: 10px;
          line-height: 1.7;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .productFooter {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 8px;
          padding-top: 9px;
          border-top: 1px solid var(--border);
        }

        .productFooter > div:first-child {
          display: grid;
          gap: 3px;
        }

        .productFooter small {
          color: var(--muted);
          font-size: 7px;
        }

        .productFooter > div:first-child > strong {
          color: var(--primary);
          font-size: 15px;
        }

        .offersInfo {
          display: grid;
          justify-items: end;
          gap: 4px;
        }

        .offersInfo > span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 8px;
          font-weight: 900;
        }

        .offersInfo .available {
          color: var(--success);
        }

        .offersInfo .unavailable {
          color: var(--danger);
        }

        /* =========================
           MOBILE
        ========================= */

        @media (max-width: 600px) {
          .productsPage {
            gap: 14px;
            padding: 14px 10px 50px;
          }

          .productsHero {
            align-items: flex-start;
            gap: 10px;
          }

          .productsHeroText {
            gap: 4px;
          }

          .productsEyebrow {
            font-size: 8px;
          }

          .productsHero h1 {
            font-size: 23px;
          }

          .productsHero p {
            font-size: 10px;
            line-height: 1.65;
          }

          .productsStats {
            gap: 6px;
          }

          .productsStats > span {
            min-height: 32px;
            padding-inline: 9px;
            border-radius: 9px;
            font-size: 8px;
          }

          .productsSearch {
            gap: 6px;
            padding: 7px;
            border-radius: 12px;
          }

          .productsSearch label {
            min-height: 40px;
            padding-inline: 9px;
            border-radius: 9px;
          }

          .productsSearch input {
            font-size: 11px;
          }

          .productsSearch button {
            min-width: 58px;
            border-radius: 9px;
            font-size: 10px;
          }

          .productsCategories {
            gap: 6px;
          }

          .categoryChip {
            min-height: 33px;
            padding-inline: 11px;
            font-size: 8px;
          }

          .productsResultsHeader strong {
            font-size: 13px;
          }

          .productsResultsHeader span {
            font-size: 8px;
          }

          .productsGrid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .productCard {
            border-radius: 13px;
          }

          .productImage {
            aspect-ratio: 1 / 1;
          }

          .featuredBadge {
            top: 6px;
            right: 6px;
            padding: 4px 6px;
            font-size: 6px;
          }

          .fastBadge {
            bottom: 6px;
            left: 6px;
            padding: 4px 6px;
            font-size: 6px;
          }

          .productBody {
            gap: 7px;
            padding: 9px;
          }

          .productCopy {
            gap: 3px;
          }

          .productCopy > span {
            font-size: 6px;
          }

          .productCopy > strong {
            font-size: 11px;
            line-height: 1.45;
          }

          .productCopy p {
            font-size: 8px;
            line-height: 1.5;
            -webkit-line-clamp: 1;
          }

          .productFooter {
            align-items: center;
            gap: 5px;
            padding-top: 7px;
          }

          .productFooter small {
            font-size: 6px;
          }

          .productFooter > div:first-child > strong {
            font-size: 11px;
          }

          .offersInfo {
            gap: 2px;
          }

          .offersInfo > span {
            gap: 2px;
            font-size: 6px;
          }

          .offersInfo > small {
            display: none;
          }
        }

        @media (max-width: 340px) {
          .productsPage {
            padding-inline: 7px;
          }

          .productsGrid {
            gap: 6px;
          }

          .productBody {
            padding: 7px;
          }

          .productCopy > strong {
            font-size: 10px;
          }
        }
      `}</style>
    </AppShell>
  );
}
