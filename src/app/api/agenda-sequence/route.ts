import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAgendaCountForCompanyYear, getBoardMemberByEmail } from "@/lib/store";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Du må være innlogget" }, { status: 401 });
  }

  const body = await request.json();
  const companyId = body?.companyId as string | undefined;
  const date = body?.date as string | undefined;

  if (!companyId || !date) {
    return NextResponse.json({ base: 0 });
  }

  const member = await getBoardMemberByEmail(companyId, session.user.email);
  if (!member) {
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  const year = date.split("-")[0];
  if (!year || year.length !== 4) {
    return NextResponse.json({ base: 0 });
  }

  const base = await getAgendaCountForCompanyYear(companyId, year);
  return NextResponse.json({ base });
}
