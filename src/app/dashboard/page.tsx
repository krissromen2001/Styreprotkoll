import Link from "next/link";
import { MEETING_STATUS_LABELS, MEETING_STATUS_COLORS, MEETING_TYPE_LABELS } from "@/lib/constants";
import {
  getAgendaItems,
  getSignatures,
  getCompaniesForUser,
  getMeetings,
  getBoardMembers,
} from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { getSelectedCompanyId } from "@/lib/company-selection";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
        <div className="text-4xl mb-4">&#128272;</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Logg inn for å fortsette</h2>
        <p className="text-gray-500 mb-6">
          Du må logge inn for å se styremøter og administrere selskap.
        </p>
        <Link
          href="/auth/signin"
          className="inline-block bg-black text-white px-6 py-2.5 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          Logg inn
        </Link>
      </div>
    );
  }

  const companies = await getCompaniesForUser(session.user.email);

  // If no company registered, show onboarding
  if (companies.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
        <div className="text-4xl mb-4">&#128203;</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Velkommen til Styreprotokoll</h2>
        <p className="text-gray-500 mb-6">
          Koble til selskapet ditt ved å søke i Brønnøysundregistrene.
        </p>
        <Link
          href="/companies/connect"
          className="inline-block bg-black text-white px-6 py-2.5 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          Koble til selskap
        </Link>
      </div>
    );
  }

  const selectedId = (await getSelectedCompanyId()) ?? companies[0].id;
  const activeCompany = companies.find((c) => c.id === selectedId) ?? companies[0];
  const meetings = await getMeetings(activeCompany.id);

  const meetingCards = await Promise.all(
    meetings.map(async (meeting) => {
      const items = await getAgendaItems(meeting.id);
      const sigs = await getSignatures(meeting.id);
      const members = await getBoardMembers(activeCompany.id);
      const signedCount = sigs.filter((s) => s.signedAt).length;

      return (
        <Link
          key={meeting.id}
          href={`/meetings/${meeting.id}`}
          className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-gray-900">
                  {MEETING_TYPE_LABELS[meeting.type]} – {formatDate(meeting.date)}
                </h2>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    MEETING_STATUS_COLORS[meeting.status]
                  }`}
                >
                  {MEETING_STATUS_LABELS[meeting.status]}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Kl. {meeting.time} — {meeting.room || meeting.address}
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>{items.length} saker</p>
              {(meeting.status === "pending_signatures" || meeting.status === "signed") && (
                <p>
                  {signedCount}/{members.filter((m) => m.active).length} signaturer
                </p>
              )}
            </div>
          </div>
        </Link>
      );
    })
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Styremøter</h1>
          <p className="text-gray-600 mt-1">{activeCompany.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/meetings/new"
            className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            Nytt møte
          </Link>
        </div>
      </div>

      {meetings.length > 0 ? (
        <div className="space-y-3">{meetingCards}</div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="text-4xl mb-4">&#128203;</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Ingen styremøter ennå</h2>
          <p className="text-gray-500 mb-6">
            Kom i gang ved å opprette ditt første styremøte.
          </p>
          <Link
            href="/meetings/new"
            className="inline-block bg-black text-white px-6 py-2.5 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            Opprett første møte
          </Link>
        </div>
      )}
    </div>
  );
}
