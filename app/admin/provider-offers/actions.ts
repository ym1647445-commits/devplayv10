"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  createClient,
} from "@/lib/supabase/server";

interface ImportOfferResult {
  success: boolean;
  message: string;

  productId?: string;
  productOfferId?: string;
}

interface ProviderOfferRow {
  id: string;

  provider_name: string;

  catalog_type:
    | "topup"
    | "gc";

  provider_category_id: string;

  provider_offer_id: string;

  name: string;

  price:
    | number
    | string;

  original_price:
    | number
    | string
    | null;

  currency: string;

  stock:
    | number
    | null;

  available: boolean;

  raw_data:
    Record<
      string,
      unknown
    >;

  provider_categories:
    | {
        id: string;
        name: string;
        provider_category_id: string;

        catalog_type:
          | "topup"
          | "gc";
      }
    | {
        id: string;
        name: string;
        provider_category_id: string;

        catalog_type:
          | "topup"
          | "gc";
      }[]
    | null;
}

function slugify(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

function getMainProductExternalId(
  providerName: string,
  catalogType: string,
  categoryId: string,
): string {
  return [
    providerName,
    catalogType,
    categoryId,
  ].join(":");
}

async function requireAdmin() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
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
      role,
      status
    `)
    .eq("id", user.id)
    .single<{
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
    profile.status !==
      "active" ||
    !allowedRoles.includes(
      profile.role,
    )
  ) {
    throw new Error(
      "ليس لديك صلاحية لتنفيذ الاستيراد.",
    );
  }

  return {
    supabase,
    adminId: user.id,
  };
}

function getCategoryRelation(
  relation:
    ProviderOfferRow["provider_categories"],
) {
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

async function getDefaultProfitUsd(
  supabase: Awaited<
    ReturnType<
      typeof createClient
    >
  >,
  supplierPriceUsd: number,
): Promise<number> {
  const {
    data: settings,
  } = await supabase
    .from(
      "platform_settings",
    )
    .select(`
      api_pricing_mode,
      default_profit_usd,
      default_markup_percentage,
      usd_to_egp_rate,
      profit_per_usd_egp
    `)
    .eq("id", 1)
    .maybeSingle<{
      api_pricing_mode:
        | "fixed_usd"
        | "percentage"
        | "manual"
        | null;

      default_profit_usd:
        | number
        | string
        | null;

      default_markup_percentage:
        | number
        | string
        | null;

      usd_to_egp_rate: number | string;
      profit_per_usd_egp: number | string;
    }>();

  let profitUsd = 0;

  if (
    settings
      ?.api_pricing_mode ===
    "percentage"
  ) {
    const percentage =
      Number(
        settings
          .default_markup_percentage ??
          0,
      );

    profitUsd =
      supplierPriceUsd *
      (percentage / 100);
  } else if (
    settings
      ?.api_pricing_mode ===
    "manual"
  ) {
    profitUsd = 0;
  } else {
    const exchangeRate=Number(settings?.usd_to_egp_rate??0);
    const profitPerSupplierUsdEgp=Number(settings?.profit_per_usd_egp??0);
    profitUsd=exchangeRate>0?supplierPriceUsd*profitPerSupplierUsdEgp/exchangeRate:Number(settings?.default_profit_usd??0.2);
  }

  if (
    !Number.isFinite(
      profitUsd,
    ) ||
    profitUsd < 0
  ) {
    return 0;
  }

  return profitUsd;
}

export async function importProviderOfferToStore(
  providerOfferRowId: string,
): Promise<ImportOfferResult> {
  try {
    const safeOfferRowId =
      providerOfferRowId.trim();

    if (!safeOfferRowId) {
      return {
        success: false,
        message:
          "معرّف باقة المورد غير صحيح.",
      };
    }

    const {
      supabase,
      adminId,
    } =
      await requireAdmin();

    /*
     * ==========================================
     * 1. قراءة باقة المورد
     * ==========================================
     */

    const {
      data: offer,
      error: offerError,
    } = await supabase
      .from(
        "provider_offers",
      )
      .select(`
        id,
        provider_name,
        catalog_type,
        provider_category_id,
        provider_offer_id,
        name,
        price,
        original_price,
        currency,
        stock,
        available,
        raw_data,

        provider_categories (
          id,
          name,
          provider_category_id,
          catalog_type
        )
      `)
      .eq(
        "id",
        safeOfferRowId,
      )
      .single<ProviderOfferRow>();

    if (
      offerError ||
      !offer
    ) {
      return {
        success: false,
        message:
          offerError?.message ??
          "تعذر العثور على باقة المورد.",
      };
    }

    const providerOfferId =
      String(
        offer.provider_offer_id,
      ).trim();

    if (
      !providerOfferId ||
      providerOfferId ===
        "undefined" ||
      providerOfferId ===
        "null"
    ) {
      return {
        success: false,
        message:
          "معرّف الباقة لدى المورد غير صالح. أعيدي مزامنة القسم أولًا.",
      };
    }

    const supplierPriceUsd =
      Number(
        offer.price,
      );

    if (
      !Number.isFinite(
        supplierPriceUsd,
      ) ||
      supplierPriceUsd < 0
    ) {
      return {
        success: false,
        message:
          "سعر المورد غير صالح.",
      };
    }

    const categoryRelation =
      getCategoryRelation(
        offer.provider_categories,
      );

    const categoryName =
      categoryRelation?.name?.trim() ||
      offer.provider_category_id;

    const categorySlug =
      slugify(
        offer.provider_category_id,
      ) ||
      `category-${offer.id}`;

    /*
     * ==========================================
     * 2. إيجاد/إنشاء قسم المتجر
     * ==========================================
     */

    let storeCategoryId:
      | string
      | null = null;

    const {
      data: existingCategory,
      error:
        existingCategoryError,
    } = await supabase
      .from(
        "store_categories",
      )
      .select("id")
      .eq(
        "slug",
        categorySlug,
      )
      .maybeSingle<{
        id: string;
      }>();

    if (
      existingCategoryError
    ) {
      return {
        success: false,
        message:
          existingCategoryError.message,
      };
    }

    if (existingCategory) {
      storeCategoryId =
        existingCategory.id;
    } else {
      const {
        data: createdCategory,
        error:
          createCategoryError,
      } = await supabase
        .from(
          "store_categories",
        )
        .insert({
          slug:
            categorySlug,

          name_ar:
            categoryName,

          name_en:
            categoryName,

          active:
            true,
        })
        .select("id")
        .single<{
          id: string;
        }>();

      if (
        createCategoryError ||
        !createdCategory
      ) {
        return {
          success: false,
          message:
            createCategoryError?.message ??
            "تعذر إنشاء قسم المتجر.",
        };
      }

      storeCategoryId =
        createdCategory.id;
    }

    /*
     * ==========================================
     * 3. المنتج الرئيسي
     *
     * مثال:
     * Mobile Legends (Global)
     *
     * الباقات لن تصبح Products منفصلة.
     * ==========================================
     */

    const mainExternalId =
      getMainProductExternalId(
        offer.provider_name,
        offer.catalog_type,
        offer.provider_category_id,
      );

    const mainProductSlug =
      categorySlug;

    let mainProductId:
      string;

    const {
      data:
        existingMainProduct,
      error:
        existingMainProductError,
    } = await supabase
      .from(
        "store_products",
      )
      .select(`
        id,
        external_id,
        slug
      `)
      .eq(
        "external_id",
        mainExternalId,
      )
      .maybeSingle<{
        id: string;
        external_id:
          | string
          | null;

        slug: string;
      }>();

    if (
      existingMainProductError
    ) {
      return {
        success: false,
        message:
          existingMainProductError.message,
      };
    }

    if (
      existingMainProduct
    ) {
      mainProductId =
        existingMainProduct.id;
    } else {
      /*
       * ممكن يكون فيه منتج رئيسي
       * بنفس الـ slug تم إنشاؤه يدويًا.
       */

      const {
        data:
          productBySlug,
        error:
          productBySlugError,
      } = await supabase
        .from(
          "store_products",
        )
        .select(`
          id,
          external_id,
          slug
        `)
        .eq(
          "slug",
          mainProductSlug,
        )
        .maybeSingle<{
          id: string;

          external_id:
            | string
            | null;

          slug: string;
        }>();

      if (
        productBySlugError
      ) {
        return {
          success: false,
          message:
            productBySlugError.message,
        };
      }

      if (productBySlug) {
        mainProductId =
          productBySlug.id;

        /*
         * نربطه بالمورد بدون تغيير
         * باقي إعداداته اليدوية.
         */
        const {
          error: linkProductError,
        } = await supabase
          .from(
            "store_products",
          )
          .update({
            external_id:
              mainExternalId,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            productBySlug.id,
          );

        if (
          linkProductError
        ) {
          return {
            success: false,
            message:
              linkProductError.message,
          };
        }
      } else {
        const {
          data:
            createdMainProduct,
          error:
            createMainProductError,
        } = await supabase
          .from(
            "store_products",
          )
          .insert({
            external_id:
              mainExternalId,

            supplier_product_id:
              null,

            category_id:
              storeCategoryId,

            slug:
              mainProductSlug,

            name_ar:
              categoryName,

            name_en:
              categoryName,

            short_description_ar:
              `باقات ${categoryName}`,

            description_ar:
              `اختر الباقة المناسبة من ${categoryName}.`,

            image_url:
              null,

            /*
             * السعر الحقيقي موجود
             * داخل store_product_offers.
             */
            supplier_price_usd:
              0,

            profit_usd:
              0,

            old_price_usd:
              null,

            minimum_quantity:
              1,

            maximum_quantity:
              1,

            /*
             * دي Default للعبة كلها.
             * هنخلي الباقة تقدر تعمل
             * Override عليها بعدين.
             */
            required_fields:
              [],

            status:
              "available",

            active:
              true,

            featured:
              false,

            instant_delivery:
              true,

            delivery_time:
              null,

            badge:
              null,

            provider_data: {
              provider:
                offer.provider_name,

              catalog_type:
                offer.catalog_type,

              provider_category_id:
                offer.provider_category_id,

              product_type:
                "provider_group",
            },
          })
          .select("id")
          .single<{
            id: string;
          }>();

        if (
          createMainProductError ||
          !createdMainProduct
        ) {
          return {
            success: false,
            message:
              createMainProductError?.message ??
              "تعذر إنشاء المنتج الرئيسي.",
          };
        }

        mainProductId =
          createdMainProduct.id;
      }
    }

    /*
     * ==========================================
     * 4. حساب الربح الافتراضي للباقة
     * ==========================================
     */

    const profitUsd =
      await getDefaultProfitUsd(
        supabase,
        supplierPriceUsd,
      );

    const originalPrice =
      offer.original_price ===
        null
        ? null
        : Number(
            offer.original_price,
          );

    const safeOriginalPrice =
      originalPrice !== null &&
      Number.isFinite(
        originalPrice,
      ) &&
      originalPrice >= 0
        ? originalPrice
        : null;

    /*
     * ==========================================
     * 5. الباقة داخل المنتج الرئيسي
     * ==========================================
     */

    const {
      data:
        existingProductOffer,
      error:
        existingProductOfferError,
    } = await supabase
      .from(
        "store_product_offers",
      )
      .select(`
        id,
        product_id
      `)
      .eq(
        "provider_offer_row_id",
        offer.id,
      )
      .maybeSingle<{
        id: string;
        product_id: string;
      }>();

    if (
      existingProductOfferError
    ) {
      return {
        success: false,
        message:
          existingProductOfferError.message,
      };
    }

    const offerPayload = {
      product_id:
        mainProductId,

      provider_name:
        offer.provider_name,

      provider_offer_row_id:
        offer.id,

      provider_offer_id:
        providerOfferId,

      /*
       * المورد يرسل الاسم غالبًا
       * بالإنجليزي.
       * تقدري تعدلي العربي من الأدمن.
       */
      name_ar:
        offer.name,

      name_en:
        offer.name,

      supplier_price_usd:
        supplierPriceUsd,

      profit_usd:
        profitUsd,

      old_price_usd:
        safeOriginalPrice,

      stock:
        offer.stock,

      available:
        offer.available,

      active:
        true,

      /*
       * الشروط والمتطلبات اليدوية
       * لا نضعها من API حاليًا.
       */
      required_fields:
        [],

      instructions_ar:
        null,

      customer_note_ar:
        null,

      provider_data: {
        provider:
          offer.provider_name,

        catalog_type:
          offer.catalog_type,

        provider_category_id:
          offer.provider_category_id,

        provider_offer_id:
          providerOfferId,

        currency:
          offer.currency,

        raw_data:
          offer.raw_data,
      },

      updated_at:
        new Date().toISOString(),
    };

    let productOfferId:
      string;

    if (
      existingProductOffer
    ) {
      /*
       * مهم:
       * هنا في أول نسخة بنحدّث
       * بيانات المورد فقط.
       *
       * لاحقًا في المزامنة التلقائية
       * هنحافظ على الاسم العربي
       * والشروط والحقول اليدوية.
       */

      const {
        data:
          updatedProductOffer,
        error:
          updateProductOfferError,
      } = await supabase
        .from(
          "store_product_offers",
        )
        .update({
          product_id:
            mainProductId,

          provider_offer_id:
            providerOfferId,

          name_en:
            offer.name,

          supplier_price_usd:
            supplierPriceUsd,

          old_price_usd:
            safeOriginalPrice,

          stock:
            offer.stock,

          available:
            offer.available,

          provider_data:
            offerPayload.provider_data,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          existingProductOffer.id,
        )
        .select("id")
        .single<{
          id: string;
        }>();

      if (
        updateProductOfferError ||
        !updatedProductOffer
      ) {
        return {
          success: false,
          message:
            updateProductOfferError?.message ??
            "تعذر تحديث الباقة داخل المنتج.",
        };
      }

      productOfferId =
        updatedProductOffer.id;
    } else {
      const {
        data:
          createdProductOffer,
        error:
          createProductOfferError,
      } = await supabase
        .from(
          "store_product_offers",
        )
        .insert(
          offerPayload,
        )
        .select("id")
        .single<{
          id: string;
        }>();

      if (
        createProductOfferError ||
        !createdProductOffer
      ) {
        return {
          success: false,
          message:
            createProductOfferError?.message ??
            "تعذر إضافة الباقة داخل المنتج.",
        };
      }

      productOfferId =
        createdProductOffer.id;
    }

    /*
     * ==========================================
     * 6. ربط provider_offers
     * بالمنتج الرئيسي
     * ==========================================
     */

    const {
      error: linkOfferError,
    } = await supabase
      .from(
        "provider_offers",
      )
      .update({
        imported_to_store:
          true,

        /*
         * دلوقتي ده يشير للمنتج
         * الرئيسي وليس منتج باقة مستقل.
         */
        store_product_id:
          mainProductId,
      })
      .eq(
        "id",
        offer.id,
      );

    if (linkOfferError) {
      return {
        success: false,
        message:
          linkOfferError.message,
      };
    }

    /*
     * ==========================================
     * 7. Activity Log
     * ==========================================
     */

    await supabase
      .from("activity_logs")
      .insert({
        actor_id:
          adminId,

        action:
          existingProductOffer
            ? "provider_offer_updated_in_store"
            : "provider_offer_imported_to_store",

        entity_type:
          "store_product_offer",

        entity_id:
          productOfferId,

        description:
          `${offer.name} linked to ${categoryName}`,

        new_data: {
          product_id:
            mainProductId,

          provider_offer_id:
            providerOfferId,

          provider_category_id:
            offer.provider_category_id,

          supplier_price_usd:
            supplierPriceUsd,

          profit_usd:
            profitUsd,
        },
      });

    /*
     * ==========================================
     * 8. تحديث الصفحات
     * ==========================================
     */

    revalidatePath(
      "/admin/provider-offers",
    );

    revalidatePath(
      "/admin/products",
    );

    revalidatePath(
      "/products",
    );

    revalidatePath("/");

    return {
      success: true,

      message:
        existingProductOffer
          ? `تم تحديث باقة ${offer.name} داخل ${categoryName}.`
          : `تمت إضافة باقة ${offer.name} داخل ${categoryName} بنجاح.`,

      productId:
        mainProductId,

      productOfferId,
    };
  } catch (error) {
    console.error(
      "IMPORT PROVIDER OFFER ERROR:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع أثناء إضافة الباقة للمتجر.",
    };
  }
}

export async function importProviderCategoryOffersToStore({
  providerName,
  catalogType,
  providerCategoryId,
}: {
  providerName: string;
  catalogType: "topup" | "gc";
  providerCategoryId: string;
}): Promise<ImportOfferResult & { importedCount?: number; failedCount?: number }> {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase
      .from("provider_offers")
      .select("id, imported_to_store")
      .eq("provider_name", providerName)
      .eq("catalog_type", catalogType)
      .eq("provider_category_id", providerCategoryId)
      .eq("available", true)
      .order("created_at", { ascending: true })
      .returns<Array<{ id: string; imported_to_store: boolean }>>();

    if (error) throw error;
    const pendingOffers = (data ?? []).filter((offer) => !offer.imported_to_store);
    if (!pendingOffers.length) {
      return { success: true, message: "كل باقات هذه اللعبة مضافة بالفعل.", importedCount: 0, failedCount: 0 };
    }

    let importedCount = 0;
    const failures: string[] = [];
    let productId: string | undefined;
    for (const offer of pendingOffers) {
      const result = await importProviderOfferToStore(offer.id);
      if (result.success) {
        importedCount += 1;
        productId = result.productId ?? productId;
      } else {
        failures.push(result.message);
      }
    }

    revalidatePath("/admin/provider-offers");
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return {
      success: importedCount > 0 && failures.length === 0,
      message: failures.length
        ? `تمت إضافة ${importedCount} باقة، وتعذر إضافة ${failures.length}. أول خطأ: ${failures[0]}`
        : `تم إنشاء منتج واحد وإضافة ${importedCount} باقة تحته. عدّلي الصورة والبيانات المشتركة مرة واحدة من صفحة المنتج.`,
      productId,
      importedCount,
      failedCount: failures.length,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "تعذر استيراد باقات اللعبة.", importedCount: 0 };
  }
}
