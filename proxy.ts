import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(
  request: NextRequest,
) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * تشغيل Proxy على الصفحات مع استثناء ملفات Next
     * والصور والأيقونات العامة.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};