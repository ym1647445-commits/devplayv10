import {
  Plus,
  TicketPercent,
} from "lucide-react";

import {
  CouponsManager,
  type CouponCategoryOption,
  type CouponCustomerOption,
  type CouponProductOption,
} from "@/components/admin/coupons/CouponsManager";
import { createClient } from "@/lib/supabase/server";
import type { AdminCoupon } from "@/types/adminCoupon";

interface ProductRow {
  id: string;
  name_ar: string;

  store_categories:
    | {
        name_ar: string;
      }
    | {
        name_ar: string;
      }[]
    | null;
}

function getRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export default async function AdminCouponsPage() {
  const supabase = await createClient();

  const [
    couponsResult,
    customersResult,
    categoriesResult,
    productsResult,
  ] = await Promise.all([
    supabase
      .from("checkout_coupons")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .returns<AdminCoupon[]>(),

    supabase
      .from("profiles")
      .select(`
        id,
        customer_id,
        full_name,
        email,
        customer_level
      `)
      .eq("status", "active")
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("store_categories")
      .select(`
        id,
        name_ar
      `)
      .eq("active", true)
      .order("sort_order", {
        ascending: true,
      }),

    supabase
      .from("store_products")
      .select(`
        id,
        name_ar,
        store_categories(
          name_ar
        )
      `)
      .eq("active", true)
      .order("name_ar", {
        ascending: true,
      })
      .returns<ProductRow[]>(),
  ]);

  if (couponsResult.error) {
    console.error(
      "Failed to load coupons:",
      couponsResult.error,
    );
  }

  const coupons =
    (couponsResult.data ?? []).map(
      (coupon) => ({
        ...coupon,

        value: Number(coupon.value),

        minimum_cart_amount:
          Number(
            coupon.minimum_cart_amount,
          ),

        maximum_discount:
          coupon.maximum_discount ===
          null
            ? null
            : Number(
                coupon.maximum_discount,
              ),

        selected_levels:
          coupon.selected_levels ?? [],
      }),
    );

  const customers: CouponCustomerOption[] =
    (customersResult.data ?? []).map(
      (customer) => ({
        id: customer.id,

        customerId:
          customer.customer_id,

        fullName:
          customer.full_name,

        email:
          customer.email,

        level:
          customer.customer_level,
      }),
    );

  const categories: CouponCategoryOption[] =
    (categoriesResult.data ?? []).map(
      (category) => ({
        id: category.id,
        name: category.name_ar,
      }),
    );

  const products: CouponProductOption[] =
    (productsResult.data ?? []).map(
      (product) => {
        const category =
          getRelation(
            product.store_categories,
          );

        return {
          id: product.id,

          name: product.name_ar,

          categoryName:
            category?.name_ar ?? null,
        };
      },
    );

  return (
    <section className="admin-coupons-page">
      <header className="admin-coupons-heading">
        <div>
          <span>
            MARKETING CENTER
          </span>

          <h1>
            إدارة الكوبونات
          </h1>

          <p>
            إنشاء الخصومات وتحديد الشروط
            والعملاء والمنتجات المستهدفة.
          </p>
        </div>

        <span>
          <TicketPercent size={17} />
          {coupons.length.toLocaleString(
            "ar-EG",
          )}{" "}
          كوبون
        </span>
      </header>

      <CouponsManager
        coupons={coupons}
        customers={customers}
        products={products}
        categories={categories}
      />
    </section>
  );
}