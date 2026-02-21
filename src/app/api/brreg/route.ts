import { NextRequest, NextResponse } from "next/server";
import { lookupCompany, lookupBoardMembers } from "@/lib/brreg";

export async function GET(request: NextRequest) {
  const orgNumber = request.nextUrl.searchParams.get("orgNumber");
  if (!orgNumber) {
    return NextResponse.json({ error: "orgNumber is required" }, { status: 400 });
  }

  const [company, boardMembers] = await Promise.all([
    lookupCompany(orgNumber),
    lookupBoardMembers(orgNumber),
  ]);

  if (!company) {
    return NextResponse.json({ error: "Selskap ikke funnet" }, { status: 404 });
  }

  return NextResponse.json({
    name: company.navn,
    orgNumber: company.organisasjonsnummer,
    address: company.forretningsadresse?.adresse?.join(", ") || "",
    postalCode: company.forretningsadresse?.postnummer || "",
    city: company.forretningsadresse?.poststed || "",
    boardMembers,
  });
}
