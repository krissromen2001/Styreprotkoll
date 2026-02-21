"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CompanySwitcherMenu } from "@/components/layout/company-switcher-menu";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/meetings/new", label: "Nytt møte" },
];

export function Header() {
  const pathname = usePathname();

  // Hide header on auth pages
  if (pathname?.startsWith("/auth")) return null;

  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/70 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-semibold tracking-tight text-slate-900">
            Styreprotokoll
          </Link>
          <div className="flex items-center gap-3">
            {pathname === "/" ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/signin"
                  className="px-5 py-2 rounded-full border border-black/10 hover:bg-white transition-colors text-sm font-medium"
                >
                  Logg inn
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-slate-900 text-white px-5 py-2 rounded-full hover:bg-black transition-colors text-sm font-medium shadow-sm"
                >
                  Opprett bruker
                </Link>
              </div>
            ) : (
              <>
                <nav className="flex items-center gap-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                        pathname === item.href
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white"
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <div className="hidden sm:block">
                  <CompanySwitcherMenu />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
