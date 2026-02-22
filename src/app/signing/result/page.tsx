import Link from "next/link";

export default function SigningResultPage() {
  return (
    <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-xl p-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Signering registrert</h1>
      <p className="text-sm text-gray-600 mb-4">
        Takk. Signeringen behandles nå av signeringsleverandøren. Status oppdateres automatisk i appen.
      </p>
      <Link href="/dashboard" className="inline-block px-4 py-2 rounded-md bg-black text-white text-sm">
        Til dashboard
      </Link>
    </div>
  );
}
