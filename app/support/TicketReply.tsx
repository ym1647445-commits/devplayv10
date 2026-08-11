"use client";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./TicketReply.module.css";

export function TicketReply({ticketId,closed}:{ticketId:string;closed:boolean}) {
  const router=useRouter(); const[value,setValue]=useState(""); const[loading,setLoading]=useState(false); const[error,setError]=useState("");
  async function send(){if(!value.trim()||loading)return;setLoading(true);setError("");const{error:rpcError}=await createClient().rpc("send_support_ticket_message",{p_ticket_id:ticketId,p_message:value.trim()});setLoading(false);if(rpcError){setError(rpcError.message);return}setValue("");router.refresh()}
  if(closed)return <p className={styles.closedNotice}>هذه المحادثة مغلقة. افتح محادثة جديدة إذا احتجت مساعدة أخرى.</p>;
  return <div className={styles.ticketReply}><textarea value={value} onChange={e=>setValue(e.target.value)} maxLength={3000} placeholder="اكتب ردًا جديدًا في المحادثة..."/><button onClick={()=>void send()} disabled={loading}><Send size={15}/>{loading?"جارٍ الإرسال":"إرسال"}</button>{error&&<small>{error}</small>}</div>;
}
