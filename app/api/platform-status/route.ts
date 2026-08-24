import { createClient } from "@/lib/supabase/server";
import { readPlatformStatus } from "@/lib/platform-status";
export const dynamic="force-dynamic";
export async function GET(){const db=await createClient();const status=await readPlatformStatus(db);return Response.json(status,{headers:{"Cache-Control":"no-store"}})}
