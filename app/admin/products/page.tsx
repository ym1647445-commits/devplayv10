import {
  Boxes,
  CloudDownload,
} from "lucide-react";
import Link from "next/link";

import {
  ProductsManager,
} from "@/components/admin/products/ProductsManager";
import { createClient } from "@/lib/supabase/server";
import type {
  AdminProduct,
  AdminProductCategory,
  AdminProductStats,
} from "@/types/adminProduct";
import type {
  ProductRequiredField,
  ProductStatus,
} from "@/types/product";

interface RawCategory {
  id: string;
  slug: string;

  name_ar: string;
  name_en: string | null;

  image_url: string | null;

  active: boolean;
  sort_order: number;
}

interface RawProduct {
  id: string;

  external_id: string | null;
  supplier_product_id: string | null;

  category_id: string | null;

  slug: string;

  name_ar: string;
  name_en: string | null;

  short_description_ar: string | null;
  description_ar: string | null;

  image_url: string | null;

  supplier_price_usd:
    | number
    | string;

  profit_usd:
    | number
    | string;

  old_price_usd:
    | number
    | string
    | null;

  minimum_quantity: number;
  maximum_quantity: number;

  required_fields:
    | ProductRequiredField[]
    | null;

  status: ProductStatus;

  active: boolean;
  featured: boolean;
  instant_delivery: boolean;

  delivery_time: string | null;
  badge: string | null;

  rating:
    | number
    | string;

  reviews_count: number;

  provider_data:
    | Record<string, unknown>
    | null;

  created_at: string;
  updated_at: string;

  category:
    | RawCategory
    | RawCategory[]
    | null;
}

function getRelation<T>(
  relation: T | T[] | null,
): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

export default async function AdminProductsPage() {
  const supabase =
    await createClient();

  const [
    productsResult,
    categoriesResult,
  ] = await Promise.all([
    supabase
      .from("store_products")
      .select(`
        id,
        external_id,
        supplier_product_id,
        category_id,
        slug,
        name_ar,
        name_en,
        short_description_ar,
        description_ar,
        image_url,
        supplier_price_usd,
        profit_usd,
        old_price_usd,
        minimum_quantity,
        maximum_quantity,
        required_fields,
        status,
        active,
        featured,
        instant_delivery,
        delivery_time,
        badge,
        rating,
        reviews_count,
        provider_data,
        created_at,
        updated_at,

        category:store_categories(
          id,
          slug,
          name_ar,
          name_en,
          image_url,
          active,
          sort_order
        )
      `)
      .order("created_at", {
        ascending: false,
      })
      .returns<RawProduct[]>(),

    supabase
      .from("store_categories")
      .select(`
        id,
        slug,
        name_ar,
        name_en,
        image_url,
        active,
        sort_order
      `)
      .order("sort_order", {
        ascending: true,
      })
      .returns<RawCategory[]>(),
  ]);

  if (productsResult.error) {
    console.error(
      "Failed to load products:",
      productsResult.error,
    );
  }

  if (categoriesResult.error) {
    console.error(
      "Failed to load categories:",
      categoriesResult.error,
    );
  }

  const categories:
    AdminProductCategory[] =
      (
        categoriesResult.data ?? []
      ).map((category) => ({
        id: category.id,
        slug: category.slug,

        nameAr:
          category.name_ar,

        nameEn:
          category.name_en,

        imageUrl:
          category.image_url,

        active:
          category.active,

        sortOrder:
          category.sort_order,
      }));

  const products:
    AdminProduct[] =
      (
        productsResult.data ?? []
      ).map((product) => {
        const category =
          getRelation(product.category);

        const supplierPriceUsd =
          Number(
            product.supplier_price_usd,
          );

        const profitUsd =
          Number(product.profit_usd);

        return {
          id: product.id,

          externalId:
            product.external_id,

          supplierProductId:
            product.supplier_product_id,

          categoryId:
            product.category_id,

          category: category
            ? {
                id: category.id,
                slug: category.slug,

                nameAr:
                  category.name_ar,

                nameEn:
                  category.name_en,

                imageUrl:
                  category.image_url,

                active:
                  category.active,

                sortOrder:
                  category.sort_order,
              }
            : null,

          slug: product.slug,

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

          supplierPriceUsd,

          profitUsd,

          finalPriceUsd:
            supplierPriceUsd +
            profitUsd,

          oldPriceUsd:
            product.old_price_usd ===
            null
              ? null
              : Number(
                  product.old_price_usd,
                ),

          minimumQuantity:
            Number(
              product.minimum_quantity,
            ),

          maximumQuantity:
            Number(
              product.maximum_quantity,
            ),

          requiredFields:
            product.required_fields ??
            [],

          status:
            product.status,

          active:
            product.active,

          featured:
            product.featured,

          instantDelivery:
            product.instant_delivery,

          deliveryTime:
            product.delivery_time,

          badge:
            product.badge,

          rating:
            Number(product.rating),

          reviewsCount:
            Number(
              product.reviews_count,
            ),

          providerData:
            product.provider_data ?? {},

          createdAt:
            product.created_at,

          updatedAt:
            product.updated_at,
        };
      });

  const activeProducts =
    products.filter(
      (product) =>
        product.active,
    );

  const stats: AdminProductStats = {
    total: products.length,

    active:
      activeProducts.length,

    inactive:
      products.filter(
        (product) =>
          !product.active,
      ).length,

    available:
      products.filter(
        (product) =>
          product.status ===
          "available",
      ).length,

    busy:
      products.filter(
        (product) =>
          product.status === "busy",
      ).length,

    unavailable:
      products.filter(
        (product) =>
          product.status ===
          "unavailable",
      ).length,

    featured:
      products.filter(
        (product) =>
          product.featured,
      ).length,

    averageSupplierPriceUsd:
      products.length === 0
        ? 0
        : products.reduce(
            (total, product) =>
              total +
              product.supplierPriceUsd,
            0,
          ) / products.length,

    averageProfitUsd:
      products.length === 0
        ? 0
        : products.reduce(
            (total, product) =>
              total +
              product.profitUsd,
            0,
          ) / products.length,
  };

  return (
    <section className="admin-products-page">
      <header className="admin-products-heading">
        <div>
          <span>
            PRODUCT CONTROL CENTER
          </span>

          <h1>
            إدارة المنتجات
          </h1>

          <p>
            التحكم في الأسعار والربح
            والتوفر وبيانات تنفيذ المنتجات.
          </p>
        </div>

        <span>
          <Boxes size={17} />

          {products.length.toLocaleString(
            "ar-EG",
          )}{" "}
          منتج
        </span>
      </header>

      <div className="admin-products-quick-actions">
        <Link href="/admin/provider-offers"><CloudDownload size={18}/> استيراد لعبة بكل باقاتها من Flexy</Link>
        <span>لتعديل الصورة والاسم والتحذيرات والبيانات المطلوبة: افتحي المنتج ثم عدّلي المنتج الرئيسي أو الباقة المطلوبة.</span>
      </div>

      <ProductsManager
        products={products}
        categories={categories}
        stats={stats}
      />
    </section>
  );
}
