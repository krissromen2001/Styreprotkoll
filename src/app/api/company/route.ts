import { NextResponse } from "next/server";
import { getCompaniesForUser } from "@/lib/store";
import { auth } from "@/lib/auth";
import { getSelectedCompanyId } from "@/lib/company-selection";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ id: null });
  }

  const companies = await getCompaniesForUser(session.user.email);
  if (companies.length === 0) {
    return NextResponse.json({ id: null });
  }

  const selectedId = await getSelectedCompanyId();
  const active = selectedId ? companies.find((c) => c.id === selectedId) : companies[0];
  return NextResponse.json(active ?? companies[0]);
}
