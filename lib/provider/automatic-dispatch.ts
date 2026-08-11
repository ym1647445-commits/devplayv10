import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createProviderOrder, getProviderOrders, ProviderOrderRejectedError } from "./orders";
import type { ProviderCatalogType } from "./types";

interface Job {id:string;order_id:string;order_item_id:string;product_id:string|null;offer_id:string|null;provider_offer_id:string|null;supplier_product_id:string|null;input_values:Record<string,string>|null;attempts_count:number}
interface ProviderRow {provider_data:Record<string,unknown>|null}

function typeFrom(...rows:Array<Record<string,unknown>|null|undefined>):ProviderCatalogType|null{for(const row of rows){if(row?.catalog_type==="gc"||row?.catalog_type==="topup")return row.catalog_type}return null}
function targetFrom(values:Record<string,string>,...rows:Array<Record<string,unknown>|null|undefined>){if(values.target_account?.trim())return values.target_account.trim();for(const row of rows){const key=row?.target_account_field;if(typeof key==="string"&&values[key]?.trim())return values[key].trim()}const valuesList=Object.values(values).map(String).map(value=>value.trim()).filter(Boolean);return valuesList.length===1?valuesList[0]:null}

async function refreshOrder(db:SupabaseClient,job:Job){
  const{data:itemJobs}=await db.from("product_supplier_jobs").select("id,status,supplier_order_id,supplier_status,supplier_response,last_error").eq("order_item_id",job.order_item_id);
  const itemRows=itemJobs??[];const itemStatus=itemRows.length>0&&itemRows.every(row=>row.status==="completed")?"completed":itemRows.some(row=>row.status==="failed")?"manual_review":"supplier_pending";
  await db.from("product_order_items").update({status:itemStatus,supplier_response:{jobs:itemRows},updated_at:new Date().toISOString()}).eq("id",job.order_item_id);
  const{data:orderJobs}=await db.from("product_supplier_jobs").select("status").eq("order_id",job.order_id);const rows=orderJobs??[];
  const orderStatus=rows.length>0&&rows.every(row=>row.status==="completed")?"completed":rows.some(row=>row.status==="failed")?"manual_review":"supplier_pending";
  const{data:order}=await db.from("product_orders").select("user_id,order_id,status").eq("id",job.order_id).single<{user_id:string;order_id:string;status:string}>();if(!order)return;
  const note=orderStatus==="completed"?"All supplier jobs completed; delivery is ready":"Supplier status updated automatically";
  const{error:rpcError}=await db.rpc("admin_update_product_order_status",{p_order_id:job.order_id,p_new_status:orderStatus,p_note:note});
  if(rpcError){
    const now=new Date().toISOString();const{error:updateError}=await db.from("product_orders").update({status:orderStatus,completed_at:orderStatus==="completed"?now:null,updated_at:now}).eq("id",job.order_id);if(updateError)throw updateError;
    if(order.status!==orderStatus)await db.from("product_order_status_history").insert({order_id:job.order_id,old_status:order.status,new_status:orderStatus,changed_by:null,note});
  }
  if(orderStatus!=="completed")return;
  const{data:existing}=await db.from("notifications").select("id").eq("user_id",order.user_id).eq("type","product_order_completed").eq("entity_id",job.order_id).maybeSingle();if(existing)return;
  await db.from("notifications").insert({user_id:order.user_id,type:"product_order_completed",title:"طلبك جاهز",message:`اكتمل تنفيذ الطلب ${order.order_id}. افتحي تفاصيل الطلب لعرض كود التفعيل أو بيانات الشحن.`,entity_type:"product_order",entity_id:job.order_id,action_url:"/orders"});
}

