"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  createClient,
} from "@/lib/supabase/server";

interface UpdateProductResult {
  success: boolean;
  message: string;
}

interface UpdateMainProductInput {
  productId: string;

  nameAr: string;
  nameEn?: string | null;

  shortDescriptionAr?:
    | string
    | null;

  descriptionAr?:
    | string
    | null;

  imageUrl?:
    | string
    | null;

  active: boolean;
  featured: boolean;

  deliveryTime?:
    | string
    | null;

  badge?:
    | string
    | null;
}

async function requireAdmin() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "يجب تسجيل الدخول أولًا.",
    );
  }

  const {
    data: profile,
  } = await supabase
    .from("profiles")
    .select(`
      role,
      status
    `)
    .eq("id", user.id)
    .single<{
      role: string;
      status: string;
    }>();

  if (
    !profile ||
    profile.status !==
      "active" ||
    ![
      "admin",
      "super_admin",
      "owner",
    ].includes(
      profile.role,
    )
  ) {
    throw new Error(
      "ليس لديك صلاحية لتعديل المنتج.",
    );
  }

  return supabase;
}

function cleanText(
  value:
    | string
    | null
    | undefined,
): string | null {
  const cleaned =
    value?.trim();

  return cleaned
    ? cleaned
    : null;
}

export async function updateMainProduct(
  input: UpdateMainProductInput,
): Promise<UpdateProductResult> {
  try {
    const productId =
      input.productId.trim();

    if (!productId) {
      return {
        success: false,
        message:
          "معرّف المنتج غير صحيح.",
      };
    }

    if (
      !input.nameAr.trim()
    ) {
      return {
        success: false,
        message:
          "اكتبي اسم المنتج.",
      };
    }

    const supabase =
      await requireAdmin();

    const {
      data: product,
      error,
    } = await supabase
      .from("store_products")
      .update({
        name_ar:
          input.nameAr.trim(),

        name_en:
          cleanText(
            input.nameEn,
          ),

        short_description_ar:
          cleanText(
            input.shortDescriptionAr,
          ),

        description_ar:
          cleanText(
            input.descriptionAr,
          ),

        image_url:
          cleanText(
            input.imageUrl,
          ),

        active:
          Boolean(
            input.active,
          ),

        featured:
          Boolean(
            input.featured,
          ),

        delivery_time:
          cleanText(
            input.deliveryTime,
          ),

        badge:
          cleanText(
            input.badge,
          ),

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        productId,
      )
      .select(`
        id,
        slug
      `)
      .single<{
        id: string;
        slug: string;
      }>();

    if (
      error ||
      !product
    ) {
      return {
        success: false,
        message:
          error?.message ??
          "تعذر تحديث المنتج.",
      };
    }

    revalidatePath(
      `/admin/products/${productId}`,
    );

    revalidatePath(
      "/admin/products",
    );

    revalidatePath(
      "/products",
    );

    revalidatePath(
      `/product/${product.slug}`,
    );

    return {
      success: true,
      message:
        "تم تحديث بيانات المنتج.",
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