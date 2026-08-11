"use server";

import { revalidatePath } from "next/cache";

import {
  getProviderOffers,
  getProviderProducts,
} from "@/lib/provider";
import type {
  ProviderCatalogType,
} from "@/lib/provider";
import { createClient } from "@/lib/supabase/server";

interface SyncCategoriesResult {
  success: boolean;
  message: string;

  found?: number;
  created?: number;
  updated?: number;

  syncRunId?: string;
}

interface SyncOffersResult {
  success: boolean;
  message: string;

  found?: number;
  created?: number;
  updated?: number;
  disabled?: number;

  syncRunId?: string;
}

interface ExistingCategoryRow {
  id: string;
  provider_category_id: string;
  name: string;
  provider_category: string | null;
  active: boolean;
}

interface ExistingOfferRow {
  id: string;
  provider_offer_id: string;
}

interface ProviderCategoryReference {
  id: string;
  provider_category_id: string;
  name: string;
}

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
    profile.status !== "active" ||
    !allowedRoles.includes(
      profile.role,
    )
  ) {
    throw new Error(
      "ليس لديك صلاحية لإدارة المورد.",
    );
  }

  return {
    supabase,
    adminId: user.id,
  };
}

function isValidCatalogType(
  value: string,
): value is ProviderCatalogType {
  return (
    value === "topup" ||
    value === "gc"
  );
}

function translateProviderError(
  message: string,
): string {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "provider_api_base",
    ) ||
    normalized.includes(
      "provider api base",
    )
  ) {
    return "رابط API المورد غير مضاف داخل ملف البيئة.";
  }

  if (
    normalized.includes(
      "provider_api_key",
    ) ||
    normalized.includes(
      "provider api key",
    )
  ) {
    return "مفتاح API المورد غير مضاف داخل ملف البيئة.";
  }

  if (
    normalized.includes(
      "unauthorized",
    ) ||
    normalized.includes("401")
  ) {
    return "مفتاح API غير صحيح أو غير مصرح به.";
  }

  if (
    normalized.includes(
      "failed to fetch",
    )
  ) {
    return "تعذر الاتصال بخادم المورد.";
  }

  if (
    normalized.includes(
      "duplicate key",
    )
  ) {
    return "توجد بيانات مكررة في قاعدة البيانات.";
  }

  return message;
}
function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object"
  ) {
    const value =
      error as {
        message?: unknown;
        details?: unknown;
        hint?: unknown;
        code?: unknown;
      };

    const parts = [
      value.message,
      value.details,
      value.hint,
      value.code,
    ].filter(
      (item): item is string =>
        typeof item === "string" &&
        item.trim().length > 0,
    );

    if (parts.length > 0) {
      return parts.join(" | ");
    }
  }

  return String(error);
}
async function failSyncRun(
  syncRunId: string | null,
  message: string,
  startedAt: number,
): Promise<void> {
  if (!syncRunId) {
    return;
  }

  try {
    const supabase =
      await createClient();

    await supabase
      .from("provider_sync_runs")
      .update({
        status: "failed",

        error_message:
          message,

        response_time_ms:
          Date.now() -
          startedAt,

        completed_at:
          new Date().toISOString(),
      })
      .eq("id", syncRunId);
  } catch {
    /*
     * لا نمنع ظهور الخطأ الأساسي
     * بسبب فشل تحديث سجل المزامنة.
     */
  }
}

/* =========================================================
   مزامنة أقسام المورد
========================================================= */

