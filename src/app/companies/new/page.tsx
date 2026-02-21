"use client";

import { useState } from "react";

interface BrregResult {
  name: string;
  orgNumber: string;
  address: string;
  postalCode: string;
  city: string;
  boardMembers: { name: string; role: string }[];
}

export default function NewCompanyPage() {
  const [orgNumber, setOrgNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BrregResult | null>(null);
  const [emails, setEmails] = useState<Record<number, string>>({});

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/brreg?orgNumber=${orgNumber}`);
    if (!res.ok) {
      setError("Fant ikke selskapet. Sjekk organisasjonsnummeret.");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  const handleRegister = async () => {
    // Will connect to server action later
    alert("Registrering kommer snart — databasen er ikke koblet til ennå.");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Registrer selskap</h1>
      <p className="text-gray-600 mb-6">
        Skriv inn organisasjonsnummeret for å hente selskapsinformasjon fra Brønnøysundregistrene.
      </p>

      <form onSubmit={handleLookup} className="flex gap-3 mb-8">
        <input
          type="text"
          value={orgNumber}
          onChange={(e) => setOrgNumber(e.target.value)}
          placeholder="Organisasjonsnummer (f.eks. 936006418)"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading || !orgNumber.trim()}
          className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {loading ? "Søker..." : "Hent info"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">{error}</div>
      )}

      {result && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-3">Selskapsinformasjon</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500">Navn</dt>
              <dd className="font-medium">{result.name}</dd>
              <dt className="text-gray-500">Org.nr.</dt>
              <dd className="font-medium">{result.orgNumber}</dd>
              <dt className="text-gray-500">Adresse</dt>
              <dd className="font-medium">{result.address}</dd>
              <dt className="text-gray-500">Poststed</dt>
              <dd className="font-medium">
                {result.postalCode} {result.city}
              </dd>
            </dl>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">
              Styremedlemmer fra Brønnøysundregistrene
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Legg til e-postadresse for hvert styremedlem slik at de kan logge inn og signere protokoller.
            </p>
            <div className="space-y-3">
              {result.boardMembers.map((member, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                  </div>
                  <input
                    type="email"
                    placeholder="epost@eksempel.no"
                    value={emails[idx] || ""}
                    onChange={(e) =>
                      setEmails({ ...emails, [idx]: e.target.value })
                    }
                    className="w-64 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleRegister}
            className="w-full bg-black text-white py-2.5 px-4 rounded-md hover:bg-gray-800 transition-colors font-medium"
          >
            Registrer selskap
          </button>
        </div>
      )}
    </div>
  );
}
