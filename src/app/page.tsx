import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="grid gap-10 lg:grid-cols-2 items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Styreprotokoll</p>
          <h1 className="text-4xl sm:text-5xl font-semibold text-slate-900 mt-3 font-display">
            Styremøter som føles ryddige, rolige og profesjonelle.
          </h1>
          <p className="text-slate-600 mt-4 text-lg">
            Lag innkalling, protokoll og signering på minutter. Alt samlet per selskap
            med tydelig flyt og sikker lagring.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/auth/signin"
              className="px-6 py-3 rounded-full border border-black/10 hover:bg-white transition-colors text-sm font-medium"
            >
              Logg inn
            </Link>
            <Link
              href="/auth/signup"
              className="bg-slate-900 text-white px-6 py-3 rounded-full hover:bg-black transition-colors text-sm font-medium shadow-sm"
            >
              Opprett bruker
            </Link>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            For styreledere, daglig ledere og møteansvarlige.
          </p>
        </div>
        <div className="bg-white/80 border border-black/5 rounded-3xl p-6 shadow-sm">
          <div className="border border-black/5 rounded-2xl p-5 bg-slate-50">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Eksempel</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              Styremøte – 21.02.2026
            </h3>
            <p className="text-sm text-slate-600 mt-1">ROMEN HOLDING AS</p>
            <div className="mt-4 grid gap-3">
              <div className="bg-white rounded-xl border border-black/5 p-3">
                <p className="text-sm font-medium text-slate-900">1.26 Åpning av møtet</p>
                <p className="text-xs text-slate-500 mt-1">Styreleder åpner møtet.</p>
              </div>
              <div className="bg-white rounded-xl border border-black/5 p-3">
                <p className="text-sm font-medium text-slate-900">2.26 Budsjett</p>
                <p className="text-xs text-slate-500 mt-1">Gjennomgang av forslag.</p>
              </div>
              <div className="bg-white rounded-xl border border-black/5 p-3">
                <p className="text-sm font-medium text-slate-900">Digital signering</p>
                <p className="text-xs text-slate-500 mt-1">Sendes til alle styremedlemmer.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: "Automatisert innkalling",
            body: "Hent data fra Brønnøysund, ferdige maler og riktig agenda-nummerering.",
          },
          {
            title: "Protokoll på sekunder",
            body: "Skriv beslutninger per sak og send til signering med et klikk.",
          },
          {
            title: "Trygg lagring",
            body: "Alle dokumenter lagres samlet per selskap med full historikk.",
          },
        ].map((item) => (
          <div key={item.title} className="bg-white/80 border border-black/5 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
            <p className="text-sm text-slate-600 mt-2">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="bg-white/80 border border-black/5 rounded-3xl p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Pris</p>
            <h2 className="text-3xl font-semibold text-slate-900 mt-2 font-display">Enkel og forutsigbar</h2>
            <p className="text-slate-600 mt-3">
              100 NOK per selskap per måned. Ubegrensede møter og dokumenter.
            </p>
          </div>
          <Link
            href="/auth/signup"
            className="bg-slate-900 text-white px-6 py-3 rounded-full hover:bg-black transition-colors text-sm font-medium shadow-sm"
          >
            Opprett bruker
          </Link>
        </div>
      </section>
    </div>
  );
}
