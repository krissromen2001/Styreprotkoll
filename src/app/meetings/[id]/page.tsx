import Link from "next/link";
import { notFound } from "next/navigation";
import { MEETING_STATUS_LABELS, MEETING_STATUS_COLORS, ROLE_LABELS, MEETING_TYPE_LABELS } from "@/lib/constants";
import {
  getMeeting,
  getAgendaItems,
  getCompany,
  getSignatures,
  getBoardMembers,
  getBoardMemberByEmail,
} from "@/lib/store";
import { getSignedProtocolUrl } from "@/lib/protocol-storage";
import { formatAgendaNumber, formatDate } from "@/lib/utils";
import { MeetingActions } from "@/components/meetings/meeting-actions";
import { auth } from "@/lib/auth";
import { regenerateSignedProtocol } from "@/lib/actions/meetings";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.email) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Du må logge inn for å se møtedetaljer.</p>
        <Link href="/auth/signin" className="text-sm text-black hover:underline">
          Logg inn
        </Link>
      </div>
    );
  }

  const meeting = await getMeeting(id);
  if (!meeting) notFound();

  const member = await getBoardMemberByEmail(meeting.companyId, session.user.email);
  if (!member) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Du har ikke tilgang til dette møtet.</p>
        <Link href="/dashboard" className="text-sm text-black hover:underline">
          Tilbake til oversikten
        </Link>
      </div>
    );
  }

  const company = await getCompany(meeting.companyId);
  const items = await getAgendaItems(meeting.id);
  const sigs = await getSignatures(meeting.id);
  const protocolUrl = meeting.protocolStoragePath
    ? await getSignedProtocolUrl(meeting.protocolStoragePath)
    : null;
  const members = company ? await getBoardMembers(company.id) : [];
  const canManage = member.role === "styreleder";

  const hasProtocol = ["protocol_draft", "pending_signatures", "signed"].includes(meeting.status);
  const hasSignatures = ["pending_signatures", "signed"].includes(meeting.status);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-2">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Tilbake til oversikten
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {MEETING_TYPE_LABELS[meeting.type]} – {formatDate(meeting.date)}
            </h1>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${MEETING_STATUS_COLORS[meeting.status]}`}>
              {MEETING_STATUS_LABELS[meeting.status]}
            </span>
          </div>
          {company && (
            <p className="text-gray-500">{company.name} (org.nr. {company.orgNumber})</p>
          )}
        </div>
        <MeetingActions meetingId={meeting.id} status={meeting.status} canManage={canManage} />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">Adresse</dt>
          <dd>{meeting.address}</dd>
          <dt className="text-gray-500">Rom</dt>
          <dd>{meeting.room || "—"}</dd>
          <dt className="text-gray-500">Dato</dt>
          <dd>{formatDate(meeting.date)}</dd>
          <dt className="text-gray-500">Klokkeslett</dt>
          <dd>{meeting.time}</dd>
        </dl>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          {hasProtocol ? "Protokoll" : "Dagsorden"}
        </h2>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
              <h3 className="font-medium text-sm">
                {formatAgendaNumber(item.sortOrder, meeting.date)} {item.title}
              </h3>
              {hasProtocol && item.decision ? (
                <p className="text-sm text-gray-600 mt-1">{item.decision}</p>
              ) : (
                item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {meeting.status === "signed" && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">Signert protokoll</h2>
          <div className="flex flex-wrap gap-3">
            {protocolUrl ? (
              <Link
                href={protocolUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                Last ned signert protokoll
              </Link>
            ) : (
              <span className="text-sm text-gray-500">Ingen fil lagret ennå.</span>
            )}
            {canManage && (
              <form action={regenerateSignedProtocol}>
                <input type="hidden" name="meetingId" value={meeting.id} />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Regenerer protokoll
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {hasSignatures && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            Signaturer ({sigs.filter((s) => s.signedAt).length}/{sigs.length})
          </h2>
          <div className="space-y-2">
            {sigs.map((sig) => {
              const memberForSig = members.find((m) => m.id === sig.boardMemberId) || null;
              return (
                <div key={sig.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    {memberForSig?.role === "styreleder" && (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-black text-white text-xs font-bold">
                        S
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-medium">{memberForSig?.name || "Ukjent"}</p>
                      <p className="text-xs text-gray-500">{memberForSig ? ROLE_LABELS[memberForSig.role] : ""}</p>
                    </div>
                  </div>
                  {sig.signedAt ? (
                    <span className="text-xs text-green-600 font-medium">
                      Signert {new Date(sig.signedAt).toLocaleDateString("nb-NO")}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Venter</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
