"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type {
  CouponActionResult,
  CreateCouponInput,
} from "@/types/adminCoupon";

interface AdminContext {
  supabase: Awaited<
    ReturnType<typeof createClient>
  >;

  userId: string;
}

async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient();

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
    .select("role, status")
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
    !allowedRoles.includes(profile.role)
  ) {
    throw new Error(
      "ليس لديك صلاحية لإدارة الكوبونات.",
    );
  }

  return {
    supabase,
    userId: user.id,
  };
}

function normalizeCode(
  value: string,
): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function validateInput(
  input: CreateCouponInput,
): string | null {
  const code = normalizeCode(
    input.code,
  );

  if (code.length < 3) {
    return "كود الكوبون يجب أن يكون 3 أحرف على الأقل.";
  }

  if (
    !/^[A-Z0-9_-]+$/.test(code)
  ) {
    return "الكود يسمح بالحروف الإنجليزية والأرقام والشرطة فقط.";
  }

  if (!input.title.trim()) {
    return "اكتبي اسم الكوبون.";
  }

  if (
    !Number.isFinite(input.value) ||
    input.value <= 0
  ) {
    return "قيمة الخصم غير صحيحة.";
  }

  if (
    input.type === "percentage" &&
    input.value > 100
  ) {
    return "نسبة الخصم لا يمكن أن تتجاوز 100%.";
  }

  if (input.minimumCartAmount < 0) {
    return "الحد الأدنى للسلة غير صحيح.";
  }

  if (
    input.maximumDiscount !== null &&
    input.maximumDiscount <= 0
  ) {
    return "أقصى خصم يجب أن يكون أكبر من صفر.";
  }

  if (
    input.usageLimit !== null &&
    input.usageLimit < 1
  ) {
    return "عدد الاستخدامات يجب أن يكون واحدًا على الأقل.";
  }

  if (input.perUserLimit < 1) {
    return "حد استخدام العميل يجب أن يكون واحدًا على الأقل.";
  }

  if (input.minimumItemsCount < 0) {
    return "أقل عدد منتجات غير صحيح.";
  }

  const startsAt = new Date(
    input.startsAt,
  );

  if (
    Number.isNaN(
      startsAt.getTime(),
    )
  ) {
    return "تاريخ بداية الكوبون غير صحيح.";
  }

  if (input.expiresAt) {
    const expiresAt = new Date(
      input.expiresAt,
    );

    if (
      Number.isNaN(
        expiresAt.getTime(),
      )
    ) {
      return "تاريخ انتهاء الكوبون غير صحيح.";
    }

    if (
      expiresAt.getTime() <=
      startsAt.getTime()
    ) {
      return "تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية.";
    }
  }

  if (
    input.audienceType ===
      "specific_users" &&
    input.selectedUserIds.length === 0
  ) {
    return "اختاري عميلًا واحدًا على الأقل.";
  }

  if (
    input.audienceType ===
      "selected_levels" &&
    input.selectedLevels.length === 0
  ) {
    return "اختاري مستوى واحدًا على الأقل.";
  }

  if (
    input.applicationScope ===
      "products" &&
    input.selectedProductIds.length === 0
  ) {
    return "اختاري منتجًا واحدًا على الأقل.";
  }

  if (
    input.applicationScope ===
      "categories" &&
    input.selectedCategoryIds.length === 0
  ) {
    return "اختاري قسمًا واحدًا على الأقل.";
  }

  return null;
}

