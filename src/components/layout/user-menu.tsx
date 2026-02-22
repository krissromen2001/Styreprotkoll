"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logoutCurrentUser } from "@/lib/actions/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const logoutFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setOpen(false);
    try {
      await getSupabaseBrowserClient().auth.signOut();
    } catch {
      // Continue to server-side cookie cleanup
    }
    logoutFormRef.current?.requestSubmit();
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 2.5a4 4 0 100 8 4 4 0 000-8zM4.25 16.5A5.75 5.75 0 0110 10.75a5.75 5.75 0 015.75 5.75.75.75 0 01-.75.75H5a.75.75 0 01-.75-.75z" />
          </svg>
        </span>
        <span className="hidden sm:inline">Profil</span>
        <svg
          className={`h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 011.08 1.04l-4.25 4.515a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <form ref={logoutFormRef} action={logoutCurrentUser} className="hidden" />

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-2xl border border-black/10 bg-white p-2 shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
          role="menu"
        >
          <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Konto
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            role="menuitem"
          >
            Innstillinger
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-70"
            role="menuitem"
          >
            {loggingOut ? "Logger ut..." : "Logg ut"}
          </button>
        </div>
      )}
    </div>
  );
}
