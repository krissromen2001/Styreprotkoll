import Link from "next/link";

const steps = [
  {
    nr: "01",
    title: "Opprett innkalling",
    short: "Møtedetaljer + dagsorden",
    accent: "bg-[#f4efe6]",
  },
  {
    nr: "02",
    title: "Skriv protokoll",
    short: "Beslutninger per sak",
    accent: "bg-[#eef3ee]",
  },
  {
    nr: "03",
    title: "Send til signering",
    short: "Ferdig PDF og oppfølging",
    accent: "bg-[#eaf0fb]",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-12 sm:space-y-16">
      <section className="flex justify-center">
        <div className="w-full max-w-4xl space-y-7 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0f2745]/10 bg-[#f5f8fd] px-3 py-1.5 text-xs text-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-[#143a66]" />
            Innkalling, protokoll og signering
          </div>

          <div className="flex justify-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl leading-[0.95] font-semibold text-slate-900 font-display tracking-tight">
              Styrearbeid,
              <br />
              gjort enkelt.
            </h1>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/auth/signup"
              className="rounded-full bg-[#102a4c] px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0b213d]"
            >
              Opprett bruker
            </Link>
            <Link
              href="/auth/signin"
              className="rounded-full border border-black/10 bg-white/80 px-6 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-white"
            >
              Logg inn
            </Link>
          </div>

          <p className="max-w-2xl text-sm sm:text-base text-slate-600">
            For styret som vil fokusere på menneskene, og ikke papirarbeidet.
          </p>
        </div>

      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] items-start">
        <div className="rounded-3xl border border-[#0f2745]/10 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Hvordan det fungerer</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-900 font-display">
                En enkel flyt, fra møte til signert protokoll
              </h2>
            </div>
            <Link
              href="/auth/signup"
              className="rounded-full border border-[#0f2745]/10 bg-[#edf3fc] px-5 py-2.5 text-sm font-medium text-[#102a4c] hover:bg-[#dfeaf8] transition-colors text-center"
            >
              Kom i gang
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.nr} className={`rounded-2xl border border-black/5 p-4 ${step.accent}`}>
                <p className="text-xs font-semibold tracking-[0.18em] text-[#294e79]">{step.nr}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{step.short}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative rounded-[28px] border border-[#0f2745]/10 bg-white p-4 shadow-sm">
          <div className="absolute -right-3 -top-3 h-24 w-24 rounded-full bg-[#dce8fb]" />
          <div className="absolute -left-4 bottom-8 h-16 w-16 rounded-full bg-[#102a4c]" />
          <div className="relative rounded-2xl border border-[#0f2745]/10 bg-[#f7f9fd] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Neste møte</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Styremøte • 21.02.2026</p>
                <p className="text-xs text-slate-500 mt-1">OLA NORDMAN HOLDING AS</p>
              </div>
              <div className="rounded-xl bg-white border border-[#0f2745]/10 px-3 py-2 text-right">
                <p className="text-[11px] text-slate-500">Status</p>
                <p className="text-xs font-semibold text-[#102a4c]">Utkast</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {[
                "Godkjennelse av innkalling og dagsorden",
                "Økonomioppdatering og regnskapsgjennomgang",
                "Strategi og neste steg",
              ].map((title, index) => (
                <div key={title} className="rounded-xl border border-[#0f2745]/10 bg-white px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="w-10 text-xs font-medium text-[#3d628e]">{index + 1}.26</span>
                    <span className="text-sm text-slate-800 leading-snug">{title}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[#0f2745]/10 bg-white p-3">
                <p className="text-[11px] text-slate-500">Protokoll</p>
                <p className="text-sm font-semibold text-[#102a4c] mt-1">Klar for utfylling</p>
              </div>
              <div className="rounded-xl border border-[#0f2745]/10 bg-white p-3">
                <p className="text-[11px] text-slate-500">Signering</p>
                <p className="text-sm font-semibold text-[#102a4c] mt-1">Send med ett klikk</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-[#0f2745]/10 bg-white p-6 sm:p-7 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Hvorfor Styreprotokoll</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-900 font-display">
            Mindre admin.
            <br />
            Mer kontroll.
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              "Ryddig agenda og nummerering",
              "PDF for innkalling og protokoll",
              "Digital signering og oppfølging",
              "Alt samlet per selskap",
            ].map((item) => (
              <div key={item} className="rounded-xl border border-[#0f2745]/10 bg-[#f7f9fd] px-3 py-3 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#0f2745]/20 bg-gradient-to-br from-[#0f2745] via-[#102a4c] to-[#183a63] p-6 sm:p-7 text-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-blue-100/80">Pris</p>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-4xl sm:text-5xl font-semibold font-display leading-none">100</span>
            <span className="text-sm text-blue-100/80 mb-1">NOK / selskap</span>
          </div>
          <p className="mt-4 text-sm text-blue-100/80">
            Engangsbetaling per selskap. Test med ett møte først.
          </p>
          <p className="mt-2 text-sm text-blue-100/70">
            Betal når du er klar til å ta løsningen i bruk videre.
          </p>
          <Link
            href="/auth/signup"
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-[#102a4c] transition-colors hover:bg-blue-50"
          >
            Opprett bruker
          </Link>
        </div>
      </section>

    </div>
  );
}
