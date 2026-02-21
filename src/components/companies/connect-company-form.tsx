"use client";

import { useMemo, useState } from "react";
import { connectCompanyForUser } from "@/lib/actions/companies";

interface BrregResult {
  name: string;
  orgNumber: string;
  address: string;
  postalCode: string;
  city: string;
  boardMembers: { name: string; role: string }[];
}

export function ConnectCompanyForm({ userName }: { userName: string | null | undefined }) {
  const [orgNumber, setOrgNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BrregResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const matchingIndex = useMemo(() => {
    if (!result || !userName) return null;
    const normalizedUser = userName.toLowerCase().trim();
    const matches = result.boardMembers
      .map((m, idx) => ({
        idx,
        name: m.name.toLowerCase().trim(),
      }))
      .filter((m) => m.name === normalizedUser);
    if (matches.length === 1) return matches[0].idx;
    return null;
  }, [result, userName]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setSelectedIndex(null);

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

  const handleConnect = async () => {
    if (!result) return;
    const idx = selectedIndex ?? matchingIndex;
    if (idx === null || idx === undefined) {
      setError("Velg hvem du er i listen");
      return;
    }

    setSubmitting(true);
    setError("");

    const formData = new FormData();
    formData.set("orgNumber", result.orgNumber);
    formData.set("memberIndex", String(idx));

    const response = await connectCompanyForUser(formData);
    if (response?.error) {
      setError(response.error);
      setSubmitting(false);
      return;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Koble til selskap</h1>
      <p className="text-gray-600 mb-6">
        Søk etter organisasjonsnummeret for å hente roller fra Brønnøysundregistrene.
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
            <h2 className="text-lg font-semibold mb-3">Velg hvem du er</h2>
            <p className="text-sm text-gray-500 mb-4">
              Vi prøver å matche deg automatisk. Hvis vi ikke finner deg, velg riktig person i listen.
            </p>
            <div className="space-y-2">
              {result.boardMembers.map((member, idx) => {
                const isSuggested = matchingIndex === idx;
                const isSelected = (selectedIndex ?? matchingIndex) === idx;
                return (
                  <label
                    key={`${member.name}-${idx}`}
                    className={`flex items-center gap-3 p-3 rounded-md border ${
                      isSelected ? "border-black bg-gray-50" : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="member"
                      checked={isSelected}
                      onChange={() => setSelectedIndex(idx)}
                    />
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                      {isSuggested && (
                        <p className="text-xs text-green-600 mt-1">Foreslått match</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleConnect}
            disabled={submitting}
            className="w-full bg-black text-white py-2.5 px-4 rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors font-medium"
          >
            {submitting ? "Kobler til..." : "Koble til selskap"}
          </button>
        </div>
      )}
    </div>
  );
}
