"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendInvitation, sendForSignatures } from "@/lib/actions/meetings";

export function MeetingActions({
  meetingId,
  status,
  canManage = false,
  showInAppSignLink = true,
}: {
  meetingId: string;
  status: string;
  canManage?: boolean;
  showInAppSignLink?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<"invite" | "sign-provider" | "sign-legacy" | null>(null);

  const handleInvite = async () => {
    setError(null);
    setSuccess(null);
    setLoading("invite");
    const result = await sendInvitation(meetingId);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess("Innkalling sendt");
      router.refresh();
    }
    setLoading(null);
  };

  const handleSign = async (mode: "provider" | "legacy") => {
    setError(null);
    setSuccess(null);
    setLoading(mode === "provider" ? "sign-provider" : "sign-legacy");
    const result = await sendForSignatures(meetingId, mode);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(
        mode === "provider"
          ? "Sendt til BankID-signering"
          : "Sendt med signaturlenker"
      );
      router.refresh();
    }
    setLoading(null);
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        {canManage && status === "draft" && (
          <>
            <Link
              href={`/meetings/${meetingId}/edit`}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Rediger
            </Link>
            <button
              onClick={handleInvite}
              disabled={loading === "invite"}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading === "invite" ? "Sender..." : "Send innkalling"}
            </button>
          </>
        )}
        {canManage && status === "invitation_sent" && (
          <Link
            href={`/meetings/${meetingId}/protocol`}
            className="px-3 py-1.5 text-sm bg-black text-white rounded-md hover:bg-gray-800"
          >
            Skriv protokoll
          </Link>
        )}
        {canManage && status === "protocol_draft" && (
          <>
            <Link
              href={`/meetings/${meetingId}/protocol`}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Rediger protokoll
            </Link>
            <button
              onClick={() => handleSign("provider")}
              disabled={loading === "sign-provider" || loading === "sign-legacy"}
              className="px-3 py-1.5 text-sm bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {loading === "sign-provider" ? "Sender..." : "Send med BankID"}
            </button>
            <button
              onClick={() => handleSign("legacy")}
              disabled={loading === "sign-provider" || loading === "sign-legacy"}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {loading === "sign-legacy" ? "Sender..." : "Send med signaturlenke"}
            </button>
          </>
        )}
        {status === "pending_signatures" && showInAppSignLink && (
          <Link
            href={`/meetings/${meetingId}/sign`}
            className="px-3 py-1.5 text-sm bg-black text-white rounded-md hover:bg-gray-800"
          >
            Signer protokoll
          </Link>
        )}
        {status === "pending_signatures" && !showInAppSignLink && (
          <span className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-500">
            Signering pågår hos signeringsleverandør
          </span>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
    </div>
  );
}
