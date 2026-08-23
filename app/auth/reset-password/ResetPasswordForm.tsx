"use client";

import { useRouter } from "next/navigation";

import { PasswordForm } from "@/components/auth/PasswordForm";

import { updateRecoveryPassword } from "./actions";

export function ResetPasswordForm() {
  const router = useRouter();

  function handleSuccess(): void {
    window.setTimeout(() => {
      router.push("/account");
    }, 1500);
  }

  return (
    <PasswordForm
      submitLabel="تحديث كلمة المرور"
      onSubmit={updateRecoveryPassword}
      onSuccess={handleSuccess}
    />
  );
}
