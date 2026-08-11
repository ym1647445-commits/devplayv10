import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ManualOrderForm } from "./ManualOrderForm";
import type { ProductRequiredField } from "@/types/product";
import styles from "./manual.module.css";

interface Customer {id:string;customer_id:string;full_name:string|null;email:string|null;phone:string|null;status:string;account_wallets:{balance_usd:number|string;is_frozen:boolean}[]|null}
interface Offer {id:string;product_id:string;provider_offer_id:string|null;name_ar:string;name_en:string|null;supplier_price_usd:number|string;profit_usd:number|string;stock:number|null;active:boolean;available:boolean;required_fields:ProductRequiredField[]|null;provider_data:Record<string,unknown>|null}
interface Product {id:string;name_ar:string;name_en:string|null;minimum_quantity:number;maximum_quantity:number;required_fields:ProductRequiredField[]|null;provider_data:Record<string,unknown>|null;store_product_offers:Offer[]|null}

export default async function ManualOrderPage({searchParams}:{searchParams:Promise<{customer?:string}>}) {
  const query = await searchParams;
  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const {data:admin} = await supabase.from("profiles").select("role,status").eq("id",user.id).single<{role:string;status:string}>();
  if (!admin || admin.status!=="active" || !["admin","super_admin","owner"].includes(admin.role)) redirect("/");
  const [customersR,productsR,settingsR] = await Promise.all([
    supabase.from("profiles").select("id,customer_id,full_name,email,phone,status,account_wallets(balance_usd,is_frozen)").eq("role","customer").order("created_at",{ascending:false}).limit(1000).returns<Customer[]>(),
    supabase.from("store_products").select("id,name_ar,name_en,minimum_quantity,maximum_quantity,required_fields,provider_data,store_product_offers(id,product_id,provider_offer_id,name_ar,name_en,supplier_price_usd,profit_usd,stock,active,available,required_fields,provider_data)").eq("active",true).neq("status","unavailable").order("name_ar").returns<Product[]>(),
    supabase.from("platform_settings").select("usd_to_egp_rate").eq("id",1).single<{usd_to_egp_rate:number|string}>(),
  ]);
  return <main className={styles.page}><ManualOrderForm
    customers={customersR.data??[]} products={(productsR.data??[]).map(p=>({...p,store_product_offers:(p.store_product_offers??[]).filter(o=>o.active&&o.available&&(o.stock===null||o.stock>0))}))}
    rate={Number(settingsR.data?.usd_to_egp_rate??0)} defaultCustomer={query.customer??""}
    canComplimentary={["super_admin","owner"].includes(admin.role)} />
  </main>;
}