export async function createCoupon(
  input: CreateCouponInput,
): Promise<CouponActionResult> {
  try {
    const validationError =
      validateInput(input);

    if (validationError) {
      return {
        success: false,
        message: validationError,
      };
    }

    const {
      supabase,
      userId,
    } = await requireAdmin();

    const code = normalizeCode(
      input.code,
    );

    const {
      data: existingCoupon,
      error: existingError,
    } = await supabase
      .from("checkout_coupons")
      .select("id")
      .eq("code", code)
      .maybeSingle<{
        id: string;
      }>();

    if (existingError) {
      throw existingError;
    }

    if (existingCoupon) {
      return {
        success: false,
        message:
          "يوجد كوبون بنفس الكود بالفعل.",
      };
    }

    const now =
      new Date().toISOString();

    const {
      data: coupon,
      error: couponError,
    } = await supabase
      .from("checkout_coupons")
      .insert({
        code,

        title:
          input.title.trim(),

        description:
          input.description?.trim() ||
          null,

        type: input.type,
        value: input.value,
        currency: input.currency,

        minimum_cart_amount:
          input.minimumCartAmount,

        maximum_discount:
          input.maximumDiscount,

        usage_limit:
          input.usageLimit,

        usage_count: 0,

        per_user_limit:
          input.perUserLimit,

        minimum_items_count:
          input.minimumItemsCount,

        first_order_only:
          input.firstOrderOnly,

        auto_apply:
          input.autoApply,

        stackable:
          input.stackable,

        audience_type:
          input.audienceType,

        application_scope:
          input.applicationScope,

        visibility:
          input.visibility,

        notification_mode:
          input.notificationMode,

        selected_levels:
          input.selectedLevels,

        notify_on_publish:
          input.notifyOnPublish,

        published_at:
          input.active
            ? now
            : null,

        starts_at:
          new Date(
            input.startsAt,
          ).toISOString(),

        expires_at:
          input.expiresAt
            ? new Date(
                input.expiresAt,
              ).toISOString()
            : null,

        active: input.active,

        internal_note:
          input.internalNote?.trim() ||
          null,

        created_by: userId,
        updated_by: userId,
      })
      .select("id")
      .single<{
        id: string;
      }>();

    if (couponError || !coupon) {
      throw (
        couponError ??
        new Error(
          "تعذر إنشاء الكوبون.",
        )
      );
    }

    if (
      input.audienceType ===
        "specific_users" &&
      input.selectedUserIds.length > 0
    ) {
      const { error } = await supabase
        .from(
          "checkout_coupon_users",
        )
        .insert(
          input.selectedUserIds.map(
            (selectedUserId) => ({
              coupon_id: coupon.id,
              user_id: selectedUserId,
              assigned_by: userId,
            }),
          ),
        );

      if (error) {
        await supabase
          .from("checkout_coupons")
          .delete()
          .eq("id", coupon.id);

        throw error;
      }
    }

    if (
      input.applicationScope ===
        "products" &&
      input.selectedProductIds.length > 0
    ) {
      const { error } = await supabase
        .from(
          "checkout_coupon_products",
        )
        .insert(
          input.selectedProductIds.map(
            (productId) => ({
              coupon_id: coupon.id,
              product_id: productId,
            }),
          ),
        );

      if (error) {
        await supabase
          .from("checkout_coupons")
          .delete()
          .eq("id", coupon.id);

        throw error;
      }
    }

    if (
      input.applicationScope ===
        "categories" &&
      input.selectedCategoryIds.length >
        0
    ) {
      const { error } = await supabase
        .from(
          "checkout_coupon_categories",
        )
        .insert(
          input.selectedCategoryIds.map(
            (categoryId) => ({
              coupon_id: coupon.id,
              category_id:
                categoryId,
            }),
          ),
        );

      if (error) {
        await supabase
          .from("checkout_coupons")
          .delete()
          .eq("id", coupon.id);

        throw error;
      }
    }

    if (
      input.active &&
      input.notifyOnPublish &&
      input.notificationMode !==
        "none"
    ) {
      let targetUserIds:
        | string[] = [];

      if (
        input.audienceType ===
        "specific_users"
      ) {
        targetUserIds =
          input.selectedUserIds;
      } else {
        let profilesQuery =
          supabase
            .from("profiles")
            .select(
              "id, customer_level",
            )
            .eq("status", "active");

        if (
          input.audienceType ===
          "selected_levels"
        ) {
          profilesQuery =
            profilesQuery.in(
              "customer_level",
              input.selectedLevels,
            );
        }

        if (
          input.audienceType ===
          "new_users"
        ) {
          const thirtyDaysAgo =
            new Date();

          thirtyDaysAgo.setDate(
            thirtyDaysAgo.getDate() -
              30,
          );

          profilesQuery =
            profilesQuery.gte(
              "created_at",
              thirtyDaysAgo.toISOString(),
            );
        }

        const {
          data: targetProfiles,
          error: targetError,
        } = await profilesQuery;

        if (targetError) {
          throw targetError;
        }

        targetUserIds =
          (
            targetProfiles ?? []
          ).map(
            (profile) =>
              profile.id,
          );
      }

      if (targetUserIds.length > 0) {
        const discountText =
          input.type === "percentage"
            ? `${input.value}%`
            : input.currency === "USD"
              ? `$${input.value}`
              : `${input.value} ج.م`;

        const {
          error: notificationError,
        } = await supabase
          .from("notifications")
          .insert(
            targetUserIds.map(
              (targetUserId) => ({
                user_id:
                  targetUserId,

                type:
                  "coupon_published",

                title:
                  "كوبون جديد ليك 🎁",

                message:
                  `استخدمي الكود ${code} واحصلي على خصم ${discountText}.`,

                entity_type:
                  "coupon",

                entity_id:
                  coupon.id,

                action_url:
                  "/coupons",
              }),
            ),
          );

        if (notificationError) {
          console.error(
            "Failed to create coupon notifications:",
            notificationError,
          );
        }
      }
    }

    await supabase
      .from("activity_logs")
      .insert({
        user_id: userId,
        actor_id: userId,
        action:
          "coupon_created",
        entity_type: "coupon",
        entity_id: coupon.id,
        description:
          `Admin created coupon ${code}`,
        new_data: {
          code,
          value: input.value,
          type: input.type,
          audience_type:
            input.audienceType,
          active: input.active,
        },
      });

    revalidatePath(
      "/admin/coupons",
    );

    revalidatePath("/coupons");

    revalidatePath(
      "/notifications",
    );

    return {
      success: true,
      message:
        "تم إنشاء الكوبون بنجاح.",
      couponId: coupon.id,
    };
  } catch (error) {
    console.error(
      "Create coupon error:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "تعذر إنشاء الكوبون.",
    };
  }
}

