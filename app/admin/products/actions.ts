"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type {
  AdminProductActionResult,
  AdminProductFormInput,
} from "@/types/adminProduct";
import type {
  ProductRequiredField,
  ProductStatus,
} from "@/types/product";

const PRODUCT_STATUSES: ProductStatus[] = [
  "available",
  "busy",
  "unavailable",
];

async function requireAdmin() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "يجب تسجيل الدخول أولًا.",
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      role,
      status
    `)
    .eq("id", user.id)
    .single<{
      id: string;
      role: string;
      status: string;
    }>();

  const allowedRoles = [
    "admin",
    "super_admin",
    "owner",
  ];

  if (
    profileError ||
    !profile ||
    profile.status !== "active" ||
    !allowedRoles.includes(profile.role)
  ) {
    throw new Error(
      "ليس لديك صلاحية لإدارة المنتجات.",
    );
  }

  return {
    supabase,
    adminId: user.id,
  };
}

function cleanOptionalText(
  value: string | null | undefined,
): string | null {
  const cleaned = value?.trim();

  return cleaned
    ? cleaned
    : null;
}

function isValidStatus(
  status: string,
): status is ProductStatus {
  return PRODUCT_STATUSES.includes(
    status as ProductStatus,
  );
}

function validateRequiredFields(
  fields: ProductRequiredField[],
): string | null {
  const ids = new Set<string>();

  for (const field of fields) {
    const id =
      field.id?.trim();

    const label =
      field.label?.trim();

    if (!id) {
      return "يوجد حقل بيانات بدون ID.";
    }

    if (!label) {
      return `الحقل ${id} لا يحتوي على اسم.`;
    }

    if (ids.has(id)) {
      return `معرّف الحقل ${id} مكرر.`;
    }

    ids.add(id);

    if (
      ![
        "text",
        "number",
        "email",
        "url",
      ].includes(field.type)
    ) {
      return `نوع الحقل ${label} غير صحيح.`;
    }
  }

  return null;
}

function validateProductInput(
  input: AdminProductFormInput,
): string | null {
  if (!input.nameAr.trim()) {
    return "اكتبي اسم المنتج بالعربي.";
  }

  if (!input.slug.trim()) {
    return "اكتبي رابط Slug للمنتج.";
  }

  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      input.slug.trim(),
    )
  ) {
    return "الـSlug يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام وشرطات فقط.";
  }

  if (
    !Number.isFinite(
      input.supplierPriceUsd,
    ) ||
    input.supplierPriceUsd < 0
  ) {
    return "سعر المورد غير صحيح.";
  }

  if (
    !Number.isFinite(
      input.profitUsd,
    ) ||
    input.profitUsd < 0
  ) {
    return "قيمة الربح غير صحيحة.";
  }

  if (
    input.oldPriceUsd !== null &&
    (
      !Number.isFinite(
        input.oldPriceUsd,
      ) ||
      input.oldPriceUsd < 0
    )
  ) {
    return "السعر القديم غير صحيح.";
  }

  if (
    !Number.isInteger(
      input.minimumQuantity,
    ) ||
    input.minimumQuantity < 1
  ) {
    return "أقل كمية يجب أن تكون 1 أو أكثر.";
  }

  if (
    !Number.isInteger(
      input.maximumQuantity,
    ) ||
    input.maximumQuantity <
      input.minimumQuantity
  ) {
    return "أقصى كمية يجب أن تكون أكبر من أو تساوي أقل كمية.";
  }

  if (!isValidStatus(input.status)) {
    return "حالة المنتج غير صحيحة.";
  }

  return validateRequiredFields(
    input.requiredFields,
  );
}

function normalizeRequiredFields(
  fields: ProductRequiredField[],
): ProductRequiredField[] {
  return fields.map((field) => ({
    id: field.id.trim(),

    label: field.label.trim(),

    placeholder:
      field.placeholder?.trim() ?? "",

    type: field.type,

    required:
      Boolean(field.required),

    helperText:
      cleanOptionalText(
        field.helperText,
      ) ?? undefined,

    pattern:
      cleanOptionalText(
        field.pattern,
      ) ?? undefined,

    patternMessage:
      cleanOptionalText(
        field.patternMessage,
      ) ?? undefined,
  }));
}

function revalidateProductPages(): void {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

export async function saveAdminProduct(
  input: AdminProductFormInput,
): Promise<AdminProductActionResult> {
  try {
    const validationMessage =
      validateProductInput(input);

    if (validationMessage) {
      return {
        success: false,
        message:
          validationMessage,
      };
    }

    const {
      supabase,
      adminId,
    } = await requireAdmin();

    const payload = {
      external_id:
        cleanOptionalText(
          input.externalId,
        ),

      supplier_product_id:
        cleanOptionalText(
          input.supplierProductId,
        ),

      category_id:
        input.categoryId || null,

      slug:
        input.slug.trim(),

      name_ar:
        input.nameAr.trim(),

      name_en:
        cleanOptionalText(
          input.nameEn,
        ),

      short_description_ar:
        cleanOptionalText(
          input.shortDescriptionAr,
        ),

      description_ar:
        cleanOptionalText(
          input.descriptionAr,
        ),

      image_url:
        cleanOptionalText(
          input.imageUrl,
        ),

      supplier_price_usd:
        Number(
          input.supplierPriceUsd,
        ),

      profit_usd:
        Number(
          input.profitUsd,
        ),

      old_price_usd:
        input.oldPriceUsd === null
          ? null
          : Number(
              input.oldPriceUsd,
            ),

      minimum_quantity:
        Math.floor(
          input.minimumQuantity,
        ),

      maximum_quantity:
        Math.floor(
          input.maximumQuantity,
        ),

      required_fields:
        normalizeRequiredFields(
          input.requiredFields,
        ),

      status:
        input.status,

      active:
        Boolean(input.active),

      featured:
        Boolean(input.featured),

      instant_delivery:
        Boolean(
          input.instantDelivery,
        ),

      delivery_time:
        cleanOptionalText(
          input.deliveryTime,
        ),

      badge:
        cleanOptionalText(
          input.badge,
        ),

      updated_at:
        new Date().toISOString(),
    };

    if (input.productId) {
      const {
        data: updatedProduct,
        error: updateError,
      } = await supabase
        .from("store_products")
        .update(payload)
        .eq(
          "id",
          input.productId,
        )
        .select(`
          id,
          slug,
          name_ar
        `)
        .single<{
          id: string;
          slug: string;
          name_ar: string;
        }>();

      if (
        updateError ||
        !updatedProduct
      ) {
        throw (
          updateError ??
          new Error(
            "تعذر تحديث المنتج.",
          )
        );
      }

      await supabase
        .from("activity_logs")
        .insert({
          actor_id: adminId,

          action:
            "store_product_updated",

          entity_type:
            "store_product",

          entity_id:
            updatedProduct.id,

          description:
            `Admin updated product ${updatedProduct.name_ar}`,

          new_data: payload,
        });

      revalidateProductPages();

      revalidatePath(
        `/product/${updatedProduct.slug}`,
      );

      return {
        success: true,
        message:
          "تم تحديث المنتج بنجاح.",

        productId:
          updatedProduct.id,
      };
    }

    const {
      data: createdProduct,
      error: createError,
    } = await supabase
      .from("store_products")
      .insert({
        ...payload,

        provider_data: {},

        rating: 5,
        reviews_count: 0,

        created_at:
          new Date().toISOString(),
      })
      .select(`
        id,
        slug,
        name_ar
      `)
      .single<{
        id: string;
        slug: string;
        name_ar: string;
      }>();

    if (
      createError ||
      !createdProduct
    ) {
      throw (
        createError ??
        new Error(
          "تعذر إنشاء المنتج.",
        )
      );
    }

    await supabase
      .from("activity_logs")
      .insert({
        actor_id: adminId,

        action:
          "store_product_created",

        entity_type:
          "store_product",

        entity_id:
          createdProduct.id,

        description:
          `Admin created product ${createdProduct.name_ar}`,

        new_data: payload,
      });

    revalidateProductPages();

    return {
      success: true,

      message:
        "تم إنشاء المنتج بنجاح.",

      productId:
        createdProduct.id,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "تعذر حفظ المنتج.";

    if (
      message
        .toLowerCase()
        .includes(
          "duplicate key",
        )
    ) {
      return {
        success: false,

        message:
          "يوجد منتج بنفس الـSlug أو External ID بالفعل.",
      };
    }

    return {
      success: false,
      message,
    };
  }
}

export async function toggleAdminProductActive({
  productId,
  active,
}: {
  productId: string;
  active: boolean;
}): Promise<AdminProductActionResult> {
  try {
    const {
      supabase,
      adminId,
    } = await requireAdmin();

    const {
      data: product,
      error,
    } = await supabase
      .from("store_products")
      .update({
        active,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", productId)
      .select(`
        id,
        slug,
        name_ar
      `)
      .single<{
        id: string;
        slug: string;
        name_ar: string;
      }>();

    if (error || !product) {
      throw (
        error ??
        new Error(
          "تعذر تحديث المنتج.",
        )
      );
    }

    await supabase
      .from("activity_logs")
      .insert({
        actor_id: adminId,

        action: active
          ? "store_product_activated"
          : "store_product_deactivated",

        entity_type:
          "store_product",

        entity_id:
          product.id,

        description: active
          ? `Admin activated product ${product.name_ar}`
          : `Admin deactivated product ${product.name_ar}`,

        new_data: {
          active,
        },
      });

    revalidateProductPages();

    revalidatePath(
      `/product/${product.slug}`,
    );

    return {
      success: true,

      message: active
        ? "تم تفعيل المنتج."
        : "تم إخفاء المنتج.",
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "تعذر تحديث المنتج.",
    };
  }
}

export async function toggleAdminProductFeatured({
  productId,
  featured,
}: {
  productId: string;
  featured: boolean;
}): Promise<AdminProductActionResult> {
  try {
    const {
      supabase,
      adminId,
    } = await requireAdmin();

    const {
      data: product,
      error,
    } = await supabase
      .from("store_products")
      .update({
        featured,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", productId)
      .select(`
        id,
        name_ar
      `)
      .single<{
        id: string;
        name_ar: string;
      }>();

    if (error || !product) {
      throw (
        error ??
        new Error(
          "تعذر تحديث المنتج.",
        )
      );
    }

    await supabase
      .from("activity_logs")
      .insert({
        actor_id: adminId,

        action: featured
          ? "store_product_featured"
          : "store_product_unfeatured",

        entity_type:
          "store_product",

        entity_id:
          product.id,

        description: featured
          ? `Admin featured product ${product.name_ar}`
          : `Admin removed featured flag from ${product.name_ar}`,

        new_data: {
          featured,
        },
      });

    revalidateProductPages();

    return {
      success: true,

      message: featured
        ? "تمت إضافة المنتج للمميزة."
        : "تمت إزالة المنتج من المميزة.",
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "تعذر تحديث المنتج.",
    };
  }
}

export async function updateAdminProductStatus({
  productId,
  status,
}: {
  productId: string;
  status: ProductStatus;
}): Promise<AdminProductActionResult> {
  try {
    if (!isValidStatus(status)) {
      return {
        success: false,
        message:
          "حالة المنتج غير صحيحة.",
      };
    }

    const {
      supabase,
      adminId,
    } = await requireAdmin();

    const {
      data: product,
      error,
    } = await supabase
      .from("store_products")
      .update({
        status,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", productId)
      .select(`
        id,
        slug,
        name_ar
      `)
      .single<{
        id: string;
        slug: string;
        name_ar: string;
      }>();

    if (error || !product) {
      throw (
        error ??
        new Error(
          "تعذر تحديث حالة المنتج.",
        )
      );
    }

    await supabase
      .from("activity_logs")
      .insert({
        actor_id: adminId,

        action:
          "store_product_status_updated",

        entity_type:
          "store_product",

        entity_id:
          product.id,

        description:
          `Admin changed product ${product.name_ar} status to ${status}`,

        new_data: {
          status,
        },
      });

    revalidateProductPages();

    revalidatePath(
      `/product/${product.slug}`,
    );

    return {
      success: true,

      message:
        "تم تحديث حالة المنتج.",
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "تعذر تحديث حالة المنتج.",
    };
  }
}

export async function duplicateAdminProduct(
  productId: string,
): Promise<AdminProductActionResult> {
  try {
    const {
      supabase,
      adminId,
    } = await requireAdmin();

    const {
      data: sourceProduct,
      error: sourceError,
    } = await supabase
      .from("store_products")
      .select("*")
      .eq("id", productId)
      .single<Record<
        string,
        unknown
      >>();

    if (
      sourceError ||
      !sourceProduct
    ) {
      throw (
        sourceError ??
        new Error(
          "المنتج الأصلي غير موجود.",
        )
      );
    }

    const duplicateSuffix =
      crypto.randomUUID()
        .slice(0, 6)
        .toLowerCase();

    const sourceSlug =
      String(
        sourceProduct.slug,
      );

    const sourceName =
      String(
        sourceProduct.name_ar,
      );

    const {
      id: _id,
      created_at: _createdAt,
      updated_at: _updatedAt,
      external_id: _externalId,
      supplier_product_id:
        _supplierProductId,

      ...copyableData
    } = sourceProduct;

    const {
      data: duplicatedProduct,
      error: duplicateError,
    } = await supabase
      .from("store_products")
      .insert({
        ...copyableData,

        external_id: null,
        supplier_product_id:
          null,

        slug:
          `${sourceSlug}-copy-${duplicateSuffix}`,

        name_ar:
          `${sourceName} - نسخة`,

        active: false,
        featured: false,

        created_at:
          new Date().toISOString(),

        updated_at:
          new Date().toISOString(),
      })
      .select(`
        id,
        name_ar
      `)
      .single<{
        id: string;
        name_ar: string;
      }>();

    if (
      duplicateError ||
      !duplicatedProduct
    ) {
      throw (
        duplicateError ??
        new Error(
          "تعذر نسخ المنتج.",
        )
      );
    }

    await supabase
      .from("activity_logs")
      .insert({
        actor_id: adminId,

        action:
          "store_product_duplicated",

        entity_type:
          "store_product",

        entity_id:
          duplicatedProduct.id,

        description:
          `Admin duplicated product ${sourceName}`,

        new_data: {
          source_product_id:
            productId,

          duplicated_product_id:
            duplicatedProduct.id,
        },
      });

    revalidateProductPages();

    return {
      success: true,

      message:
        "تم إنشاء نسخة من المنتج. عدّلي بياناتها ثم فعّليها.",

      productId:
        duplicatedProduct.id,
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "تعذر نسخ المنتج.",
    };
  }
}

export async function deleteAdminProduct(
  productId: string,
): Promise<AdminProductActionResult> {
  try {
    const {
      supabase,
      adminId,
    } = await requireAdmin();

    const {
      data: product,
      error: productError,
    } = await supabase
      .from("store_products")
      .select(`
        id,
        name_ar
      `)
      .eq("id", productId)
      .single<{
        id: string;
        name_ar: string;
      }>();

    if (
      productError ||
      !product
    ) {
      throw (
        productError ??
        new Error(
          "المنتج غير موجود.",
        )
      );
    }

    const {
      count: orderItemsCount,
      error: countError,
    } = await supabase
      .from("product_order_items")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "product_id",
        productId,
      );

    if (countError) {
      throw countError;
    }

    /*
     * لو المنتج دخل في طلبات قديمة،
     * نخفيه بدل حذفه للحفاظ على السجل.
     */
    if (
      (orderItemsCount ?? 0) > 0
    ) {
      const { error } =
        await supabase
          .from("store_products")
          .update({
            active: false,

            status:
              "unavailable",

            updated_at:
              new Date().toISOString(),
          })
          .eq("id", productId);

      if (error) {
        throw error;
      }

      await supabase
        .from("activity_logs")
        .insert({
          actor_id: adminId,

          action:
            "store_product_archived",

          entity_type:
            "store_product",

          entity_id:
            productId,

          description:
            `Admin archived product ${product.name_ar} because it has order history`,
        });

      revalidateProductPages();

      return {
        success: true,

        message:
          "المنتج مرتبط بطلبات قديمة، لذلك تم إخفاؤه بدل حذفه.",
      };
    }

    const { error: unlinkProviderError } = await supabase
      .from("provider_offers")
      .update({ imported_to_store: false, store_product_id: null })
      .eq("store_product_id", productId);
    if (unlinkProviderError) throw unlinkProviderError;

    const { error: deleteOffersError } = await supabase
      .from("store_product_offers")
      .delete()
      .eq("product_id", productId);
    if (deleteOffersError) throw deleteOffersError;

    const { error: deleteError } =
      await supabase
        .from("store_products")
        .delete()
        .eq("id", productId);

    if (deleteError) {
      throw deleteError;
    }

    await supabase
      .from("activity_logs")
      .insert({
        actor_id: adminId,

        action:
          "store_product_deleted",

        entity_type:
          "store_product",

        entity_id:
          productId,

        description:
          `Admin deleted product ${product.name_ar}`,
      });

    revalidateProductPages();

    return {
      success: true,
      message:
        "تم حذف المنتج الرئيسي وكل باقاته وإلغاء ربطها من المورد.",
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "تعذر حذف المنتج.",
    };
  }
}
