import Link from "next/link";

export default function OmOssPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-2">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Tilbake til forsiden
        </Link>
      </div>

      <section className="rounded-3xl border border-[#0f2745]/10 bg-white p-6 sm:p-8 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Om oss</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-slate-900 font-display">
              Bygget for enklere styrearbeid
            </h1>
          </div>
          <div className="space-y-3 text-sm sm:text-base text-slate-600 leading-relaxed">
            <p>
              Styreprotokoll er laget for selskaper som vil bruke mindre tid på administrasjon og mer tid på gode beslutninger.
            </p>
            <p>
              Vi samler innkalling, protokoll, vedlegg, signering og oppfølging i én enkel arbeidsflyt.
            </p>
            <p>
              Målet er å gjøre styrearbeid tydelig, profesjonelt og lett å gjennomføre – også for små og mellomstore selskaper.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
