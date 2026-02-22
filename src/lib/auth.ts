import NextAuth from "next-auth";
import type { Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";
import { db } from "./db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SIGNICAT_ACCESS_COOKIE, fetchSignicatUserInfo } from "@/lib/signicat-oidc";

const googleProviderEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

const nextAuthConfig = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-post", type: "email" },
        password: { label: "Passord", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string)?.toLowerCase().trim();
        const password = credentials?.password as string;

        if (!email || !password) return null;

        const rows = await db.select().from(users).where(eq(users.email, email));
        const user = rows[0];
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        if (!user.emailVerified) {
          return null;
        }

        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
    ...(googleProviderEnabled
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account }) {
      // For Google sign-in, ensure the JWT carries the local app user ID (users.id).
      if (account?.provider === "google" && token.email) {
        const email = token.email.toLowerCase().trim();
        const rows = await db.select().from(users).where(eq(users.email, email));
        const existingUser = rows[0];

        if (existingUser) {
          if (!existingUser.emailVerified) {
            await db
              .update(users)
              .set({ emailVerified: new Date() })
              .where(eq(users.id, existingUser.id));
          }
          token.sub = existingUser.id;
        } else {
          const created = await db
            .insert(users)
            .values({
              email,
              name: typeof token.name === "string" ? token.name : null,
              passwordHash: null,
              emailVerified: new Date(),
            })
            .returning({ id: users.id });

          if (created[0]?.id) {
            token.sub = created[0].id;
          }
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});

export const { handlers, signIn, signOut, auth: nextAuthAuth } = nextAuthConfig;

type AppSession = (Session & {
  user?: Session["user"] & { id?: string };
}) | null;

const SUPABASE_ACCESS_COOKIE = "sp_access_token";
const SIGNICAT_SESSION_DURATION_MS = 60 * 60 * 1000;

async function getSignicatCookieSession(): Promise<AppSession> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(SIGNICAT_ACCESS_COOKIE)?.value;
  if (!accessToken) return null;

  let profile: Awaited<ReturnType<typeof fetchSignicatUserInfo>>;
  try {
    profile = await fetchSignicatUserInfo(accessToken);
  } catch {
    return null;
  }

  const email = profile.email?.toLowerCase().trim();
  if (!email) return null;

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let localUser = existing[0];

  if (!localUser) {
    const created = await db
      .insert(users)
      .values({
        email,
        name:
          profile.name?.trim() ||
          [profile.given_name, profile.family_name].filter(Boolean).join(" ").trim() ||
          null,
        passwordHash: null,
        emailVerified: new Date(),
      })
      .returning();
    localUser = created[0];
  } else if (!localUser.emailVerified) {
    const updated = await db
      .update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.id, localUser.id))
      .returning();
    localUser = updated[0] ?? localUser;
  }

  if (!localUser) return null;

  return {
    user: {
      id: localUser.id,
      email: localUser.email,
      name: localUser.name ?? profile.name ?? null,
    },
    expires: new Date(Date.now() + SIGNICAT_SESSION_DURATION_MS).toISOString(),
  } as AppSession;
}

async function getSupabaseCookieSession(): Promise<AppSession> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(SUPABASE_ACCESS_COOKIE)?.value;
  if (!accessToken) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  const email = data.user.email?.toLowerCase().trim();
  if (!email) return null;

  const localById = await db.select().from(users).where(eq(users.id, data.user.id));
  let localUser = localById[0];
  if (!localUser) {
    const localByEmail = await db.select().from(users).where(eq(users.email, email));
    localUser = localByEmail[0];
  }

  if (!localUser) {
    return null;
  }

  return {
    user: {
      id: localUser.id,
      email: localUser.email,
      name: localUser.name ?? data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null,
    },
    expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  } as AppSession;
}

export async function auth(): Promise<AppSession> {
  const signicatSession = await getSignicatCookieSession();
  if (signicatSession?.user?.id) {
    return signicatSession;
  }

  const supabaseSession = await getSupabaseCookieSession();
  if (supabaseSession?.user?.id) {
    return supabaseSession;
  }

  return nextAuthAuth();
}
