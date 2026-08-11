"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ManualOrderInput {
  userId: string;
  productId: string;
  offerId: string;
  quantity: number;
  inputValues: Record<string, string>;
  paymentMode: "wallet" | "complimentary";
  fulfillmentMode: "supplier" | "manual";
  adminNote: string;
}

export interface ManualOrderResult { success: boolean; message: string; orderId?: string; id?: string }

const messages: Array<[string,string]> = [
  ["missing required field", "أكملي الحقل الإلزامي الموضح قبل إنشاء الطلب."],
  ["invalid email", "البريد الإلكتروني غير صحيح."],
  ["invalid phone", "رقم الهاتف غير صحيح."],
  ["invalid numeric", "معرّف اللاعب الرقمي يجب أن يحتوي أرقامًا فقط."],
  ["invalid field format", "إحدى البيانات لا تطابق الصيغة المطلوبة للباقة."],
  ["insufficient wallet", "رصيد محفظة العميل غير كافٍ."],
  ["wallet is frozen", "محفظة العميل مجمدة ولا يمكن الخصم منها."],
  ["complimentary orders", "الطلب المجاني متاح للـOwner وSuper Admin فقط."],
  ["offer is unavailable", "الباقة غير متاحة أو لا تتبع المنتج المحدد."],
  ["stock is insufficient", "مخزون الباقة لا يسمح بهذه الكمية."],
  ["could not find the function", "شغّلي ملف docs/admin_create_manual_product_order.sql في Supabase أولًا."],
];

export async function createAdminManualOrder(input: ManualOrderInput): Promise<ManualOrderResult> {
  try {
    if (!input.userId || !input.productId || !input.offerId) return {success:false,message:"اختاري العميل والمنتج والباقة."};
    if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 100) return {success:false,message:"الكمية غير صحيحة."};
    if (input.adminNote.trim().length < 3) return {success:false,message:"اكتبي سببًا أو ملاحظة إدارية واضحة."};

    const supabase = await createClient();
    const {data:{user}} = await supabase.auth.getUser();
    if (!user) return {success:false,message:"يجب تسجيل الدخول أولًا."};
    const {data:profile} = await supabase.from("profiles").select("role,status").eq("id",user.id).single<{role:string;status:string}>();
    if (!profile || profile.status !== "active" || !["admin","super_admin","owner"].includes(profile.role)) return {success:false,message:"ليس لديك صلاحية إنشاء الطلب."};
    if (input.paymentMode === "complimentary" && !["super_admin","owner"].includes(profile.role)) return {success:false,message:"الطلب المجاني متاح للـOwner وSuper Admin فقط."};

    const {data,error} = await supabase.rpc("admin_create_manual_product_order",{
      p_user_id:input.userId,p_product_id:input.productId,p_offer_id:input.offerId,
      p_quantity:input.quantity,p_input_values:input.inputValues,
      p_payment_mode:input.paymentMode,p_fulfillment_mode:input.fulfillmentMode,
      p_admin_note:input.adminNote.trim(),
    });
    if (error) throw error;
    const order = data as {id:string;order_id:string};
    revalidatePath("/admin/orders"); revalidatePath("/orders"); revalidatePath("/wallet"); revalidatePath("/notifications");
    revalidatePath(`/admin/users/${input.userId}`);
    return {success:true,message:`تم إنشاء الطلب ${order.order_id} بأمان.`,orderId:order.order_id,id:order.id};
  } catch (error) {
    const raw = error instanceof Error ? error.message : "تعذر إنشاء الطلب.";
    const normalized = raw.toLowerCase();
    return {success:false,message:messages.find(([key])=>normalized.includes(key))?.[1] ?? raw};
  }
}
