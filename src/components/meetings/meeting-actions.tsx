"use client";

import Link from "next/link";
import { sendInvitation, sendForSignatures } from "@/lib/actions/meetings";

export function MeetingActions({
  meetingId,
  status,
  canManage = false,
}: {
  meetingId: string;
  status: string;
  canManage?: boolean;
}) {
  return (
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
            onClick={() => sendInvitation(meetingId)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Send innkalling
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
            onClick={() => sendForSignatures(meetingId)}
            className="px-3 py-1.5 text-sm bg-black text-white rounded-md hover:bg-gray-800"
          >
            Send til signering
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
    </div>
  );
}
