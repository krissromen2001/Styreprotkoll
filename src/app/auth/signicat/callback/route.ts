import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  SIGNICAT_ACCESS_COOKIE,
  SIGNICAT_PKCE_COOKIE,
  SIGNICAT_REFRESH_COOKIE,
  SIGNICAT_STATE_COOKIE,
  exchangeSignicatCodeForTokens,
  fetchSignicatUserInfo,
} from "@/lib/signicat-oidc";

function redirectWithError(request: NextRequest, code: string, message?: string) {
  const url = new URL("/auth/signin", request.url);
  url.searchParams.set("error", code);
  if (message) url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oidcError = url.searchParams.get("error");
  const oidcErrorDescription = url.searchParams.get("error_description");

  if (oidcError) {
    return redirectWithError(request, "SignicatDenied", oidcErrorDescription || oidcError);
  }
  if (!code || !state) {
    return redirectWithError(request, "SignicatCallbackInvalid");
  }

  const expectedState = request.cookies.get(SIGNICAT_STATE_COOKIE)?.value;
  const codeVerifier = request.cookies.get(SIGNICAT_PKCE_COOKIE)?.value;
  if (!expectedState || !codeVerifier || state !== expectedState) {
    return redirectWithError(request, "SignicatStateMismatch");
  }

  try {
    const redirectUri = `${url.origin}${process.env.SIGNICAT_OIDC_REDIRECT_PATH || "/auth/signicat/callback"}`;
    const tokens = await exchangeSignicatCodeForTokens({ code, codeVerifier, redirectUri });
    const profile = await fetchSignicatUserInfo(tokens.access_token);
    const email = profile.email?.toLowerCase().trim();

    if (!email) {
      return redirectWithError(request, "SignicatMissingEmail");
    }

    const fullName =
      profile.name?.trim() ||
      [profile.given_name, profile.family_name].filter(Boolean).join(" ").trim() ||
      null;

    const existingByEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingByEmail[0]) {
      await db
        .update(users)
        .set({
          name: fullName ?? existingByEmail[0].name,
          emailVerified: existingByEmail[0].emailVerified ?? new Date(),
        })
        .where(eq(users.id, existingByEmail[0].id));
    } else {
      await db.insert(users).values({
        email,
        name: fullName,
        passwordHash: null,
        emailVerified: new Date(),
      });
    }

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    const secure = process.env.NODE_ENV === "production";
    const accessMaxAge = Math.max(60, tokens.expires_in ?? 60 * 60);

    response.cookies.set(SIGNICAT_ACCESS_COOKIE, tokens.access_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: accessMaxAge,
    });
    if (tokens.refresh_token) {
      response.cookies.set(SIGNICAT_REFRESH_COOKIE, tokens.refresh_token, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    response.cookies.set(SIGNICAT_STATE_COOKIE, "", {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    response.cookies.set(SIGNICAT_PKCE_COOKIE, "", {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Kunne ikke fullføre BankID-innlogging";
    return redirectWithError(request, "SignicatCallbackFailed", message);
  }
}
