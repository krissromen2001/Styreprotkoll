import Link from "next/link";
import { verifyEmailToken } from "@/lib/actions/auth";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailToken(token) : { error: "Mangler token" };

  if (result?.success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm border max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-2">E-post bekreftet</h1>
          <p className="text-gray-600 mb-6">Du kan nå logge inn.</p>
          <Link
            href="/auth/signin"
            className="inline-block bg-black text-white px-6 py-2.5 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            Logg inn
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-sm border max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-2">Ugyldig lenke</h1>
        <p className="text-gray-600 mb-6">
          {result?.error ?? "Lenken er utløpt eller allerede brukt."}
        </p>
        <Link
          href="/auth/signup"
          className="inline-block px-6 py-2.5 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          Opprett ny konto
        </Link>
      </div>
    </div>
  );
}
