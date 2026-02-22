"use client";

import { useEffect, useState } from "react";
import { registerUser } from "@/lib/actions/auth";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setGoogleAvailable(
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    );
  }, []);

  const handleGoogleSignUp = async () => {
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
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.set("name", name);
    formData.set("email", email);
    formData.set("password", password);

    const result = await registerUser(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess("Vi har sendt deg en e-post. Klikk lenken for å bekrefte kontoen.");
    setLoading(false);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-sm border max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">Opprett konto</h1>
        <p className="text-gray-600 mb-6">
          Lag en brukerkonto for å fortsette.
        </p>
        {googleAvailable && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignUp}
              className="w-full border border-gray-300 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors mb-4"
            >
              Fortsett med Google
            </button>
            <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
              <div className="h-px bg-gray-200 flex-1" />
              <span>Eller opprett konto med e-post</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>
          </>
        )}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-md text-sm mb-4">
            {success}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Fullt navn
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
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
              minLength={8}
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
            {loading ? "Oppretter..." : "Opprett konto"}
          </button>
        </form>
        <p className="text-sm text-gray-600 mt-4">
          Har du allerede bruker?{" "}
          <Link href="/auth/signin" className="text-black hover:underline">
            Logg inn
          </Link>
        </p>
      </div>
    </div>
  );
}
