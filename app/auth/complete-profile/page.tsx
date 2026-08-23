import { redirect } from "next/navigation";
import { CheckCircle2, Phone, ShieldCheck, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { completeGoogleProfile } from "./actions";
import styles from "./page.module.css";

export default async function CompleteProfilePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: profile } = await supabase.from("profiles").select("full_name,phone").eq("id", user.id).maybeSingle<{ full_name: string | null; phone: string | null }>();
  if (profile?.phone?.trim()) redirect("/account");
  const { error } = await searchParams;
  const message = error === "phone" ? "اكتبي رقم موبايل مصري صحيح مكوّنًا من 11 رقمًا." : error === "name" ? "اكتبي اسمك الكامل." : error === "save" ? "تعذر حفظ البيانات، حاولي مرة أخرى." : null;
  return <main className={styles.page}><section className={styles.card}><span className={styles.icon}><CheckCircle2/></span><small>خطوة أخيرة</small><h1>أكملي بيانات التواصل</h1><p>تم تأكيد بريد Google. نحتاج رقمك فقط لمتابعة الطلبات وحل أي مشكلة.</p><div className={styles.email}><ShieldCheck size={16}/><span>{user.email}</span><b>مؤكد</b></div><form action={completeGoogleProfile}><label><span>الاسم الكامل</span><div><UserRound/><input name="fullName" defaultValue={profile?.full_name ?? String(user.user_metadata?.full_name ?? "")} maxLength={100} autoComplete="name" required/></div></label><label><span>رقم الموبايل / واتساب</span><div><Phone/><input name="phone" type="tel" inputMode="numeric" pattern="01[0125][0-9]{8}" maxLength={11} placeholder="01012345678" autoComplete="tel" required/></div></label>{message&&<div className={styles.error}>{message}</div>}<button type="submit">حفظ والدخول إلى حسابي</button></form><em>لن ننشئ حسابًا آخر إذا سجلتِ بالبريد نفسه؛ Google يُربط بحسابك الحالي.</em></section></main>;
}
