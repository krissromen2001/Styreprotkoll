"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  createCompany,
  createBoardMember,
  getCompanyByOrg,
  updateBoardMember,
  getBoardMemberByNameRole,
} from "@/lib/store";
import { lookupCompany, lookupBoardMembers } from "@/lib/brreg";

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

export async function connectCompanyForUser(formData: FormData) {
  const orgNumber = (formData.get("orgNumber") as string)?.trim();
  const memberIndexStr = formData.get("memberIndex") as string;
  const memberIndex = Number(memberIndexStr);

  if (!orgNumber) {
    return { error: "Organisasjonsnummer er påkrevd" };
  }
  if (Number.isNaN(memberIndex)) {
    return { error: "Velg hvem du er i listen" };
  }

  const session = await auth();
  if (!session?.user?.email || !session.user.id) {
    return { error: "Du må være innlogget" };
  }

  const [companyData, boardMembers] = await Promise.all([
    lookupCompany(orgNumber),
    lookupBoardMembers(orgNumber),
  ]);

  if (!companyData) {
    return { error: "Fant ikke selskapet i Brønnøysundregistrene" };
  }

  let company = await getCompanyByOrg(companyData.organisasjonsnummer);
  if (!company) {
    company = await createCompany({
      name: companyData.navn,
      orgNumber: companyData.organisasjonsnummer,
      address: companyData.forretningsadresse?.adresse?.join(", ") || "",
      postalCode: companyData.forretningsadresse?.postnummer || "",
      city: companyData.forretningsadresse?.poststed || "",
    });
  }

  // Ensure board members are present
  for (const member of boardMembers) {
    const existing = await getBoardMemberByNameRole(company.id, member.name, member.role);
    if (!existing) {
      await createBoardMember({
        companyId: company.id,
        name: member.name,
        email: "",
        role: member.role,
        active: true,
        userId: null,
      });
    }
  }

  const selected = boardMembers[memberIndex];
  if (!selected) {
    return { error: "Valgt medlem finnes ikke" };
  }

  const selectedMember = await getBoardMemberByNameRole(company.id, selected.name, selected.role);
  if (!selectedMember) {
    return { error: "Kunne ikke finne valgt medlem i databasen" };
  }

  await updateBoardMember(selectedMember.id, {
    userId: session.user.id,
    email: session.user.email,
  });

  redirect("/");
}
