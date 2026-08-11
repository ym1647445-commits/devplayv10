"use client";
import { Bot, Headphones, ImagePlus, LoaderCircle, Send, X } from "lucide-react";
import Link from "next/link";
import { useRef,useState } from "react";
import styles from "./DevPlayAI.module.css";

type ChatMessage={role:"user"|"assistant";text:string};
export function DevPlayAI(){
 const[open,setOpen]=useState(false),[message,setMessage]=useState(""),[image,setImage]=useState<File|null>(null),[loading,setLoading]=useState(false),[messages,setMessages]=useState<ChatMessage[]>([{role:"assistant",text:"أهلًا! أنا DevPlay AI. اشرح لي ما تحتاجه، ويمكنك إرفاق صورة للمشكلة."}]);
 const inputRef=useRef<HTMLInputElement>(null);
 async function send(){if(!message.trim()||loading)return;const text=message.trim();setMessages(v=>[...v,{role:"user",text}]);setMessage("");setLoading(true);const form=new FormData();form.set("message",text);form.set("history",messages.slice(-8).map(m=>`${m.role}: ${m.text}`).join("\n"));if(image)form.set("image",image);setImage(null);
  try{const response=await fetch("/api/support/ai",{method:"POST",body:form});const data=await response.json();if(!response.ok)throw new Error(data.error);setMessages(v=>[...v,{role:"assistant",text:`${data.reply}${data.ticketId?`\nرقم المحادثة: ${data.ticketId}`:""}`}]);}catch(error){setMessages(v=>[...v,{role:"assistant",text:error instanceof Error?error.message:"حدث خطأ غير متوقع."}]);}finally{setLoading(false)}}
 return <><button className={styles.launcher} onClick={()=>setOpen(true)} aria-label="فتح DevPlay AI"><Bot size={24}/><span>AI</span></button>{open&&<section className={styles.panel} aria-label="محادثة DevPlay AI">
  <header><span><Bot size={20}/></span><div><strong>DevPlay AI</strong><small>مساعدك الذكي · متصل</small></div><button onClick={()=>setOpen(false)} aria-label="إغلاق"><X size={19}/></button></header>
  <div className={styles.notice}>لا ترسل كلمة المرور أو كود التحقق. المسائل المالية تتحول تلقائيًا لفريق الدعم.</div>
  <div className={styles.messages}>{messages.map((item,index)=><div className={item.role==="user"?styles.user:styles.assistant} key={index}>{item.text}</div>)}{loading&&<div className={styles.typing}><LoaderCircle size={15}/> جارٍ المراجعة...</div>}</div>
  {image&&<div className={styles.file}><span>{image.name}</span><button onClick={()=>setImage(null)}><X size={14}/></button></div>}
  <footer><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>setImage(e.target.files?.[0]??null)}/><button onClick={()=>inputRef.current?.click()} aria-label="إرفاق صورة"><ImagePlus size={18}/></button><textarea rows={1} value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send()}}} placeholder="اكتب رسالتك..."/><button className={styles.send} onClick={()=>void send()} disabled={loading}><Send size={17}/></button></footer>
  <Link className={styles.human} href="/support"><Headphones size={15}/> التحدث مباشرة مع خدمة العملاء</Link>
 </section>}</>;
}
