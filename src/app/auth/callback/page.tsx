"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type CallbackState = "loading" | "success" | "error";

export default function SupabaseAuthCallbackPage() {
  const [state, setState] = useState<CallbackState>("loading");
  const [message, setMessage] = useState("Fullforer innlogging...");

  useEffect(() => {
    let active = true;

    async function syncUser() {
      try {
        const { data, error } = await getSupabaseBrowserClient().auth.getSession();
        if (error) throw error;

        const accessToken = data.session?.access_token;
        const refreshToken = data.session?.refresh_token;
        const expiresAt = data.session?.expires_at;
        const providerToken = data.session?.provider_token;
        const providerRefreshToken = data.session?.provider_refresh_token;
        if (!accessToken) {
          throw new Error("Missing Supabase session");
        }

        const response = await fetch("/api/auth/supabase/sync", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refreshToken,
            expiresAt,
            providerToken,
            providerRefreshToken,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || "Failed to sync local user");
        }

        if (!active) return;
        setState("success");
        setMessage("Innlogging vellykket. Sender deg videre...");
        window.location.assign("/dashboard");
      } catch (err) {
        if (!active) return;
        setState("error");
        setMessage(err instanceof Error ? err.message : "Innlogging feilet");
      }
    }

    syncUser();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="relative px-8 pt-8 pb-6 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
          <div className="absolute -top-10 -right-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-8 -left-6 h-20 w-20 rounded-full bg-blue-300/20 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div
              className={
                state === "loading"
                  ? "h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center"
                  : state === "success"
                    ? "h-12 w-12 rounded-2xl bg-emerald-400/20 border border-emerald-300/30 flex items-center justify-center text-emerald-200"
                    : "h-12 w-12 rounded-2xl bg-rose-400/20 border border-rose-300/30 flex items-center justify-center text-rose-200"
              }
            >
              {state === "loading" ? (
                <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : state === "success" ? (
                <span className="text-xl leading-none">✓</span>
              ) : (
                <span className="text-xl leading-none">!</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Google innlogging</h1>
              <p className="text-sm text-white/75 mt-1">
                {state === "loading"
                  ? "Klargjør kontoen din og kobler til appen..."
                  : state === "success"
                    ? "Innlogging fullført"
                    : "Innlogging feilet"}
              </p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          <div className="mb-5 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  state === "loading" ? "bg-slate-400 animate-pulse" : "bg-emerald-500"
                }`}
              />
              <span className="text-slate-700">Bekrefter Google-innlogging</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  state === "error"
                    ? "bg-rose-500"
                    : state === "success"
                      ? "bg-emerald-500"
                      : "bg-slate-300"
                }`}
              />
              <span className="text-slate-700">Synkroniserer brukerprofil og tilgang</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  state === "success" ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
              <span className="text-slate-700">Sender deg videre til dashboard</span>
            </div>
          </div>

          <div
            className={
              state === "error"
                ? "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                : state === "success"
                  ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                  : "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            }
          >
            {message}
          </div>

          {state === "error" && (
            <div className="mt-4 flex gap-3">
              <Link
                href="/auth/signin"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Tilbake til innlogging
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Gå til forsiden
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
