import { NextResponse } from "next/server";
import { getCompaniesForUser } from "@/lib/store";
import { auth } from "@/lib/auth";

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
  return NextResponse.json(companies[0]);
}
