"use client";

import { useState } from "react";
import { signIn as nextAuthSignIn } from "next-auth/react";
import { checkEmailVerification } from "@/lib/actions/auth";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    setGoogleAvailable(
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    );
  }, []);

  const handleGoogleSignIn = async () => {
    const redirectTo = `${window.location.origin}/auth/callback`;
    await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        scopes: "openid email profile https://www.googleapis.com/auth/calendar.events",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const status = await checkEmailVerification(email);
    if (status.exists && !status.verified) {
      setLoading(false);
      return window.location.assign("/auth/signin?error=EmailNotVerified");
    }
    await nextAuthSignIn("credentials", { email, password, callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-sm border max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">Logg inn</h1>
        <p className="text-gray-600 mb-6">
          Logg inn med e-post og passord.
        </p>
        {googleAvailable && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full border border-gray-300 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors"
            >
              Fortsett med Google
            </button>
            <div className="flex items-center gap-3 my-4 text-xs text-gray-500">
              <div className="h-px bg-gray-200 flex-1" />
              <span>Eller</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>
          </>
        )}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm mb-4">
            {error === "EmailNotVerified"
              ? "E-posten er ikke bekreftet enda. Sjekk innboksen din."
              : "Ugyldig e-post eller passord."}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-postadresse
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@epost.no"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Passord
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Logger inn..." : "Logg inn"}
          </button>
        </form>
        <p className="text-sm text-gray-600 mt-4">
          Har du ikke bruker? {" "}
          <Link href="/auth/signup" className="text-black hover:underline">
            Opprett konto
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
