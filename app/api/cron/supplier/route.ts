import { dispatchPendingSupplierJobs, syncAllSupplierStatuses } from "@/lib/provider/automatic-dispatch";

export const runtime="nodejs";
export const maxDuration=60;
export const dynamic="force-dynamic";

export async function GET(request:Request){
  const secret=process.env.SUPPLIER_WORKER_SECRET;
  if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`){
    return Response.json({success:false,error:"Unauthorized"},{status:401});
  }
  const startedAt=Date.now();
  try{
    const dispatched=await dispatchPendingSupplierJobs(25);
    const synced=await syncAllSupplierStatuses();
    return Response.json({success:true,dispatched,synced,durationMs:Date.now()-startedAt,checkedAt:new Date().toISOString()});
  }catch(error){
    console.error("Supplier worker failed",error);
    return Response.json({success:false,error:error instanceof Error?error.message:"Supplier worker failed",durationMs:Date.now()-startedAt},{status:500});
  }
}
