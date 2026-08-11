import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/layout";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      role,
      status
    `)
    .eq("id", user.id)
    .single<{
      id: string;
      role: string;
      status: string;
    }>();

  const allowedRoles = [
    "admin",
    "super_admin",
    "owner",
  ];

  if (
    profileError ||
    !profile ||
    profile.status !== "active" ||
    !allowedRoles.includes(profile.role)
  ) {
    redirect("/");
  }

  return (
    <AdminShell>
      {children}
    </AdminShell>
  );
}