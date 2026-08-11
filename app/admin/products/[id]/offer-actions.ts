"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  createClient,
} from "@/lib/supabase/server";

import type {
  ProductRequiredField,
} from "@/types/product";

interface UpdateProductOfferInput {
  offerId: string;
  productId: string;

  nameAr: string;
  nameEn?: string | null;

  profitUsd: number;

  oldPriceUsd?:
    | number
    | null;

  active: boolean;

  sortOrder: number;

  instructionsAr?:
    | string
    | null;

  customerNoteAr?:
    | string
    | null;

  requiredFields:
    ProductRequiredField[];
}

interface ProductOfferActionResult {
  success: boolean;
  message: string;
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
    error,
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
    error ||
    !profile ||
    profile.status !== "active" ||
    ![
      "admin",
      "super_admin",
      "owner",
    ].includes(
      profile.role,
    )
  ) {
    throw new Error(
      "ليس لديك صلاحية لتعديل الباقات.",
    );
  }

  return {
    supabase,
    adminId:
      user.id,
  };
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

function normalizeRequiredFields(
  fields:
    ProductRequiredField[],
): ProductRequiredField[] {
  return fields.map(
    (field) => ({
      id:
        field.id.trim(),

      label:
        field.label.trim(),

      placeholder:
        field.placeholder?.trim() ??
        "",

      type:
        field.type,

      required:
        Boolean(
          field.required,
        ),

      helperText:
        cleanText(
          field.helperText,
        ) ??
        undefined,

      pattern:
        cleanText(
          field.pattern,
        ) ??
        undefined,

      patternMessage:
        cleanText(
          field.patternMessage,
        ) ??
        undefined,
    }),
  );
}

function validateRequiredFields(
  fields:
    ProductRequiredField[],
): string | null {
  const ids =
    new Set<string>();

  for (
    const field
    of fields
  ) {
    const id =
      field.id.trim();

    const label =
      field.label.trim();

    if (!id) {
      return "يوجد حقل بدون ID.";
    }

    if (!label) {
      return `الحقل ${id} لا يحتوي على اسم.`;
    }

    if (
      ids.has(id)
    ) {
      return `معرّف الحقل ${id} مكرر.`;
    }

    ids.add(id);
  }

  return null;
}

export async function updateProductOffer(
  input:
    UpdateProductOfferInput,
): Promise<ProductOfferActionResult> {
  try {
    if (
      !input.offerId.trim() ||
      !input.productId.trim()
    ) {
      return {
        success: false,
        message:
          "معرّف الباقة غير صحيح.",
      };
    }

    if (
      !input.nameAr.trim()
    ) {
      return {
        success: false,
        message:
          "اكتبي اسم الباقة.",
      };
    }

    if (
      !Number.isFinite(
        input.profitUsd,
      ) ||
      input.profitUsd < 0
    ) {
      return {
        success: false,
        message:
          "قيمة الربح غير صحيحة.",
      };
    }

    if (
      input.oldPriceUsd !==
        null &&
      input.oldPriceUsd !==
        undefined &&
      (
        !Number.isFinite(
          input.oldPriceUsd,
        ) ||
        input.oldPriceUsd < 0
      )
    ) {
      return {
        success: false,
        message:
          "السعر القديم غير صحيح.",
      };
    }

    if (
      !Number.isInteger(
        input.sortOrder,
      )
    ) {
      return {
        success: false,
        message:
          "الترتيب غير صحيح.",
      };
    }

    const fieldsError =
      validateRequiredFields(
        input.requiredFields,
      );

    if (
      fieldsError
    ) {
      return {
        success: false,
        message:
          fieldsError,
      };
    }

    const {
      supabase,
      adminId,
    } =
      await requireAdmin();

    const {
      data: offer,
      error,
    } = await supabase
      .from(
        "store_product_offers",
      )
      .update({
        name_ar:
          input.nameAr.trim(),

        name_en:
          cleanText(
            input.nameEn,
          ),

        profit_usd:
          Number(
            input.profitUsd,
          ),

        old_price_usd:
          input.oldPriceUsd ??
          null,

        active:
          Boolean(
            input.active,
          ),

        sort_order:
          Math.floor(
            input.sortOrder,
          ),

        instructions_ar:
          cleanText(
            input.instructionsAr,
          ),

        customer_note_ar:
          cleanText(
            input.customerNoteAr,
          ),

        required_fields:
          normalizeRequiredFields(
            input.requiredFields,
          ),

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        input.offerId,
      )
      .eq(
        "product_id",
        input.productId,
      )
      .select(`
        id,
        name_ar
      `)
      .single<{
        id: string;
        name_ar: string;
      }>();

    if (
      error ||
      !offer
    ) {
      return {
        success: false,
        message:
          error?.message ??
          "تعذر تحديث الباقة.",
      };
    }

    await supabase
      .from(
        "activity_logs",
      )
      .insert({
        actor_id:
          adminId,

        action:
          "store_product_offer_updated",

        entity_type:
          "store_product_offer",

        entity_id:
          offer.id,

        description:
          `Admin updated offer ${offer.name_ar}`,
      });

    revalidatePath(
      `/admin/products/${input.productId}`,
    );

    revalidatePath(
      "/admin/products",
    );

    revalidatePath(
      "/products",
    );

    revalidatePath(
      "/",
    );

    return {
      success: true,
      message:
        "تم تحديث الباقة بنجاح.",
    };
  } catch (error) {
    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "تعذر تحديث الباقة.",
    };
  }
}

export async function deleteProductOffer({productId,offerId}:{productId:string;offerId:string}):Promise<ProductOfferActionResult>{
  try{const{supabase,adminId}=await requireAdmin();const{data:offer,error}=await supabase.from("store_product_offers").select("id,name_ar,provider_offer_row_id").eq("id",offerId).eq("product_id",productId).single<{id:string;name_ar:string;provider_offer_row_id:string|null}>();if(error||!offer)throw error??new Error("الباقة غير موجودة.");
    const{count,error:countError}=await supabase.from("product_order_items").select("id",{head:true,count:"exact"}).eq("offer_id",offerId);if(countError)throw countError;
    if((count??0)>0){const{error:hideError}=await supabase.from("store_product_offers").update({active:false,available:false,updated_at:new Date().toISOString()}).eq("id",offerId);if(hideError)throw hideError;await supabase.from("activity_logs").insert({actor_id:adminId,action:"store_product_offer_archived",entity_type:"store_product_offer",entity_id:offerId,description:`Admin archived offer ${offer.name_ar} because it has order history`});}
    else{if(offer.provider_offer_row_id){const{error:unlinkError}=await supabase.from("provider_offers").update({imported_to_store:false,store_product_id:null}).eq("id",offer.provider_offer_row_id);if(unlinkError)throw unlinkError}const{error:deleteError}=await supabase.from("store_product_offers").delete().eq("id",offerId);if(deleteError)throw deleteError;await supabase.from("activity_logs").insert({actor_id:adminId,action:"store_product_offer_deleted",entity_type:"store_product",entity_id:productId,description:`Admin deleted offer ${offer.name_ar}`,new_data:{deleted_offer_id:offerId}})}
    revalidatePath(`/admin/products/${productId}`);revalidatePath("/admin/provider-offers");revalidatePath("/products");revalidatePath("/");return{success:true,message:(count??0)>0?"الباقة مرتبطة بطلبات قديمة، لذلك تم إخفاؤها نهائيًا عن العملاء.":"تم حذف الباقة وإلغاء ربطها من المورد."};
  }catch(error){return{success:false,message:error instanceof Error?error.message:"تعذر حذف الباقة."}}
}
