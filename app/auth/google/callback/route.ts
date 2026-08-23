import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/auth?error=google_failed", url.origin));

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/auth?error=google_failed", url.origin));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/auth?error=google_failed", url.origin));

  const { data: profile } = await supabase.from("profiles")
    .select("full_name,phone,avatar_url")
    .eq("id", user.id)
    .maybeSingle<{ full_name: string | null; phone: string | null; avatar_url: string | null }>();

  const googleName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const googleAvatar = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;
  if (profile && ((!profile.full_name && googleName) || (!profile.avatar_url && googleAvatar))) {
    await supabase.from("profiles").update({
      full_name: profile.full_name || googleName || null,
      avatar_url: profile.avatar_url || googleAvatar,
      email: user.email?.toLowerCase() ?? null,
    }).eq("id", user.id);
  }

  return NextResponse.redirect(new URL(profile?.phone?.trim() ? "/account" : "/auth/complete-profile", url.origin));
}