export async function syncProviderCategories(
  catalogType: ProviderCatalogType,
): Promise<SyncCategoriesResult> {
  const startedAt =
    Date.now();

  let syncRunId:
    | string
    | null = null;

  try {
    if (
      !isValidCatalogType(
        catalogType,
      )
    ) {
      return {
        success: false,
        message:
          "نوع الكتالوج غير صحيح.",
      };
    }

    const {
      supabase,
      adminId,
    } = await requireAdmin();

    const {
      data: syncRun,
      error: syncRunError,
    } = await supabase
      .from("provider_sync_runs")
      .insert({
        provider_name:
          "flexy",

        sync_type:
          "categories",

        catalog_type:
          catalogType,

        status:
          "running",

        started_by:
          adminId,
      })
      .select("id")
      .single<{
        id: string;
      }>();

    if (
      syncRunError ||
      !syncRun
    ) {
      throw (
        syncRunError ??
        new Error(
          "تعذر إنشاء سجل المزامنة.",
        )
      );
    }

    syncRunId =
      syncRun.id;

    const categories =
      await getProviderProducts(
        catalogType,
      );

    const {
      data: existingCategories,
      error: existingError,
    } = await supabase
      .from("provider_categories")
      .select(`
        id,
        provider_category_id,
        name,
        provider_category,
        active
      `)
      .eq(
        "provider_name",
        "flexy",
      )
      .eq(
        "catalog_type",
        catalogType,
      )
      .returns<
        ExistingCategoryRow[]
      >();

    if (existingError) {
      throw existingError;
    }

    const existingMap =
      new Map(
        (
          existingCategories ??
          []
        ).map(
          (category) => [
            category
              .provider_category_id,

            category,
          ],
        ),
      );

    const syncedIds =
      new Set<string>();

    let created = 0;
    let updated = 0;

    for (
      const category
      of categories
    ) {
      const providerCategoryId =
        String(
          category.id,
        ).trim();

      const categoryName =
        category.name.trim();

      if (
        !providerCategoryId ||
        !categoryName
      ) {
        continue;
      }

      syncedIds.add(
        providerCategoryId,
      );

      const existing =
        existingMap.get(
          providerCategoryId,
        );

      const now =
        new Date().toISOString();

      const payload = {
        provider_name:
          "flexy",

        catalog_type:
          catalogType,

        provider_category_id:
          providerCategoryId,

        name:
          categoryName,

        provider_category:
          category.category.trim() ||
          null,

        active:
          true,

        raw_data:
          category.rawData,

        last_synced_at:
          now,
      };

      if (existing) {
        const {
          error: updateError,
        } = await supabase
          .from(
            "provider_categories",
          )
          .update(payload)
          .eq(
            "id",
            existing.id,
          );

        if (updateError) {
          throw updateError;
        }

        updated += 1;
      } else {
        const {
          error: insertError,
        } = await supabase
          .from(
            "provider_categories",
          )
          .insert({
            ...payload,

            first_synced_at:
              now,
          });

        if (insertError) {
          throw insertError;
        }

        created += 1;
      }
    }

    /*
     * الفئات التي اختفت من المورد
     * تصبح غير نشطة بدل حذفها.
     */
    const missingIds =
      (
        existingCategories ??
        []
      )
        .filter(
          (category) =>
            !syncedIds.has(
              category
                .provider_category_id,
            ),
        )
        .map(
          (category) =>
            category.id,
        );

    if (
      missingIds.length > 0
    ) {
      const {
        error: disableError,
      } = await supabase
        .from(
          "provider_categories",
        )
        .update({
          active: false,

          last_synced_at:
            new Date().toISOString(),
        })
        .in(
          "id",
          missingIds,
        );

      if (disableError) {
        throw disableError;
      }
    }

    const responseTimeMs =
      Date.now() -
      startedAt;

    const {
      error: finishError,
    } = await supabase
      .from("provider_sync_runs")
      .update({
        status:
          "completed",

        categories_found:
          categories.length,

        categories_created:
          created,

        categories_updated:
          updated,

        response_time_ms:
          responseTimeMs,

        completed_at:
          new Date().toISOString(),

        metadata: {
          disabled_categories:
            missingIds.length,
        },
      })
      .eq(
        "id",
        syncRunId,
      );

    if (finishError) {
      console.error(
        "Failed to finish category sync log:",
        finishError,
      );
    }

    await supabase
      .from("activity_logs")
      .insert({
        actor_id:
          adminId,

        action:
          "provider_categories_synced",

        entity_type:
          "provider_sync_run",

        entity_id:
          syncRunId,

        description:
          `Admin synced Flexy ${catalogType} categories`,

        new_data: {
          catalog_type:
            catalogType,

          found:
            categories.length,

          created,

          updated,

          disabled:
            missingIds.length,

          response_time_ms:
            responseTimeMs,
        },
      });

    revalidatePath(
      "/admin/api-center",
    );

    revalidatePath(
      "/admin",
    );

    return {
      success: true,

      message:
        `تمت مزامنة ${categories.length.toLocaleString(
          "ar-EG",
        )} قسم بنجاح.`,

      found:
        categories.length,

      created,

      updated,

      syncRunId,
    };
  } catch (error) {
  console.error(
    "SYNC CATEGORY OFFERS ERROR:",
    error,
  );

  const rawMessage =
    getErrorMessage(error);

  const message =
    translateProviderError(
      rawMessage,
    );

    await failSyncRun(
      syncRunId,
      message,
      startedAt,
    );

    return {
      success: false,
      message,

      syncRunId:
        syncRunId ??
        undefined,
    };
  }
}

