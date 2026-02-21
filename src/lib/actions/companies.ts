"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createCompany, createBoardMember, getCompanyByOrg, updateBoardMember } from "@/lib/store";

export async function registerCompany(formData: FormData) {
  const name = formData.get("name") as string;
  const orgNumber = formData.get("orgNumber") as string;
  const address = formData.get("address") as string;
  const postalCode = formData.get("postalCode") as string;
  const city = formData.get("city") as string;
  const membersJson = formData.get("members") as string;

  if (!name || !orgNumber) {
    return { error: "Navn og organisasjonsnummer er påkrevd" };
  }

  const existing = await getCompanyByOrg(orgNumber);
  if (existing) {
    return { error: "Selskapet er allerede registrert" };
  }

  const company = await createCompany({ name, orgNumber, address, postalCode, city });
  const session = await auth();
  const sessionEmail = session?.user?.email ?? null;
  const sessionUserId = session?.user?.id ?? null;

  // Create board members
  if (membersJson) {
    const members = JSON.parse(membersJson) as {
      name: string;
      email: string;
      role: "styreleder" | "nestleder" | "styremedlem" | "varamedlem";
    }[];

    for (const member of members) {
      const created = await createBoardMember({
        companyId: company.id,
        name: member.name,
        email: member.email,
        role: member.role,
        active: true,
        userId: null,
      });
      if (sessionEmail && sessionUserId && member.email === sessionEmail) {
        await updateBoardMember(created.id, { userId: sessionUserId });
      }
    }
  }

  redirect(`/?companyId=${company.id}`);
}
