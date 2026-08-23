import { Bot, ChevronDown, Headphones, Info, MessageCircle, ShieldCheck, TicketCheck, Zap } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import { SupportChannels } from "./SupportChannels";
import { SupportClient } from "./SupportClient";
import { TicketReply } from "./TicketReply";
import styles from "./support.module.css";

const statusLabels:Record<string,string>={open:"مفتوحة",in_progress:"قيد العمل",waiting_customer:"بانتظار ردك",resolved:"تم الحل",closed:"مغلقة"};
const faqs=[
 {q:"أين أجد الكود بعد اكتمال الطلب؟",a:"افتحي طلباتي ثم تفاصيل الطلب. عند نجاح المورد يظهر الكود أو نتيجة التنفيذ داخل تفاصيل الباقة ويصلك إشعار."},
 {q:"أرسلت إضافة رصيد ولم تظهر بعد؟",a:"طلبات الإيداع تحتاج مراجعة إثبات التحويل. أرسلي رقم الإيداع عبر التذكرة أو WhatsApp إذا تأخرت المراجعة."},
 {q:"ما البيانات التي لا يجب إرسالها؟",a:"لا ترسلي كلمة المرور أو كود تسجيل الدخول أو OTP لأي شخص، بما في ذلك فريق الدعم."},
 {q:"كيف أتابع مشكلة طلب؟",a:"اكتبي رقم الطلب داخل تذكرة الدعم. ستُربط التذكرة بحسابك وتحصلين على إشعار عند رد الفريق."},
];

export default async function SupportPage(){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();
 const{data:tickets}=user?await supabase.from("support_tickets").select("id,ticket_id,category,subject,status,created_at,support_ticket_messages(message,sender_role,created_at)").eq("user_id",user.id).order("created_at",{ascending:false}).limit(20):{data:[]};
 return <AppShell><main className={styles.page}>
  <header className={styles.hero}><span><Headphones size={23}/></span><div><small>DEVPLAY CARE CENTER</small><h1>كل المساعدة في مكان واحد</h1><p>تواصلي معنا بالطريقة الأنسب، أو اسألي DevPlay AI، أو افتحي تذكرة مرتبطة بحسابك.</p></div><b><i/> متاحون للمساعدة</b></header>
  <SupportChannels/>
  <section className={styles.about}><div className={styles.aboutIcon}><Info size={23}/></div><div><small>ABOUT DEVPLAY</small><h2>دعم حقيقي لتجربة شحن أكثر أمانًا</h2><p>DevPlay Top Up منصة خدمات رقمية تحت إدارة Shahd Elbary. نتابع عمليات المحفظة والطلبات والتواصل مع المورد، ونحفظ سجل المشكلة والردود داخل حسابك.</p><div><span><ShieldCheck size={15}/> بياناتك محمية</span><span><Zap size={15}/> متابعة أسرع</span><span><Bot size={15}/> مساعدة ذكية</span></div></div></section>
  <section className={styles.faq}><header><div><small>أسئلة سريعة</small><h2>الأسئلة الشائعة</h2></div><MessageCircle size={22}/></header><div>{faqs.map(item=><details key={item.q}><summary>{item.q}<ChevronDown size={16}/></summary><p>{item.a}</p></details>)}</div></section>
  {user?<><SupportClient/><section className={styles.tickets}><div className={styles.ticketsHeading}><span><TicketCheck size={19}/></span><div><h2>تذاكرك السابقة</h2><p>كل المحادثات والردود محفوظة هنا.</p></div><strong>{tickets?.length??0}</strong></div>{!tickets?.length?<div className={styles.empty}><MessageCircle size={28}/><strong>لا توجد تذاكر بعد</strong><span>عند إرسال أول طلب دعم سيظهر هنا.</span></div>:tickets.map(ticket=><article className={styles.ticket} key={ticket.id}><header><div><small>{ticket.ticket_id}</small><strong>{ticket.subject}</strong></div><span data-status={ticket.status}>{statusLabels[ticket.status]??ticket.status}</span></header><div className={styles.messages}>{(ticket.support_ticket_messages as {message:string;sender_role:string;created_at:string}[])?.map((entry,index)=><div className={entry.sender_role==="customer"?styles.customerMessage:styles.supportMessage} key={`${entry.created_at}-${index}`}><strong>{entry.sender_role==="customer"?"أنت":"خدمة العملاء"}</strong><p>{entry.message}</p><small>{new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeStyle:"short"}).format(new Date(entry.created_at))}</small></div>)}</div><TicketReply ticketId={ticket.id} closed={ticket.status==="closed"}/></article>)}</section></>:<section className={styles.loginCard}><span><TicketCheck size={24}/></span><div><h2>تريدين متابعة المشكلة داخل حسابك؟</h2><p>سجّلي الدخول لفتح تذكرة، إرفاق رقم الطلب، واستقبال الرد في إشعارات DevPlay.</p></div><Link href="/auth?next=/support">تسجيل الدخول وفتح تذكرة</Link></section>}
 </main></AppShell>
}