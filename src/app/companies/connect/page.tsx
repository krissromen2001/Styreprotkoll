import { auth } from "@/lib/auth";
import Link from "next/link";
import { ConnectCompanyForm } from "@/components/companies/connect-company-form";

export default async function ConnectCompanyPage() {
  const session = await auth();
  if (!session?.user?.email) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Du må logge inn for å koble til selskap.</p>
        <Link href="/auth/signin" className="text-sm text-black hover:underline">
          Logg inn
        </Link>
      </div>
    );
  }

  return <ConnectCompanyForm userName={session.user.name} />;
}
