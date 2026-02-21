import { cookies } from "next/headers";

const COOKIE_NAME = "active_company_id";

export async function getSelectedCompanyId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function setSelectedCompanyId(companyId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, companyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}
