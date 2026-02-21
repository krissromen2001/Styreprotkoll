"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const verify = searchParams.get("verify");
  const error = searchParams.get("error");

  if (verify) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm border max-w-md w-full text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h1 className="text-2xl font-bold mb-2">Sjekk e-posten din</h1>
          <p className="text-gray-600">
            Vi har sendt deg en innloggingslenke. Klikk på lenken i e-posten for å logge inn.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn("email", { email, callbackUrl: "/" });
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-sm border max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">Logg inn</h1>
        <p className="text-gray-600 mb-6">
          Skriv inn e-postadressen din for å motta en innloggingslenke.
        </p>
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm mb-4">
            Du har ikke tilgang til å logge inn med denne e-posten.
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            E-postadresse
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="din@epost.no"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent mb-4"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Sender..." : "Send innloggingslenke"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
