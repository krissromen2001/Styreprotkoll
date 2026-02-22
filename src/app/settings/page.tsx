import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-2">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Tilbake til dashboard
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Innstillinger</h1>
        <p className="text-gray-600 mt-2">
          Her kan du administrere brukerinnstillinger og konto. Flere valg kommer snart.
        </p>

        <div className="mt-6 rounded-xl border border-black/10 bg-slate-50 p-4">
          <p className="text-sm text-slate-700">
            Innlogget som <span className="font-medium">{session.user.email}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
