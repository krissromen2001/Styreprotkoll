"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIES_TO_CLEAR = [
  "sp_access_token",
  "sp_refresh_token",
  "active_company_id",
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "next-auth.csrf-token",
];

export async function logoutCurrentUser() {
  const store = await cookies();
  for (const name of COOKIES_TO_CLEAR) {
    try {
      store.delete(name);
    } catch {
      // Ignore missing cookies
    }
  }

  redirect("/auth/signin");
}
