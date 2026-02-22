import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { EventueltChoiceField } from "@/components/meetings/eventuelt-choice-field";
import { getAgendaItems, getBoardMemberByEmail, getBoardMembers, getCompany, getMeeting, getMeetingAttendees } from "@/lib/store";
import { saveProtocolFromForm } from "@/lib/actions/meetings";
import { formatAgendaNumber, formatDate } from "@/lib/utils";
import { DEFAULT_LAST_AGENDA_ITEM, MEETING_TYPE_LABELS } from "@/lib/constants";

const APPROVAL_AGENDA_TITLE = "godkjennelse av innkalling og dagsorden";

export default async function ProtocolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Du må logge inn for å skrive protokoll.</p>
        <Link href="/auth/signin" className="text-sm text-black hover:underline">
          Logg inn
        </Link>
      </div>
    );
  }

  const meeting = await getMeeting(id);
  if (!meeting) notFound();

  const member = await getBoardMemberByEmail(meeting.companyId, session.user.email);
  if (!member || member.role !== "styreleder") {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Kun styreleder kan skrive protokoll.</p>
        <Link href={`/meetings/${meeting.id}`} className="text-sm text-black hover:underline">
          Tilbake til møtet
        </Link>
      </div>
    );
  }

  const company = await getCompany(meeting.companyId);
  const items = await getAgendaItems(meeting.id);
  const hasEventuelt = items.some(
    (item) => item.title.trim().toLowerCase() === DEFAULT_LAST_AGENDA_ITEM.title.toLowerCase()
  );
  const boardMembers = await getBoardMembers(meeting.companyId);
  const attendance = await getMeetingAttendees(meeting.id);
  const attendanceMap = new Map(attendance.map((a) => [a.boardMemberId, a.present]));

  const meetingId = meeting.id;

  async function handleSave(formData: FormData) {
    "use server";
    await saveProtocolFromForm(meetingId, formData);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-2">
        <Link href={`/meetings/${meeting.id}`} className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Tilbake til møtet
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Protokoll</h1>
        <p className="text-gray-600 mt-1">
          {MEETING_TYPE_LABELS[meeting.type]} – {formatDate(meeting.date)}
          {company ? ` — ${company.name}` : ""}
        </p>
      </div>

      <form action={handleSave} className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Tilstede</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {boardMembers.map((bm) => (
              <label key={bm.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={`present-${bm.id}`}
                  defaultChecked={attendanceMap.get(bm.id) ?? true}
                />
                <span>{bm.name} ({bm.role})</span>
              </label>
            ))}
          </div>
        </div>
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="font-semibold text-gray-900 mb-2">
              {formatAgendaNumber(item.sortOrder, meeting.date)} {item.title}
            </h2>
            {item.title.trim().toLowerCase() === APPROVAL_AGENDA_TITLE ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`approval-${item.id}`}
                      value="yes"
                      defaultChecked={(item.decision || "").toLowerCase().includes("godkjenner")}
                    />
                    <span>Ja</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`approval-${item.id}`}
                      value="no"
                      defaultChecked={
                        !!item.decision &&
                        !((item.decision || "").toLowerCase().includes("godkjenner"))
                      }
                    />
                    <span>Nei</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  Ved ja lagres: &quot;Styret godkjenner innkalling og dagsorden.&quot;
                </p>
              </div>
            ) : (
              <textarea
                name={`decision-${item.id}`}
                defaultValue={item.decision || ""}
                rows={4}
                placeholder="Skriv beslutning/konklusjon for saken"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
              />
            )}
          </div>
        ))}
        {!hasEventuelt && (
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-sm font-medium text-gray-900 mb-3">
              Er det {DEFAULT_LAST_AGENDA_ITEM.title.toLowerCase()}?
            </p>
            <EventueltChoiceField />
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            name="intent"
            value="draft"
            className="px-6 py-2.5 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
          >
            Lagre utkast
          </button>
          <button
            type="submit"
            name="intent"
            value="send_provider"
            className="bg-black text-white px-6 py-2.5 rounded-md hover:bg-gray-800 transition-colors font-medium"
          >
            Send og signer med BankID
          </button>
          <button
            type="submit"
            name="intent"
            value="send_legacy"
            className="px-6 py-2.5 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
          >
            Send for signering med e-post
          </button>
          <Link
            href={`/meetings/${meeting.id}`}
            className="px-6 py-2.5 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Avbryt
          </Link>
        </div>
      </form>
    </div>
  );
}
