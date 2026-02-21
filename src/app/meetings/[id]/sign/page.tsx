import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getMeeting,
  getBoardMember,
  getBoardMemberByEmail,
  getSignatureByMember,
  getSigningTokenByToken,
} from "@/lib/store";
import { signProtocolAsUser, signProtocolWithToken } from "@/lib/actions/meetings";

export default async function SignProtocolPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const meeting = await getMeeting(id);
  if (!meeting) notFound();
  const meetingId = meeting.id;

  const sp = searchParams ? await searchParams : undefined;
  const token = sp?.token;

  if (token) {
    const signingToken = await getSigningTokenByToken(token);
    if (!signingToken || signingToken.meetingId !== meeting.id) {
      return (
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">Ugyldig eller utløpt signeringslenke.</p>
            <Link href="/" className="text-sm text-black hover:underline">
              Tilbake til oversikten
            </Link>
          </div>
        </div>
      );
    }

    if (signingToken.usedAt || signingToken.expiresAt.getTime() < Date.now()) {
      return (
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">Signeringslenken er utløpt eller allerede brukt.</p>
            <Link href="/" className="text-sm text-black hover:underline">
              Tilbake til oversikten
            </Link>
          </div>
        </div>
      );
    }

    const member = await getBoardMember(signingToken.boardMemberId);
    const sig = await getSignatureByMember(meetingId, signingToken.boardMemberId);
    if (sig?.signedAt) {
      return (
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">Du har allerede signert denne protokollen.</p>
            <Link href="/" className="text-sm text-black hover:underline">
              Tilbake til oversikten
            </Link>
          </div>
        </div>
      );
    }

    async function signWithTokenAction(formData: FormData) {
      "use server";
      const typedName = (formData.get("typedName") as string) || "";
      const tokenValue = formData.get("token") as string;
      await signProtocolWithToken(tokenValue, typedName);
    }

    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Signer protokoll</h1>
        <p className="text-gray-600 mb-6">
          Du signerer som {member?.name || "styremedlem"}.
        </p>

        <form action={signWithTokenAction} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <input type="hidden" name="token" value={token} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Navn (skrivesignatur)</label>
            <input
              type="text"
              name="typedName"
              required
              defaultValue={member?.name || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
          >
            Signer
          </button>
        </form>
      </div>
    );
  }

  const session = await auth();
  if (!session?.user?.email) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">Logg inn for å signere i appen.</p>
          <Link href="/auth/signin" className="text-sm text-black hover:underline">
            Logg inn
          </Link>
        </div>
      </div>
    );
  }

  const member = await getBoardMemberByEmail(meeting.companyId, session.user.email);
  if (!member) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">Du er ikke registrert som styremedlem for dette møtet.</p>
          <Link href="/" className="text-sm text-black hover:underline">
            Tilbake til oversikten
          </Link>
        </div>
      </div>
    );
  }

  const sig = await getSignatureByMember(meeting.id, member.id);
  if (sig?.signedAt) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">Du har allerede signert denne protokollen.</p>
          <Link href="/" className="text-sm text-black hover:underline">
            Tilbake til oversikten
          </Link>
        </div>
      </div>
    );
  }

  async function signAsUserAction(formData: FormData) {
    "use server";
    const typedName = (formData.get("typedName") as string) || "";
    await signProtocolAsUser(meetingId, typedName);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Signer protokoll</h1>
      <p className="text-gray-600 mb-6">
        Du signerer som {member.name}.
      </p>

      <form action={signAsUserAction} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Navn (skrivesignatur)</label>
          <input
            type="text"
            name="typedName"
            required
            defaultValue={member.name}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
        >
          Signer
        </button>
      </form>
    </div>
  );
}
