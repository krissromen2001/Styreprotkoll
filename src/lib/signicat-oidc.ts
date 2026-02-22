import "server-only";

type OidcDiscovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  issuer: string;
};

type TokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
};

type UserInfo = {
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
};

export const SIGNICAT_ACCESS_COOKIE = "sg_access_token";
export const SIGNICAT_REFRESH_COOKIE = "sg_refresh_token";
export const SIGNICAT_STATE_COOKIE = "sg_oidc_state";
export const SIGNICAT_PKCE_COOKIE = "sg_oidc_pkce";

let discoveryCache: OidcDiscovery | null = null;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function getIssuer() {
  return requireEnv("SIGNICAT_OIDC_ISSUER").replace(/\/$/, "");
}

function getRedirectPath() {
  return process.env.SIGNICAT_OIDC_REDIRECT_PATH || "/auth/signicat/callback";
}

export function getSignicatRedirectUri(baseUrlOverride?: string) {
  const baseUrl = (baseUrlOverride || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  return `${baseUrl}${getRedirectPath()}`;
}

export async function getSignicatOidcDiscovery(): Promise<OidcDiscovery> {
  if (discoveryCache) return discoveryCache;
  const issuer = getIssuer();
  const url = `${issuer}/.well-known/openid-configuration`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load Signicat OIDC discovery (${response.status})`);
  }
  const data = (await response.json()) as OidcDiscovery;
  if (!data.authorization_endpoint || !data.token_endpoint || !data.userinfo_endpoint) {
    throw new Error("Invalid Signicat OIDC discovery document");
  }
  discoveryCache = data;
  return data;
}

export function createRandomString(bytes = 32) {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString("base64url");
}

export async function createPkceChallenge(verifier: string) {
  const cryptoNode = await import("crypto");
  return cryptoNode.createHash("sha256").update(verifier).digest("base64url");
}

export async function buildSignicatAuthorizeUrl(baseUrlOverride?: string) {
  const discovery = await getSignicatOidcDiscovery();
  const clientId = requireEnv("SIGNICAT_OIDC_CLIENT_ID");
  const state = createRandomString(24);
  const nonce = createRandomString(24);
  const codeVerifier = createRandomString(48);
  const codeChallenge = await createPkceChallenge(codeVerifier);

  const url = new URL(discovery.authorization_endpoint);
  const scope = process.env.SIGNICAT_OIDC_SCOPE?.trim() || "openid profile email";
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("redirect_uri", getSignicatRedirectUri(baseUrlOverride));
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  // Keep authorize request minimal for sandbox compatibility.
  const prompt = process.env.SIGNICAT_OIDC_PROMPT?.trim();
  if (prompt) {
    url.searchParams.set("prompt", prompt);
  }
  const acrValues = process.env.SIGNICAT_OIDC_ACR_VALUES?.trim();
  if (acrValues) {
    url.searchParams.set("acr_values", acrValues);
  }
  if (process.env.SIGNICAT_OIDC_UI_LOCALES) {
    url.searchParams.set("ui_locales", process.env.SIGNICAT_OIDC_UI_LOCALES);
  }

  return {
    url: url.toString(),
    state,
    codeVerifier,
  };
}

export async function exchangeSignicatCodeForTokens(params: {
  code: string;
  codeVerifier: string;
  redirectUri?: string;
}) {
  const discovery = await getSignicatOidcDiscovery();
  const clientId = requireEnv("SIGNICAT_OIDC_CLIENT_ID");
  const clientSecret = requireEnv("SIGNICAT_OIDC_CLIENT_SECRET");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri || getSignicatRedirectUri(),
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: params.codeVerifier,
  });

  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | (TokenResponse & { error?: string; error_description?: string })
    | null;
  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || payload?.error || "Signicat token exchange failed");
  }
  return payload;
}

export async function fetchSignicatUserInfo(accessToken: string): Promise<UserInfo> {
  const discovery = await getSignicatOidcDiscovery();
  const response = await fetch(discovery.userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as (UserInfo & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error || `Signicat userinfo failed (${response.status})`);
  }
  return payload || {};
}
