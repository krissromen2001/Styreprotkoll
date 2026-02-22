"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { submitFeedback } from "@/lib/actions/feedback";

export default function FeedbackPage() {
  const pathname = usePathname();
  const [category, setCategory] = useState("feedback");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("category", category);
    formData.set("message", message);
    formData.set("pagePath", pathname || "/feedback");

    const result = await submitFeedback(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess("Takk! Tilbakemeldingen er sendt.");
    setMessage("");
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Tilbake
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h1 className="text-2xl font-semibold text-gray-900">Gi tilbakemelding</h1>
        <p className="text-sm text-gray-600 mt-2">
          Send inn ideer, feil eller forbedringsforslag direkte fra appen.
        </p>

        {error && <div className="mt-4 rounded-md bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
        {success && <div className="mt-4 rounded-md bg-emerald-50 text-emerald-700 p-3 text-sm">{success}</div>}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="feedback">Tilbakemelding</option>
              <option value="bug">Feil</option>
              <option value="feature">Funksjonsønske</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Melding</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              required
              placeholder="Hva fungerer bra, hva kan bli bedre, eller hva mangler?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Sender..." : "Send tilbakemelding"}
          </button>
        </form>
      </div>
    </div>
  );
}
