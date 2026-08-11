"use client";

import {
  CreditCard,
  Search,
  Smartphone,
} from "lucide-react";
import { useMemo, useState } from "react";

import { SyncOffersButton } from "@/components/admin/api-center/SyncOffersButton";

import styles from "./CategoryCatalog.module.css";

interface CategoryItem {
  id: string;

  catalog_type:
    | "topup"
    | "gc";

  provider_category_id: string;

  name: string;

  provider_category:
    | string
    | null;

  active: boolean;

  offers_count: number;
}

interface CategoryCatalogProps {
  categories: CategoryItem[];
}

type CatalogFilter =
  | "all"
  | "topup"
  | "gc";

type SyncFilter =
  | "all"
  | "synced"
  | "not_synced";

export function CategoryCatalog({
  categories,
}: CategoryCatalogProps) {
  const [search, setSearch] =
    useState("");

  const [
    catalogFilter,
    setCatalogFilter,
  ] =
    useState<CatalogFilter>(
      "all",
    );

  const [
    syncFilter,
    setSyncFilter,
  ] =
    useState<SyncFilter>(
      "all",
    );

  const filteredCategories =
    useMemo(() => {
      const normalized =
        search
          .trim()
          .toLowerCase();

      return categories.filter(
        (category) => {
          const matchesSearch =
            !normalized ||
            [
              category.name,
              category.provider_category_id,
              category.provider_category,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(normalized);

          const matchesCatalog =
            catalogFilter === "all" ||
            category.catalog_type ===
              catalogFilter;

          const matchesSync =
            syncFilter === "all" ||
            (
              syncFilter ===
                "synced" &&
              category.offers_count > 0
            ) ||
            (
              syncFilter ===
                "not_synced" &&
              category.offers_count === 0
            );

          return (
            matchesSearch &&
            matchesCatalog &&
            matchesSync
          );
        },
      );
    }, [
      categories,
      search,
      catalogFilter,
      syncFilter,
    ]);

  const syncedCount =
    categories.filter(
      (category) =>
        category.offers_count > 0,
    ).length;

  return (
    <section
      className={styles.wrapper}
    >
      <header
        className={styles.heading}
      >
        <div>
          <strong>
            كتالوج أقسام المورد
          </strong>

          <small>
            ابحثي عن اللعبة أو الخدمة
            واعملي مزامنة للباقات المطلوبة
            فقط.
          </small>
        </div>

        <span>
          {
            filteredCategories.length
          }{" "}
          نتيجة
        </span>
      </header>

      <section
        className={styles.toolbar}
      >
        <label
          className={styles.search}
        >
          <Search size={17} />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="ابحثي باسم اللعبة أو ID القسم"
          />
        </label>

        <div
          className={
            styles.filters
          }
        >
          <button
            type="button"
            className={
              catalogFilter ===
              "all"
                ? styles.active
                : ""
            }
            onClick={() =>
              setCatalogFilter(
                "all",
              )
            }
          >
            الكل
          </button>

          <button
            type="button"
            className={
              catalogFilter ===
              "topup"
                ? styles.active
                : ""
            }
            onClick={() =>
              setCatalogFilter(
                "topup",
              )
            }
          >
            <Smartphone
              size={15}
            />
            شحن مباشر
          </button>

          <button
            type="button"
            className={
              catalogFilter ===
              "gc"
                ? styles.active
                : ""
            }
            onClick={() =>
              setCatalogFilter(
                "gc",
              )
            }
          >
            <CreditCard
              size={15}
            />
            بطاقات هدايا
          </button>
        </div>

        <select
          value={syncFilter}
          onChange={(event) =>
            setSyncFilter(
              event.target
                .value as SyncFilter,
            )
          }
        >
          <option value="all">
            كل حالات المزامنة
          </option>

          <option value="synced">
            تم مزامنتها
          </option>

          <option value="not_synced">
            لم تتم مزامنتها
          </option>
        </select>
      </section>

      <div
        className={styles.summary}
      >
        <span>
          إجمالي الأقسام:
          <strong>
            {categories.length}
          </strong>
        </span>

        <span>
          تمت مزامنتها:
          <strong>
            {syncedCount}
          </strong>
        </span>

        <span>
          غير متزامنة:
          <strong>
            {categories.length -
              syncedCount}
          </strong>
        </span>
      </div>

      {filteredCategories.length ===
      0 ? (
        <div
          className={styles.empty}
        >
          <Search size={29} />

          <strong>
            لا توجد نتائج
          </strong>

          <span>
            جربي اسم مختلف أو غيري
            الفلتر.
          </span>
        </div>
      ) : (
        <div
          className={styles.grid}
        >
          {filteredCategories.map(
            (category) => (
              <article
                key={category.id}
                className={
                  styles.card
                }
              >
                <div
                  className={
                    styles.cardTop
                  }
                >
                  <span
                    className={
                      styles.icon
                    }
                  >
                    {category.catalog_type ===
                    "topup" ? (
                      <Smartphone
                        size={18}
                      />
                    ) : (
                      <CreditCard
                        size={18}
                      />
                    )}
                  </span>

                  <span
                    className={
                      category.offers_count >
                      0
                        ? styles.synced
                        : styles.notSynced
                    }
                  >
                    {category.offers_count >
                    0
                      ? `${category.offers_count} باقة`
                      : "غير متزامن"}
                  </span>
                </div>

                <div
                  className={
                    styles.copy
                  }
                >
                  <strong>
                    {category.name}
                  </strong>

                  <span>
                    ID:{" "}
                    {
                      category.provider_category_id
                    }
                  </span>

                  <small>
                    {category.provider_category ||
                      (
                        category.catalog_type ===
                        "topup"
                          ? "Top Up"
                          : "Gift Card"
                      )}
                  </small>
                </div>

                <SyncOffersButton
                  categoryId={
                    category.provider_category_id
                  }
                  type={
                    category.catalog_type
                  }
                />
              </article>
            ),
          )}
        </div>
      )}
    </section>
  );
}