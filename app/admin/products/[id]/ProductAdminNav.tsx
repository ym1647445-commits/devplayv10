"use client";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { LayoutGrid, Settings2 } from "lucide-react";
export function ProductAdminNav(){const {id}=useParams<{id:string}>();const pathname=usePathname();const base=`/admin/products/${id}`;return <nav style={{display:"flex",gap:8,padding:"12px 18px",borderBottom:"1px solid var(--border)",background:"var(--surface)",direction:"rtl",overflowX:"auto"}}><Link href={base} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"9px 12px",borderRadius:10,background:pathname===base?"var(--primary-soft)":"var(--surface-soft)",color:"var(--foreground)",whiteSpace:"nowrap"}}><Settings2 size={16}/> تعديل المنتج</Link><Link href={`${base}/organize`} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"9px 12px",borderRadius:10,background:pathname.endsWith("/organize")?"var(--primary-soft)":"var(--surface-soft)",color:"var(--foreground)",whiteSpace:"nowrap"}}><LayoutGrid size={16}/> تنظيم الباقات بالسحب</Link></nav>}

