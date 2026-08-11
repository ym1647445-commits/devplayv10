"use client";

import {
  Heart,
  Share2,
  ShoppingCart,
  Star,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import {
  formatUsd,
  getProductOldPriceUsd,
  getProductPriceUsd,
} from "@/lib/productPricing";
import { useCartStore } from "@/stores/cartStore";
import { useFavoritesStore } from "@/stores/favoritesStore";
import type { Product } from "@/types/product";

import styles from "./ProductCard.module.css";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({
  product,
}: ProductCardProps) {
  const router = useRouter();

  const addItem =
    useCartStore(
      (state) => state.addItem,
    );

  const toggleFavorite =
    useFavoritesStore(
      (state) =>
        state.toggleFavorite,
    );

  const favorite =
    useFavoritesStore(
      (state) =>
        state.items.some(
          (item) =>
            item.id ===
            product.id,
        ),
    );

  const itemQuantity =
    useCartStore(
      (state) =>
        state.items.reduce(
          (total, item) =>
            item.product.id ===
            product.id
              ? total +
                item.quantity
              : total,
          0,
        ),
    );

  const priceUsd =
    getProductPriceUsd(product);

  const oldPriceUsd =
    getProductOldPriceUsd(
      product,
    );

  const hasDiscount =
    oldPriceUsd !== null &&
    oldPriceUsd > priceUsd;

  const isUnavailable =
    product.status ===
    "unavailable";

  const requiresData =
    (
      product.requiredFields
        ?.length ?? 0
    ) > 0;

  function handleAddToCart(): void {
    if (isUnavailable) {
      return;
    }

    if (requiresData || product.providerData?.mainProductId) {
      router.push(
        `/products/${product.slug}`,
      );

      return;
    }

    addItem(product);
  }

  async function handleShare(): Promise<void> {
    const productUrl =
      `${window.location.origin}/products/${product.slug}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,

          text:
            product.shortDescription ??
            product.name,

          url: productUrl,
        });

        return;
      }

      await navigator.clipboard.writeText(
        productUrl,
      );
    } catch {
      // المستخدم أغلق نافذة المشاركة.
    }
  }

  return (
    <article className={styles.card}>
      <a
        className={styles.imageLink}
        href={`/products/${product.slug}`}
        aria-label={`عرض ${product.name}`}
      >
        <div
          className={
            styles.imageWrapper
          }
        >
          <img
            className={styles.image}
            src={product.image}
            alt={product.name}
            loading="lazy"
          />

          {product.badge && (
            <span
              className={styles.badge}
            >
              {product.badge}
            </span>
          )}

          <div
            className={
              styles.imageActions
            }
          >
            <button
              className={`${styles.iconButton} ${
                favorite
                  ? styles.favoriteActive
                  : ""
              }`}
              type="button"
              aria-label={
                favorite
                  ? "إزالة من المفضلة"
                  : "إضافة إلى المفضلة"
              }
              aria-pressed={
                favorite
              }
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();

                toggleFavorite(
                  product,
                );
              }}
            >
              <Heart
                size={17}
                fill={
                  favorite
                    ? "currentColor"
                    : "none"
                }
              />
            </button>

            <button
              className={
                styles.iconButton
              }
              type="button"
              aria-label="مشاركة المنتج"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();

                void handleShare();
              }}
            >
              <Share2 size={17} />
            </button>
          </div>

          {product.instantDelivery && (
            <span
              className={
                styles.instant
              }
            >
              <Zap size={12} />
              سريع
            </span>
          )}
        </div>
      </a>

      <div className={styles.content}>
        <span
          className={styles.category}
        >
          {product.category}
        </span>

        <a
          className={styles.title}
          href={`/products/${product.slug}`}
        >
          {product.name}
        </a>

        <div
          className={
            styles.ratingRow
          }
        >
          <Star
            size={14}
            fill="currentColor"
          />

          <strong>
            {product.rating}
          </strong>

          <span>
            ({product.reviewsCount})
          </span>
        </div>

        <div
          className={styles.priceRow}
        >
          <strong>
            {formatUsd(priceUsd)}
          </strong>

          {hasDiscount && (
            <del>
              {formatUsd(
                oldPriceUsd!,
              )}
            </del>
          )}
        </div>

        <div
          className={
            styles.statusRow
          }
        >
          <span
            className={`${styles.statusDot} ${
              styles[
                product.status
              ]
            }`}
          />

          <span>
            {product.status ===
              "available" &&
              "متاح الآن"}

            {product.status ===
              "busy" &&
              "ضغط مرتفع"}

            {product.status ===
              "unavailable" &&
              "غير متوفر"}
          </span>
        </div>

        <Button
          fullWidth
          size="small"
          disabled={isUnavailable}
          rightIcon={
            <ShoppingCart />
          }
          onClick={
            handleAddToCart
          }
        >
          {isUnavailable
            ? "غير متوفر"
            : requiresData
              ? "إدخال البيانات"
              : itemQuantity > 0
                ? `في السلة (${itemQuantity})`
                : "إضافة للسلة"}
        </Button>
      </div>
    </article>
  );
}
