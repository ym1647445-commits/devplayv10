"use server";

import { revalidatePath } from "next/cache";

import { loadGameAccountProducts } from "@/lib/game-accounts/catalog";
import { createClient } from "@/lib/supabase/server";

import type { GameAccountActionResult, GameAccountMutationInput, SavedGameAccount } from "./types";

interface SavedGameAccountRow {
  id: string;
  product_id: string;
  nickname: string;
  identifiers: Record<string, string>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const nicknamePattern = /^[^<>\u0000-\u001f\u007f]{2,40}$/u;

async function authenticatedContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, user };
}

function validateIdentifiers(
  input: Record<string, string>,
  fields: Awaited<ReturnType<typeof loadGameAccountProducts>>[number]["fields"],
): { identifiers?: Record<string, string>; message?: string } {
  const identifiers: Record<string, string> = {};

  for (const field of fields) {
    const value = String(input[field.id] ?? "").trim();
    if (field.required && !value) return { message: `برجاء إدخال ${field.label}.` };
    if (!value) continue;
    if (value.length > 160) return { message: `${field.label} أطول من المسموح.` };
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return { message: `قيمة ${field.label} ليست بريدًا صحيحًا.` };
    }
    if (field.type === "url") {
      try { new URL(value); } catch { return { message: `قيمة ${field.label} ليست رابطًا صحيحًا.` }; }
    }
    if (field.pattern) {
      try {
        if (!new RegExp(field.pattern).test(value)) {
          return { message: field.patternMessage ?? `قيمة ${field.label} غير صحيحة.` };
        }
      } catch {
        // Invalid admin patterns are ignored, matching the recharge form behavior.
      }
    }
    identifiers[field.id] = value;
  }

  if (Object.keys(identifiers).length === 0) return { message: "أدخل بيانات حساب اللعبة." };
  return { identifiers };
}

export async function saveGameAccount(input: GameAccountMutationInput): Promise<GameAccountActionResult> {
  const context = await authenticatedContext();
  if (!context) return { success: false, message: "يجب تسجيل الدخول أولًا." };

  const nickname = input.nickname.trim().replace(/\s+/g, " ");
  if (!nicknamePattern.test(nickname)) {
    return { success: false, message: "اسم الحساب يجب أن يكون بين حرفين و40 حرفًا وبدون رموز غير صالحة." };
  }

  let productId = input.productId;
  if (input.accountId) {
    const { data: existing, error } = await context.supabase
      .from("saved_game_accounts")
      .select("product_id")
      .eq("id", input.accountId)
      .eq("user_id", context.user.id)
      .maybeSingle<{ product_id: string }>();
    if (error || !existing) return { success: false, message: "الحساب المحفوظ غير موجود أو لا تملكه." };
    productId = existing.product_id;
  }

  let products;
  try {
    products = await loadGameAccountProducts(context.supabase, productId);
  } catch {
    return { success: false, message: "تعذر قراءة إعدادات الألعاب حاليًا." };
  }
  const product = products.find((item) => item.id === productId);
  if (!product) return { success: false, message: "هذه اللعبة غير متاحة لحفظ بيانات حساب حاليًا." };

  const validated = validateIdentifiers(input.identifiers, product.fields);
  if (!validated.identifiers) return { success: false, message: validated.message ?? "راجع بيانات الحساب." };

  const payload = { nickname, identifiers: validated.identifiers, updated_at: new Date().toISOString() };
  const result = input.accountId
    ? await context.supabase.from("saved_game_accounts").update(payload, { count: "exact" }).eq("id", input.accountId).eq("user_id", context.user.id).select("id, product_id, nickname, identifiers, is_default, created_at, updated_at").maybeSingle<SavedGameAccountRow>()
    : await context.supabase.from("saved_game_accounts").insert({
        ...payload,
        user_id: context.user.id,
        product_id: product.id,
      }).select("id, product_id, nickname, identifiers, is_default, created_at, updated_at").single<SavedGameAccountRow>();

  if (result.error) {
    if (result.error.code === "23505") return { success: false, message: "نفس بيانات الحساب محفوظة لهذه اللعبة بالفعل." };
    if (result.error.message.includes("saved_game_accounts")) {
      return { success: false, message: "شغّلي Migration حسابات ألعابي في Supabase أولًا." };
    }
    return { success: false, message: "تعذر حفظ الحساب. حاولي مرة أخرى." };
  }

  if (input.accountId && !result.count) return { success: false, message: "الحساب المحفوظ غير موجود أو لا تملكه." };

  revalidatePath("/account/game-accounts");
  const row = result.data;
  const account: SavedGameAccount | undefined = row ? {
    id: row.id, productId: row.product_id, nickname: row.nickname, identifiers: row.identifiers,
    isDefault: row.is_default, createdAt: row.created_at, updatedAt: row.updated_at,
  } : undefined;
  return { success: true, message: input.accountId ? "تم تحديث الحساب المحفوظ." : "تم حفظ حساب اللعبة بنجاح.", account };
}

export async function deleteGameAccount(accountId: string): Promise<GameAccountActionResult> {
  const context = await authenticatedContext();
  if (!context) return { success: false, message: "يجب تسجيل الدخول أولًا." };
  if (!/^[0-9a-f-]{36}$/i.test(accountId)) return { success: false, message: "معرّف الحساب غير صحيح." };

  const { error, count } = await context.supabase
    .from("saved_game_accounts")
    .delete({ count: "exact" })
    .eq("id", accountId)
    .eq("user_id", context.user.id);

  if (error) return { success: false, message: "تعذر حذف الحساب المحفوظ." };
  if (!count) return { success: false, message: "الحساب المحفوظ غير موجود أو لا تملكه." };

  revalidatePath("/account/game-accounts");
  return { success: true, message: "تم حذف الحساب المحفوظ فقط." };
}
