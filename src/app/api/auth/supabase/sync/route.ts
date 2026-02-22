import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SUPABASE_ACCESS_COOKIE = "sp_access_token";
const SUPABASE_REFRESH_COOKIE = "sp_refresh_token";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const body = (await request.json().catch(() => ({}))) as {
    refreshToken?: string;
    expiresAt?: number;
    providerToken?: string;
    providerRefreshToken?: string;
  };

  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: "Invalid Supabase session" }, { status: 401 });
  }

  const supabaseUser = data.user;
  const email = supabaseUser.email?.toLowerCase().trim();
  if (!email) {
    return NextResponse.json({ error: "Supabase user is missing email" }, { status: 400 });
  }

  const fullName =
    typeof supabaseUser.user_metadata?.full_name === "string"
      ? supabaseUser.user_metadata.full_name
      : typeof supabaseUser.user_metadata?.name === "string"
        ? supabaseUser.user_metadata.name
        : null;

  const response = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";
  const maxAge =
    typeof body.expiresAt === "number"
      ? Math.max(60, Math.floor(body.expiresAt - Date.now() / 1000))
      : 60 * 60;

  response.cookies.set(SUPABASE_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  if (body.refreshToken) {
    response.cookies.set(SUPABASE_REFRESH_COOKIE, body.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  const existingById = await db.select().from(users).where(eq(users.id, supabaseUser.id));
  if (existingById[0]) {
    await db
      .update(users)
      .set({
        email,
        name: fullName ?? existingById[0].name,
        emailVerified: existingById[0].emailVerified ?? new Date(),
        googleCalendarAccessToken: body.providerToken ?? existingById[0].googleCalendarAccessToken,
        googleCalendarRefreshToken:
          body.providerRefreshToken ?? existingById[0].googleCalendarRefreshToken,
        googleCalendarTokenExpiresAt: body.providerToken
          ? new Date(Date.now() + 50 * 60 * 1000)
          : existingById[0].googleCalendarTokenExpiresAt,
      })
      .where(eq(users.id, supabaseUser.id));

    return response;
  }

  const existingByEmail = await db.select().from(users).where(eq(users.email, email));
  if (existingByEmail[0]) {
    await db
      .update(users)
      .set({
        name: fullName ?? existingByEmail[0].name,
        emailVerified: existingByEmail[0].emailVerified ?? new Date(),
        googleCalendarAccessToken: body.providerToken ?? existingByEmail[0].googleCalendarAccessToken,
        googleCalendarRefreshToken:
          body.providerRefreshToken ?? existingByEmail[0].googleCalendarRefreshToken,
        googleCalendarTokenExpiresAt: body.providerToken
          ? new Date(Date.now() + 50 * 60 * 1000)
          : existingByEmail[0].googleCalendarTokenExpiresAt,
      })
      .where(eq(users.id, existingByEmail[0].id));

    return response;
  }

  await db.insert(users).values({
    id: supabaseUser.id,
    email,
    name: fullName,
    passwordHash: null,
    emailVerified: new Date(),
    googleCalendarAccessToken: body.providerToken ?? null,
    googleCalendarRefreshToken: body.providerRefreshToken ?? null,
    googleCalendarTokenExpiresAt: body.providerToken ? new Date(Date.now() + 50 * 60 * 1000) : null,
  });

  return response;
}
