import { Bot, ExternalLink, Headphones, MessageSquare, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { replyTicket } from "./actions";
import styles from "./support.module.css";

interface TicketMessage { id:string;message:string;sender_role:string;created_at:string }
interface Ticket { id:string;ticket_id:string;user_id:string;category:string;subject:string;status:string;source?:string;ai_summary?:string|null;created_at:string;updated_at:string;customer_id:string;customer_name:string|null;unread_count:number;messages:TicketMessage[] }
const statuses:Record<string,string>={open:"مفتوحة",in_progress:"قيد العمل",waiting_customer:"بانتظار العميل",resolved:"تم الحل",closed:"مغلقة"};
function MessageBody({text}:{text:string}){const parts=text.split(/(https?:\/\/[^\s]+)/g);return <p>{parts.map((part,index)=>part.startsWith("http://")||part.startsWith("https://")?<a key={index} href={part} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,color:"var(--primary)",fontWeight:900}}><ExternalLink size={13}/> فتح موقع الاسترداد</a>:part)}</p>}

export default async function AdminSupport({searchParams}:{searchParams:Promise<{ticket?:string;q?:string}>}) {
  const params=await searchParams;
  const supabase=await createClient();
  const {data,error}=await supabase.rpc("admin_list_support_tickets");
  const all=(data??[]) as Ticket[];
  const query=(params.q??"").trim().toLowerCase();
  const rows=query?all.filter(t=>`${t.customer_name??""} ${t.customer_id} ${t.ticket_id} ${t.subject}`.toLowerCase().includes(query)):all;
  const selected=rows.find(t=>t.id===params.ticket)??rows[0];
  const unread=all.reduce((sum,t)=>sum+Number(t.unread_count||0),0);

  return <section className={styles.page}>
    <header className={styles.hero}><span><Headphones size={20}/></span><div><small>DEVPLAY SUPPORT INBOX</small><h1>محادثات خدمة العملاء</h1><p>كل رسائل العملاء والردود والتصعيدات من DevPlay AI في مكان واحد.</p></div><strong>{unread} غير مقروءة</strong></header>
    {error&&<div className={styles.error}>تعذر تحميل المحادثات: {error.message}</div>}
    {!error&&<div className={styles.inbox}>
      <aside className={styles.sidebar}>
        <form className={styles.search}><Search size={15}/><input name="q" defaultValue={params.q} placeholder="اسم، ID أو رقم التذكرة"/></form>
        <div className={styles.conversations}>{rows.map(ticket=>{
          const last=ticket.messages.at(-1);
          return <Link className={`${styles.conversation} ${selected?.id===ticket.id?styles.active:""}`} href={`/admin/support?ticket=${ticket.id}${query?`&q=${encodeURIComponent(query)}`:""}`} key={ticket.id}>
            <span className={styles.avatar}>{ticket.source==="devplay_ai"?<Bot size={17}/>:<UserRound size={17}/>}</span>
            <div><header><strong>{ticket.customer_name||"عميل DevPlay"}</strong><time>{new Intl.DateTimeFormat("ar-EG",{hour:"2-digit",minute:"2-digit"}).format(new Date(ticket.updated_at))}</time></header><p>{last?.message||ticket.subject}</p><small>{ticket.ticket_id} · {statuses[ticket.status]||ticket.status}</small></div>
            {Number(ticket.unread_count)>0&&<b>{ticket.unread_count}</b>}
          </Link>})}</div>
      </aside>
      <main className={styles.chat}>
        {!selected?<div className={styles.empty}><MessageSquare size={32}/><strong>لا توجد محادثات بعد</strong></div>:<>
          <header className={styles.chatHeader}><div className={styles.identity}><span className={styles.avatar}><UserRound size={18}/></span><div><h2>{selected.customer_name||"عميل DevPlay"}</h2><p>{selected.subject} · {selected.ticket_id}</p></div></div><Link href={`/admin/users/${encodeURIComponent(selected.customer_id)}`}>فتح عميل 360°</Link></header>
          {selected.source==="devplay_ai"&&<div className={styles.aiNote}><Bot size={17}/><div><strong>تم التصعيد بواسطة DevPlay AI</strong><p>{selected.ai_summary}</p></div></div>}
          <div className={styles.messages}>{selected.messages.map(message=><article className={message.sender_role==="customer"?styles.customerMessage:message.sender_role==="devplay_ai"?styles.aiMessage:styles.adminMessage} key={message.id}><strong>{message.sender_role==="customer"?selected.customer_name||"العميل":message.sender_role==="devplay_ai"?"DevPlay AI":"فريق DevPlay"}</strong><MessageBody text={message.message}/><time>{new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeStyle:"short"}).format(new Date(message.created_at))}</time></article>)}</div>
          <form className={styles.composer} action={replyTicket}><input type="hidden" name="ticketId" value={selected.id}/><textarea name="message" minLength={2} maxLength={3000} required placeholder="اكتبي ردك للعميل..."/><div><select name="status" defaultValue="waiting_customer"><option value="in_progress">قيد العمل</option><option value="waiting_customer">بانتظار العميل</option><option value="resolved">تم الحل</option><option value="closed">مغلقة</option></select><button>إرسال الرد والإشعار</button></div></form>
        </>}
      </main>
    </div>}
  </section>;
}