export async function dispatchCreatedOrder(orderId:string):Promise<void>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key){console.error("Automatic Flexy dispatch skipped: SUPABASE_SERVICE_ROLE_KEY is missing");return}
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const{data:jobs,error}=await db.from("product_supplier_jobs").select("id,order_id,order_item_id,product_id,offer_id,provider_offer_id,supplier_product_id,input_values,attempts_count").eq("order_id",orderId).eq("status","pending").order("created_at",{ascending:true}).returns<Job[]>();
  if(error)throw error;
  for(const job of jobs??[]){
    if(!job.offer_id||!job.provider_offer_id)continue;
    const[offerResult,productResult]=await Promise.all([db.from("store_product_offers").select("provider_data").eq("id",job.offer_id).single<ProviderRow>(),job.product_id?db.from("store_products").select("provider_data").eq("id",job.product_id).single<ProviderRow>():Promise.resolve({data:null})]);
    const offerData=offerResult.data?.provider_data;const productData=productResult.data?.provider_data;const type=typeFrom(offerData,productData);const productId=job.supplier_product_id?.trim()||(typeof productData?.provider_category_id==="string"?productData.provider_category_id.trim():"");
    if(!type||!productId)continue;
    const target=type==="topup"?targetFrom(job.input_values??{},offerData,productData):null;
    if(type==="topup"&&!target)continue;
    const{data:claimed}=await db.from("product_supplier_jobs").update({status:"sending",attempts_count:job.attempts_count+1,last_error:null,updated_at:new Date().toISOString()}).eq("id",job.id).eq("status","pending").select("id").maybeSingle();
    if(!claimed)continue;
    try{
      const result=await createProviderOrder({type,productId,offerId:job.provider_offer_id,quantity:1,targetAccount:target??undefined});
      const completed=["completed","success"].includes(result.order.status);
      await db.from("product_supplier_jobs").update({status:completed?"completed":"supplier_pending",supplier_order_id:result.order.fazerOrderId,supplier_status:result.order.status,supplier_response:result.raw,sent_at:new Date().toISOString(),completed_at:completed?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",job.id);
      await refreshOrder(db,job);
      if(!completed){
        for(let attempt=0;attempt<3;attempt++){
          await new Promise(resolve=>setTimeout(resolve,2000));
          const providerOrders=await getProviderOrders(1,100);const match=providerOrders.find(order=>order.fazerOrderId===result.order.fazerOrderId||order.id===result.order.id);if(!match)continue;
          const succeeded=["completed","success"].includes(match.status);const failed=["failed","cancelled","rejected"].includes(match.status);if(!succeeded&&!failed)continue;
          await db.from("product_supplier_jobs").update({status:succeeded?"completed":"failed",supplier_status:match.status,supplier_response:{order:match},completed_at:succeeded?new Date().toISOString():null,last_error:failed?`Provider status: ${match.status}`:null,updated_at:new Date().toISOString()}).eq("id",job.id);
          await refreshOrder(db,job);break;
        }
      }
    }catch(error){
      if(error instanceof ProviderOrderRejectedError){await db.from("product_supplier_jobs").update({status:"failed",supplier_status:error.code,supplier_response:error.response,last_error:error.message,updated_at:new Date().toISOString()}).eq("id",job.id);await refreshOrder(db,job)}
      else await db.from("product_supplier_jobs").update({status:"sending",last_error:`UNKNOWN_DELIVERY_STATE: ${error instanceof Error?error.message:"Provider request failed"}`,updated_at:new Date().toISOString()}).eq("id",job.id);
    }
  }
}

export async function dispatchPendingSupplierJobs(limit=25):Promise<{orders:number;jobs:number}>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("Supabase server credentials are missing");
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const safeLimit=Math.min(50,Math.max(1,Math.floor(limit)));
  const{data,error}=await db.from("product_supplier_jobs").select("id,order_id").eq("status","pending").order("created_at",{ascending:true}).limit(safeLimit);
  if(error)throw error;
  const orderIds=[...new Set((data??[]).map(row=>String(row.order_id)))];
  for(const orderId of orderIds)await dispatchCreatedOrder(orderId);
  return{orders:orderIds.length,jobs:data?.length??0};
}

async function providerOrdersForJobs(supplierIds:Set<string>){
  const matches=new Map<string,Awaited<ReturnType<typeof getProviderOrders>>[number]>();
  for(let page=1;page<=5&&matches.size<supplierIds.size;page++){
    const orders=await getProviderOrders(page,100);
    for(const order of orders){
      for(const id of [order.fazerOrderId,order.id])if(supplierIds.has(String(id)))matches.set(String(id),order);
    }
    if(orders.length<100)break;
  }
  return matches;
}

export async function syncAllSupplierStatuses():Promise<{processed:number}> {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Supabase server credentials are missing");
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const{data:jobs,error}=await db.from("product_supplier_jobs").select("id,order_id,order_item_id,product_id,offer_id,provider_offer_id,supplier_product_id,input_values,attempts_count,supplier_order_id").in("status",["supplier_pending","failed","completed"]).not("supplier_order_id","is",null).limit(100);
  if(error)throw error;if(!jobs?.length)return{processed:0};
  const supplierIds=new Set(jobs.map(row=>String(row.supplier_order_id)));const byId=await providerOrdersForJobs(supplierIds);let processed=0;
  for(const row of jobs){const match=byId.get(String(row.supplier_order_id));if(!match)continue;const succeeded=["completed","success"].includes(match.status);const refunded=match.status==="refunded";const failed=["failed","cancelled","rejected"].includes(match.status);if(!succeeded&&!refunded&&!failed)continue;
    await db.from("product_supplier_jobs").update({status:succeeded?"completed":refunded?"refunded":"failed",supplier_status:match.status,supplier_response:{order:match},completed_at:succeeded||refunded?new Date().toISOString():null,last_error:failed?`Provider status: ${match.status}`:null,updated_at:new Date().toISOString()}).eq("id",row.id);
    await refreshOrder(db,row as Job);processed++;
  }
  return{processed};
}