/* =========================================================
   مزامنة باقات قسم واحد
========================================================= */

export async function syncCategoryOffers(
  categoryId: string,
  catalogType: ProviderCatalogType,
): Promise<SyncOffersResult> {
  const startedAt =
    Date.now();

  let syncRunId:
    | string
    | null = null;

  try {
    const safeCategoryId =
      categoryId.trim();

    if (!safeCategoryId) {
      return {
        success: false,
        message:
          "معرّف القسم غير صحيح.",
      };
    }

    if (
      !isValidCatalogType(
        catalogType,
      )
    ) {
      return {
        success: false,
        message:
          "نوع الكتالوج غير صحيح.",
      };
    }

    const {
      supabase,
      adminId,
    } = await requireAdmin();

    const {
      data: category,
      error: categoryError,
    } = await supabase
      .from("provider_categories")
      .select(`
        id,
        provider_category_id,
        name
      `)
      .eq(
        "provider_name",
        "flexy",
      )
      .eq(
        "catalog_type",
        catalogType,
      )
      .eq(
        "provider_category_id",
        safeCategoryId,
      )
      .single<
        ProviderCategoryReference
      >();

    if (
      categoryError ||
      !category
    ) {
      return {
        success: false,

        message:
          "القسم غير موجود في قاعدة البيانات. زامني الأقسام أولًا.",
      };
    }

    const {
      data: syncRun,
      error: syncRunError,
    } = await supabase
      .from("provider_sync_runs")
      .insert({
        provider_name:
          "flexy",

        sync_type:
          "category_offers",

        catalog_type:
          catalogType,

        provider_category_id:
          safeCategoryId,

        status:
          "running",

        started_by:
          adminId,
      })
      .select("id")
      .single<{
        id: string;
      }>();

    if (
      syncRunError ||
      !syncRun
    ) {
      throw (
        syncRunError ??
        new Error(
          "تعذر إنشاء سجل المزامنة.",
        )
      );
    }

    syncRunId =
      syncRun.id;

    const offers =
      await getProviderOffers(
        safeCategoryId,
        catalogType,
      );
      /*
 * بعض أقسام المورد قد ترجع نفس
 * card_id أكثر من مرة داخل نفس الرد.
 * نحتفظ بآخر نسخة فقط قبل الحفظ.
 */
const uniqueOffers =
  Array.from(
    new Map(
      offers
        .filter((offer) => {
          const offerId =
            String(
              offer.cardId,
            ).trim();

          return (
            offerId.length > 0 &&
            offer.name.trim().length >
              0 &&
            Number.isFinite(
              Number(
                offer.price,
              ),
            )
          );
        })
        .map((offer) => [
          String(
            offer.cardId,
          ).trim(),

          offer,
        ]),
    ).values(),
  );

    const {
      data: existingOffers,
      error:
        existingOffersError,
    } = await supabase
      .from("provider_offers")
      .select(`
        id,
        provider_offer_id
      `)
      .eq(
        "provider_name",
        "flexy",
      )
      .eq(
        "catalog_type",
        catalogType,
      )
      .eq(
        "provider_category_id",
        safeCategoryId,
      )
      .returns<
        ExistingOfferRow[]
      >();

    if (
      existingOffersError
    ) {
      throw existingOffersError;
    }

    const existingMap =
      new Map(
        (
          existingOffers ??
          []
        ).map(
          (offer) => [
            offer
              .provider_offer_id,

            offer,
          ],
        ),
      );

    const syncedOfferIds =
      new Set<string>();

    let created = 0;
    let updated = 0;

    for (
  const offer
  of uniqueOffers
) {
      const offerId =
        String(
          offer.cardId,
        ).trim();

      const offerName =
        offer.name.trim();

      const offerPrice =
        Number(
          offer.price,
        );

      if (
        !offerId ||
        !offerName ||
        !Number.isFinite(
          offerPrice,
        ) ||
        offerPrice < 0
      ) {
        continue;
      }

      syncedOfferIds.add(
        offerId,
      );

      const existing =
        existingMap.get(
          offerId,
        );

      const now =
        new Date().toISOString();

      const safeStock =
        offer.stock === null
          ? null
          : Number(
              offer.stock,
            );

      const payload = {
        provider_name:
          "flexy",

        catalog_type:
          catalogType,

        provider_category_row_id:
          category.id,

        provider_category_id:
          safeCategoryId,

        provider_offer_id:
          offerId,

        name:
          offerName,

        price:
          offerPrice,

        original_price:
          Number.isFinite(
            Number(
              offer.originalPrice,
            ),
          )
            ? Number(
                offer.originalPrice,
              )
            : null,

        currency:
          offer.currency ||
          "USD",

        stock:
          safeStock !== null &&
          Number.isFinite(
            safeStock,
          )
            ? safeStock
            : null,

        available:
          safeStock === null
            ? true
            : safeStock > 0,

        raw_data:
          offer.rawData,

        last_synced_at:
          now,
      };

      if (existing) {
        const {
          error: updateError,
        } = await supabase
          .from(
            "provider_offers",
          )
          .update(payload)
          .eq(
            "id",
            existing.id,
          );

        if (updateError) {
          throw updateError;
        }

        updated += 1;
      } else {
  const {
    data: insertedOffer,
    error: insertError,
  } = await supabase
    .from(
      "provider_offers",
    )
    .insert({
      ...payload,

      first_synced_at:
        now,
    })
    .select(`
      id,
      provider_offer_id
    `)
    .single<ExistingOfferRow>();

  if (
    insertError ||
    !insertedOffer
  ) {
    throw (
      insertError ??
      new Error(
        "تعذر قراءة الباقة بعد إضافتها.",
      )
    );
  }

  existingMap.set(
    offerId,
    insertedOffer,
  );

  created += 1;
}
    }

    /*
     * الباقات التي اختفت من رد المورد
     * تصبح غير متاحة بدل حذفها.
     */
    const missingOfferIds =
      (
        existingOffers ??
        []
      )
        .filter(
          (offer) =>
            !syncedOfferIds.has(
              offer
                .provider_offer_id,
            ),
        )
        .map(
          (offer) =>
            offer.id,
        );

    if (
      missingOfferIds.length >
      0
    ) {
      const {
        error: disableError,
      } = await supabase
        .from(
          "provider_offers",
        )
        .update({
          available:
            false,

          last_synced_at:
            new Date().toISOString(),
        })
        .in(
          "id",
          missingOfferIds,
        );

      if (disableError) {
        throw disableError;
      }
    }

    const {
      error:
        categoryUpdateError,
    } = await supabase
      .from(
        "provider_categories",
      )
      .update({
        offers_count:
          uniqueOffers.length,

        last_synced_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        category.id,
      );

    if (
      categoryUpdateError
    ) {
      throw categoryUpdateError;
    }

    const responseTimeMs =
      Date.now() -
      startedAt;

    const {
      error: finishError,
    } = await supabase
      .from("provider_sync_runs")
      .update({
        status:
          "completed",

        offers_found:
          uniqueOffers.length,

        offers_created:
          created,

        offers_updated:
          updated,

        offers_disabled:
          missingOfferIds.length,

        response_time_ms:
          responseTimeMs,

        completed_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        syncRunId,
      );

    if (finishError) {
      console.error(
        "Failed to finish offers sync log:",
        finishError,
      );
    }

    await supabase
      .from("activity_logs")
      .insert({
        actor_id:
          adminId,

        action:
          "provider_category_offers_synced",

        entity_type:
          "provider_category",

        entity_id:
          category.id,

        description:
          `Admin synced Flexy offers for ${category.name}`,

        new_data: {
          catalog_type:
            catalogType,

          provider_category_id:
            safeCategoryId,

          found:
            uniqueOffers.length,

          created,

          updated,

          disabled:
            missingOfferIds.length,

          response_time_ms:
            responseTimeMs,
        },
      });

    revalidatePath(
      "/admin/api-center",
    );

    revalidatePath(
      "/admin/products",
    );

    return {
      success: true,

      message:
        `تمت مزامنة ${uniqueOffers.length.toLocaleString(
          "ar-EG",
        )} باقة من قسم ${category.name}.`,

      found:
        uniqueOffers.length,

      created,

      updated,

      disabled:
        missingOfferIds.length,

      syncRunId,
    };
  } catch (error) {
    console.error(
  "SYNC CATEGORY OFFERS ERROR:",
  error,
);

const rawMessage =
  getErrorMessage(error);

const message =
  translateProviderError(
    rawMessage,
  );

    await failSyncRun(
      syncRunId,
      message,
      startedAt,
    );

    return {
      success: false,
      message,

      syncRunId:
        syncRunId ??
        undefined,
    };
  }
}