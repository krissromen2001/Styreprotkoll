"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendInvitation, sendForSignatures, deleteMeeting } from "@/lib/actions/meetings";

export function MeetingActions({
  meetingId,
  status,
  canManage = false,
}: {
  meetingId: string;
  status: string;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<"invite" | "sign" | "delete" | null>(null);

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

  const handleSign = async () => {
    setError(null);
    setSuccess(null);
    setLoading("sign");
    const result = await sendForSignatures(meetingId);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess("Sendt til signering");
      router.refresh();
    }
    setLoading(null);
  };

  const handleDelete = async () => {
    setError(null);
    setSuccess(null);
    const ok = window.confirm("Er du sikker på at du vil slette møtet? Dette kan ikke angres.");
    if (!ok) return;
    setLoading("delete");
    const result = await deleteMeeting(meetingId);
    if (result?.error) {
      setError(result.error);
      setLoading(null);
      return;
    }
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
              onClick={handleSign}
              disabled={loading === "sign"}
              className="px-3 py-1.5 text-sm bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {loading === "sign" ? "Sender..." : "Send til signering"}
            </button>
          </>
        )}
        {status === "pending_signatures" && (
          <Link
            href={`/meetings/${meetingId}/sign`}
            className="px-3 py-1.5 text-sm bg-black text-white rounded-md hover:bg-gray-800"
          >
            Signer protokoll
          </Link>
        )}
        {canManage && (
          <button
            onClick={handleDelete}
            disabled={loading === "delete"}
            className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
          >
            {loading === "delete" ? "Sletter..." : "Slett møte"}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
    </div>
  );
}
