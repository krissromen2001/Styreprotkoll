import Link from "next/link";
import { MEETING_STATUS_LABELS, MEETING_STATUS_COLORS } from "@/lib/constants";

// Empty until DB is connected — meetings will be fetched from database
const meetings: {
  id: string;
  date: string;
  time: string;
  status: string;
  room: string;
  agendaCount: number;
  signatureCount: number;
  totalMembers: number;
}[] = [];

export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Styremøter</h1>
          <p className="text-gray-600 mt-1">Oversikt over alle styremøter</p>
        </div>
        <Link
          href="/meetings/new"
          className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          Nytt møte
        </Link>
      </div>

      {meetings.length > 0 ? (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <Link
              key={meeting.id}
              href={`/meetings/${meeting.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-gray-900">
                      Styremøte {meeting.date}
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
                    Kl. {meeting.time} — {meeting.room}
                  </p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>{meeting.agendaCount} saker</p>
                  {(meeting.status === "pending_signatures" || meeting.status === "signed") && (
                    <p>
                      {meeting.signatureCount}/{meeting.totalMembers} signaturer
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
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
