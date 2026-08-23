"use server";

import { updateAuthenticatedPassword } from "@/lib/auth/password";

export async function updateRecoveryPassword(password: string) {
  return updateAuthenticatedPassword(password);
}
