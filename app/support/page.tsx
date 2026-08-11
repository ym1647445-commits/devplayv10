import { Headphones, MessageCircle, TicketCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import { SupportClient } from "./SupportClient";
import { TicketReply } from "./TicketReply";
import styles from "./support.module.css";

const statusLabels: Record<string, string> = { open:"مفتوحة", in_progress:"قيد العمل", waiting_customer:"بانتظار ردك", resolved:"تم الحل", closed:"مغلقة" };

export default async function SupportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: tickets } = await supabase.from("support_tickets")
    .select("id,ticket_id,category,subject,status,created_at,support_ticket_messages(message,sender_role,created_at)")
    .eq("user_id", user.id).order("created_at", { ascending:false }).limit(20);

  return <AppShell><section className={styles.page}>
    <header className={styles.hero}><span><Headphones size={19}/></span><div><small>نحن هنا لمساعدتك</small><h1>خدمة العملاء</h1><p>أرسل مشكلة أو اقتراحًا وتابع رد فريق DevPlay من نفس الصفحة.</p></div></header>
    <SupportClient />
    <section className={styles.tickets}>
      <div className={styles.ticketsHeading}><span><TicketCheck size={19}/></span><div><h2>تذاكرك السابقة</h2><p>كل المحادثات والردود محفوظة هنا.</p></div><strong>{tickets?.length ?? 0}</strong></div>
      {!tickets?.length ? <div className={styles.empty}><MessageCircle size={28}/><strong>لا توجد تذاكر بعد</strong><span>عند إرسال أول طلب دعم سيظهر هنا.</span></div> : tickets.map((ticket) => <article className={styles.ticket} key={ticket.id}>
        <header><div><small>{ticket.ticket_id}</small><strong>{ticket.subject}</strong></div><span data-status={ticket.status}>{statusLabels[ticket.status] ?? ticket.status}</span></header>
        <div className={styles.messages}>{(ticket.support_ticket_messages as {message:string;sender_role:string;created_at:string}[])?.map((entry,index) => <div className={entry.sender_role === "customer" ? styles.customerMessage : styles.supportMessage} key={`${entry.created_at}-${index}`}><strong>{entry.sender_role === "customer" ? "أنت" : "خدمة العملاء"}</strong><p>{entry.message}</p><small>{new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeStyle:"short"}).format(new Date(entry.created_at))}</small></div>)}</div>
        <TicketReply ticketId={ticket.id} closed={ticket.status === "closed"} />
      </article>)}
    </section>
  </section></AppShell>;
}
