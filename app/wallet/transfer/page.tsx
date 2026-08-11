import { ArrowRight, Send } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { WalletTransferForm } from "@/components/wallet/WalletTransferForm";
import { createClient } from "@/lib/supabase/server";

export default async function WalletTransferPage({searchParams}:{searchParams:Promise<{to?:string;amount?:string}>}){
  const query=await searchParams;
  const supabase=await createClient();
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/auth");
  const[{data:wallet},{data:settings}]=await Promise.all([
    supabase.from("account_wallets").select("balance_usd,is_frozen").eq("user_id",user.id).single<{balance_usd:number|string;is_frozen:boolean}>(),
    supabase.from("platform_settings").select("usd_to_egp_rate").eq("id",1).single<{usd_to_egp_rate:number|string}>(),
  ]);
  if(!wallet||!settings)return <AppShell><section className="wallet-error"><h1>تعذر تحميل المحفظة</h1><Link href="/wallet"><ArrowRight size={17}/>العودة للمحفظة</Link></section></AppShell>;
  const initialAmount=/^\d+(\.\d{1,2})?$/.test(query.amount??"")?query.amount:"";
  const initialCustomerId=/^DP-\d{6,}$/i.test(query.to??"")?query.to!.toUpperCase():"";
  return <AppShell><section className="wallet-page"><header className="wallet-heading"><div><span><Send size={14}/> تحويل داخلي آمن</span><h1>إرسال رصيد</h1></div><Link className="wallet-history-button" href="/wallet"><ArrowRight size={17}/>رجوع</Link></header>{wallet.is_frozen?<section className="wallet-freeze-notice"><p>المحفظة مجمدة حاليًا ولا يمكن إرسال الرصيد.</p></section>:<WalletTransferForm balanceUsd={Number(wallet.balance_usd)} usdRate={Number(settings.usd_to_egp_rate)} initialCustomerId={initialCustomerId} initialAmount={initialAmount}/>}</section></AppShell>;
}
