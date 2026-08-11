import { Settings2 } from "lucide-react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";

import { SettingsClient } from "./SettingsClient";
import type { SettingsPayload } from "./actions";
import styles from "./settings.module.css";

interface ProfileSettings { full_name:string|null; phone:string|null; birth_date:string|null; birth_date_locked:boolean; language:string; theme:string; accent_color:string; font_size:string; display_density:string; reduce_motion:boolean; }
interface Preferences { in_app_enabled:boolean; email_enabled:boolean; order_notifications:boolean; deposit_notifications:boolean; promotion_notifications:boolean; security_notifications:boolean; }

export default async function SettingsPage(){const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/auth?next=/settings");const[profileResult,preferencesResult]=await Promise.all([supabase.from("profiles").select("full_name, phone, birth_date, birth_date_locked, language, theme, accent_color, font_size, display_density, reduce_motion").eq("id",user.id).single<ProfileSettings>(),supabase.from("notification_preferences").select("in_app_enabled, email_enabled, order_notifications, deposit_notifications, promotion_notifications, security_notifications").eq("user_id",user.id).maybeSingle<Preferences>()]);if(!profileResult.data)redirect("/account");const p=profileResult.data;const n=preferencesResult.data;const initial:SettingsPayload={fullName:p.full_name??"",phone:p.phone??"",birthDate:p.birth_date??"",birthDateLocked:Boolean(p.birth_date_locked||p.birth_date),language:p.language==="en"?"en":"ar",theme:(["dark","light","oled","high-contrast"].includes(p.theme)?p.theme:"dark") as SettingsPayload["theme"],accentColor:(["violet","blue","cyan","green","yellow","orange","red","pink"].includes(p.accent_color)?p.accent_color:"violet") as SettingsPayload["accentColor"],fontSize:(["small","medium","large","xlarge"].includes(p.font_size)?p.font_size:"medium") as SettingsPayload["fontSize"],displayDensity:(p.display_density==="comfortable"?"comfortable":"compact"),reduceMotion:Boolean(p.reduce_motion),inAppEnabled:n?.in_app_enabled??true,emailEnabled:n?.email_enabled??true,orderNotifications:n?.order_notifications??true,depositNotifications:n?.deposit_notifications??true,promotionNotifications:n?.promotion_notifications??false,securityNotifications:n?.security_notifications??true};return <AppShell><main className={styles.page}><header className={styles.hero}><span><Settings2 size={16}/> حسابك بطريقتك</span><h1>الإعدادات</h1><p>إدارة بيانات الحساب والمظهر والإشعارات من مكان واحد.</p></header><SettingsClient initial={initial}/></main></AppShell>}
