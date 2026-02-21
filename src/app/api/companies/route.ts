import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCompaniesForUser } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json([]);
  }

  const companies = await getCompaniesForUser(session.user.email);
  return NextResponse.json(companies.map((c) => ({ id: c.id, name: c.name })));
}
