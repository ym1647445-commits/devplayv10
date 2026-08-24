import { Clock3, Headphones, MessageCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { readPlatformStatus } from "@/lib/platform-status";
import styles from "./maintenance.module.css";
import { MaintenanceCountdown } from "./MaintenanceCountdown";
export const metadata={title:"صيانة DevPlay",robots:{index:false,follow:false}};
export default async function MaintenancePage(){const db=await createClient();const status=await readPlatformStatus(db);return <main className={styles.page}><section><span className={styles.logo}>DP</span><small>DEVPLAY STATUS</small><h1>{status.maintenanceTitle}</h1><p>{status.maintenanceMessage}</p><MaintenanceCountdown expectedAt={status.expectedReturnAt}/><div className={styles.state}><Clock3 size={18}/><span><strong>صيانة مؤقتة</strong><small>لوحة الإدارة والدعم وتسجيل الدخول وتتبع الطلبات السابقة ما زالت متاحة.</small></span></div><div className={styles.actions}><a href={status.telegramUrl} target="_blank" rel="noreferrer"><MessageCircle size={17}/> Telegram @DevPlaySupport</a><a href={status.whatsappUrl} target="_blank" rel="noreferrer"><Headphones size={17}/> WhatsApp +201035966569</a></div><Link href="/orders">متابعة طلب سابق</Link></section></main>}
