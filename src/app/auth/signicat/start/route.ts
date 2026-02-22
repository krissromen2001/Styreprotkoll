import { NextResponse } from "next/server";
import {
  SIGNICAT_PKCE_COOKIE,
  SIGNICAT_STATE_COOKIE,
  buildSignicatAuthorizeUrl,
} from "@/lib/signicat-oidc";

export async function GET(request: Request) {
  try {
    const origin = new URL(request.url).origin;
    const { url, state, codeVerifier } = await buildSignicatAuthorizeUrl(origin);
    if (process.env.NODE_ENV !== "production") {
      try {
        const debugUrl = new URL(url);
        // Avoid noisy secrets (there should be none in authorize URL), but keep params visible for debugging.
        console.log("[signicat-oidc] authorize", {
          origin,
          issuer: process.env.SIGNICAT_OIDC_ISSUER,
          redirectUri: debugUrl.searchParams.get("redirect_uri"),
          responseType: debugUrl.searchParams.get("response_type"),
          scope: debugUrl.searchParams.get("scope"),
          acrValues: debugUrl.searchParams.get("acr_values"),
          prompt: debugUrl.searchParams.get("prompt"),
          authorizeUrl: debugUrl.toString(),
        });
      } catch {
        // Ignore debug logging errors
      }
    }
    const response = NextResponse.redirect(url);
    const secure = process.env.NODE_ENV === "production";

    response.cookies.set(SIGNICAT_STATE_COOKIE, state, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });
    response.cookies.set(SIGNICAT_PKCE_COOKIE, codeVerifier, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Kunne ikke starte BankID-innlogging";
    const url = new URL("/auth/signin", request.url);
    url.searchParams.set("error", "SignicatStartFailed");
    url.searchParams.set("message", message);
    return NextResponse.redirect(url);
  }
}
