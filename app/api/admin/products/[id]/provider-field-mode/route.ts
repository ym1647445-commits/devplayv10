import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({providerManaged:false},{status:401});
  const {data:profile}=await supabase.from("profiles").select("role,status").eq("id",user.id).maybeSingle<{role:string;status:string}>();
  if(!profile||profile.status!=="active"||!["admin","super_admin","owner"].includes(profile.role))return NextResponse.json({providerManaged:false},{status:403});
  const {data:product}=await supabase.from("store_products").select("provider_data").eq("id",id).maybeSingle<{provider_data:Record<string,unknown>|null}>();
  return NextResponse.json({providerManaged:product?.provider_data?.provider==="item4gamer",provider:"item4gamer"});
}

