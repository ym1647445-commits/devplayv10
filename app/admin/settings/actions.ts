"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
export interface MaintenanceSettingsInput{maintenanceMode:boolean;ordersEnabled:boolean;depositsEnabled:boolean;walletTransfersEnabled:boolean;walletOperationsEnabled:boolean;supplierDispatchEnabled:boolean;maintenanceTitle:string;maintenanceMessage:string;expectedReturnAt:string;telegramUrl:string;whatsappUrl:string}
export async function updateMaintenanceSettings(input:MaintenanceSettingsInput){
  if(!input||typeof input!=="object"||typeof input.maintenanceMode!=="boolean"||typeof input.ordersEnabled!=="boolean"||typeof input.depositsEnabled!=="boolean"||typeof input.walletTransfersEnabled!=="boolean"||typeof input.walletOperationsEnabled!=="boolean"||typeof input.supplierDispatchEnabled!=="boolean"||typeof input.maintenanceTitle!=="string"||typeof input.maintenanceMessage!=="string"||typeof input.expectedReturnAt!=="string"||typeof input.telegramUrl!=="string"||typeof input.whatsappUrl!=="string")return{success:false,message:"قيم حالة المنصة غير صالحة."};
  const db=await createClient();
  const{data:{user}}=await db.auth.getUser();
  if(!user)return{success:false,message:"يجب تسجيل الدخول أولًا."};
  const message=input.maintenanceMessage.trim().slice(0,500)||"نُجري حاليًا تحسينات مهمة على DevPlay. سنعود للعمل قريبًا.";const title=input.maintenanceTitle.trim().slice(0,120)||"DevPlay تحت التحديث حاليًا";const expectedDate=input.expectedReturnAt?new Date(input.expectedReturnAt):null;if(expectedDate&&Number.isNaN(expectedDate.getTime()))return{success:false,message:"وقت العودة المتوقع غير صحيح."};const expected=expectedDate?.toISOString()??null;let telegram:string,whatsapp:string;try{telegram=new URL(input.telegramUrl).toString();whatsapp=new URL(input.whatsappUrl).toString();if(!telegram.startsWith("https://")||!whatsapp.startsWith("https://"))throw new Error()}catch{return{success:false,message:"روابط Telegram وWhatsApp يجب أن تكون روابط HTTPS صحيحة."};}
  const{error}=await db.rpc("admin_update_platform_availability_v2",{p_maintenance_mode:input.maintenanceMode,p_orders_enabled:input.ordersEnabled,p_deposits_enabled:input.depositsEnabled,p_wallet_transfers_enabled:input.walletTransfersEnabled,p_wallet_operations_enabled:input.walletOperationsEnabled,p_supplier_dispatch_enabled:input.supplierDispatchEnabled,p_maintenance_title:title,p_maintenance_message:message,p_expected_return_at:expected,p_support_telegram_url:telegram,p_support_whatsapp_url:whatsapp});
  if(error)return{success:false,message:error.message.includes("Could not find the function")?"أعيدي تشغيل ملف platform_maintenance_controls.sql في Supabase لتثبيت دالة الحفظ الآمنة.":error.message};
  for(const path of ["/","/maintenance","/admin","/admin/settings","/checkout","/wallet/deposit","/wallet/transfer"])revalidatePath(path);
  return{success:true,message:"تم حفظ حالة المنصة وتسجيل التغيير."};
}