export async function toggleCouponStatus(
  couponId: string,
  active: boolean,
): Promise<CouponActionResult> {
  try {
    const {
      supabase,
      userId,
    } = await requireAdmin();

    const updates: {
      active: boolean;
      updated_by: string;
      updated_at: string;
      published_at?: string;
    } = {
      active,
      updated_by: userId,
      updated_at:
        new Date().toISOString(),
    };

    if (active) {
      updates.published_at =
        new Date().toISOString();
    }

    const { error } = await supabase
      .from("checkout_coupons")
      .update(updates)
      .eq("id", couponId);

    if (error) {
      throw error;
    }

    await supabase
      .from("activity_logs")
      .insert({
        user_id: userId,
        actor_id: userId,

        action: active
          ? "coupon_activated"
          : "coupon_deactivated",

        entity_type: "coupon",
        entity_id: couponId,

        description: active
          ? "Admin activated coupon"
          : "Admin deactivated coupon",
      });

    revalidatePath(
      "/admin/coupons",
    );

    revalidatePath("/coupons");

    return {
      success: true,

      message: active
        ? "تم تفعيل الكوبون."
        : "تم إيقاف الكوبون.",
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "تعذر تحديث الكوبون.",
    };
  }
}

export async function deleteCoupon(
  couponId: string,
): Promise<CouponActionResult> {
  try {
    const {
      supabase,
      userId,
    } = await requireAdmin();

    const {
      count: usageCount,
      error: usageError,
    } = await supabase
      .from(
        "checkout_coupon_usage",
      )
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("coupon_id", couponId);

    if (usageError) {
      throw usageError;
    }

    if ((usageCount ?? 0) > 0) {
      const { error } = await supabase
        .from("checkout_coupons")
        .update({
          active: false,
          updated_by: userId,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", couponId);

      if (error) {
        throw error;
      }

      return {
        success: true,
        message:
          "الكوبون مستخدم في طلبات سابقة، لذلك تم إيقافه بدل حذفه.",
      };
    }

    const { error } = await supabase
      .from("checkout_coupons")
      .delete()
      .eq("id", couponId);

    if (error) {
      throw error;
    }

    revalidatePath(
      "/admin/coupons",
    );

    revalidatePath("/coupons");

    return {
      success: true,
      message:
        "تم حذف الكوبون.",
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "تعذر حذف الكوبون.",
    };
  }
}