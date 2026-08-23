import { ProvidersManager, type ProviderAdminRow } from "./ProvidersManager";
import { createClient } from "@/lib/supabase/server";

interface ProviderRow { id:string;code:string;name:string;active:boolean;status:string;priority:number;selection_mode:"manual"|"auto";expose_name_to_customers:boolean;api_base_url:string|null;current_balance:number|string|null;balance_currency:string;last_sync_at:string|null;successful_orders_count:number|string;failed_orders_count:number|string;average_execution_seconds:number|string|null;last_error:string|null }

export default async function ProvidersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("providers").select("id,code,name,active,status,priority,selection_mode,expose_name_to_customers,api_base_url,current_balance,balance_currency,last_sync_at,successful_orders_count,failed_orders_count,average_execution_seconds,last_error").order("priority",{ascending:false}).returns<ProviderRow[]>();
  if (error) return <ProvidersManager providers={[]} migrationMissing/>;
  const counts = await Promise.all((data??[]).map(async provider => { const { count } = await supabase.from("store_product_offers").select("id",{count:"exact",head:true}).eq("provider_name",provider.code); return [provider.code,count??0] as const; }));
  const countMap = new Map(counts);
  const providers:ProviderAdminRow[]=(data??[]).map(provider=>({id:provider.id,code:provider.code,name:provider.name,active:provider.active,status:provider.status,priority:provider.priority,selectionMode:provider.selection_mode,exposeName:provider.expose_name_to_customers,apiBaseUrl:provider.api_base_url,currentBalance:provider.current_balance===null?null:Number(provider.current_balance),currency:provider.balance_currency,lastSync:provider.last_sync_at,productsCount:countMap.get(provider.code)??0,successfulOrders:Number(provider.successful_orders_count),failedOrders:Number(provider.failed_orders_count),averageExecutionSeconds:provider.average_execution_seconds===null?null:Number(provider.average_execution_seconds),lastError:provider.last_error}));
  return <ProvidersManager providers={providers}/>;
}
