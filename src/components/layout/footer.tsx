import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-black/5 mt-12">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
          <p className="text-slate-500">Styreprotokoll</p>
          <div className="flex items-center gap-4">
            <Link href="/feedback" className="text-slate-600 hover:text-slate-900 transition-colors">
              Gi tilbakemelding
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
