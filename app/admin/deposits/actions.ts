"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type {
  AdminDeposit,
  DepositStatus,
} from "@/types/adminDeposit";

interface DepositRelation {
  customer_id: string;
  full_name: string | null;
  email: string | null;
}

interface PaymentMethodRelation {
  name: string;
  network: string | null;
  address: string;
}

interface RawDeposit {
  id: string;
  deposit_id: string;
  user_id: string;

  payment_method_id: string;
  status: DepositStatus;

  requested_currency: "EGP" | "USD";
  requested_amount: number | string;
  fee_amount: number | string;
  total_to_transfer: number | string;
  credit_usd: number | string;
  usd_to_egp_rate: number | string;

  sender_account: string | null;
  transaction_reference: string | null;
  proof_path: string | null;

  customer_note: string | null;
  admin_note: string | null;
  rejection_reason: string | null;

  reviewed_at: string | null;
  created_at: string;
  updated_at: string;

  profiles:
    | DepositRelation
    | DepositRelation[]
    | null;

  payment_methods:
    | PaymentMethodRelation
    | PaymentMethodRelation[]
    | null;
}

export interface DepositActionResult {
  success: boolean;
  message: string;
}

function getRelation<T>(
  relation: T | T[] | null,
): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

async function verifyAdmin(): Promise<{
  supabase: Awaited<
    ReturnType<typeof createClient>
  >;
  userId: string;
}> {
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
      "ليس لديك صلاحية تنفيذ هذه العملية.",
    );
  }

  return {
    supabase,
    userId: user.id,
  };
}

export async function getDeposits(): Promise<
  AdminDeposit[]
> {
  const { supabase } =
    await verifyAdmin();

  const { data, error } = await supabase
    .from("deposit_requests")
    .select(`
      id,
      deposit_id,
      user_id,
      payment_method_id,
      status,
      requested_currency,
      requested_amount,
      fee_amount,
      total_to_transfer,
      credit_usd,
      usd_to_egp_rate,
      sender_account,
      transaction_reference,
      proof_path,
      customer_note,
      admin_note,
      rejection_reason,
      reviewed_at,
      created_at,
      updated_at,
      profiles(
        customer_id,
        full_name,
        email
      ),
      payment_methods(
        name,
        network,
        address
      )
    `)
    .order("created_at", {
      ascending: false,
    })
    .returns<RawDeposit[]>();

  if (error) {
    throw new Error(error.message);
  }

  return Promise.all(
    (data ?? []).map(
      async (
        deposit,
      ): Promise<AdminDeposit> => {
        const profile = getRelation(
          deposit.profiles,
        );

        const method = getRelation(
          deposit.payment_methods,
        );

        let proofUrl: string | null =
          null;

        if (deposit.proof_path) {
          const {
            data: signedData,
            error: signedError,
          } = await supabase.storage
            .from("deposit-proofs")
            .createSignedUrl(
              deposit.proof_path,
              60 * 30,
            );

          if (!signedError) {
            proofUrl =
              signedData.signedUrl;
          }
        }

        return {
          id: deposit.id,
          deposit_id: deposit.deposit_id,
          user_id: deposit.user_id,

          customer_id:
            profile?.customer_id ??
            "غير متوفر",

          customer_name:
            profile?.full_name ?? null,

          customer_email:
            profile?.email ?? null,

          payment_method_id:
            deposit.payment_method_id,

          payment_method_name:
            method?.name ??
            deposit.payment_method_id,

          payment_network:
            method?.network ?? null,

          payment_address:
            method?.address ?? "",

          requested_currency:
            deposit.requested_currency,

          requested_amount: Number(
            deposit.requested_amount,
          ),

          fee_amount: Number(
            deposit.fee_amount,
          ),

          total_to_transfer: Number(
            deposit.total_to_transfer,
          ),

          credit_usd: Number(
            deposit.credit_usd,
          ),

          usd_to_egp_rate: Number(
            deposit.usd_to_egp_rate,
          ),

          sender_account:
            deposit.sender_account,

          transaction_reference:
            deposit.transaction_reference,

          proof_path:
            deposit.proof_path,

          proof_url: proofUrl,

          customer_note:
            deposit.customer_note,

          admin_note:
            deposit.admin_note,

          rejection_reason:
            deposit.rejection_reason,

          status: deposit.status,

          reviewed_at:
            deposit.reviewed_at,

          created_at:
            deposit.created_at,

          updated_at:
            deposit.updated_at,
        };
      },
    ),
  );
}

export async function markDepositUnderReview(
  depositId: string,
): Promise<DepositActionResult> {
  try {
    const { supabase } =
      await verifyAdmin();

    const { error } = await supabase.rpc(
      "review_deposit_request",
      {
        p_deposit_request_id:
          depositId,
      },
    );

    if (error) {
      throw error;
    }

    revalidatePath("/admin");
    revalidatePath("/admin/deposits");
    revalidatePath("/orders");

    return {
      success: true,
      message:
        "تم نقل الطلب إلى قيد المراجعة.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "تعذر تحديث الطلب.",
    };
  }
}

export async function approveDeposit(
  depositId: string,
  adminNote: string,
): Promise<DepositActionResult> {
  try {
    const { supabase } =
      await verifyAdmin();

    const { error } = await supabase.rpc(
      "approve_deposit_request",
      {
        p_deposit_request_id:
          depositId,

        p_admin_note:
          adminNote.trim() || null,
      },
    );

    if (error) {
      throw error;
    }

    revalidatePath("/admin");
    revalidatePath("/admin/deposits");
    revalidatePath("/account");
    revalidatePath("/wallet");
    revalidatePath("/orders");
    revalidatePath("/notifications");

    return {
      success: true,
      message:
        "تم اعتماد الطلب وإضافة الرصيد بنجاح.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "تعذر اعتماد طلب الإيداع.",
    };
  }
}

export async function rejectDeposit(
  depositId: string,
  rejectionReason: string,
  adminNote: string,
): Promise<DepositActionResult> {
  if (
    rejectionReason.trim().length < 3
  ) {
    return {
      success: false,
      message:
        "اكتبي سبب رفض واضحًا.",
    };
  }

  try {
    const { supabase } =
      await verifyAdmin();

    const { error } = await supabase.rpc(
      "reject_deposit_request",
      {
        p_deposit_request_id:
          depositId,

        p_rejection_reason:
          rejectionReason.trim(),

        p_admin_note:
          adminNote.trim() || null,
      },
    );

    if (error) {
      throw error;
    }

    revalidatePath("/admin");
    revalidatePath("/admin/deposits");
    revalidatePath("/orders");
    revalidatePath("/notifications");

    return {
      success: true,
      message:
        "تم رفض الطلب وإرسال السبب للعميل.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "تعذر رفض طلب الإيداع.",
    };
  }
}