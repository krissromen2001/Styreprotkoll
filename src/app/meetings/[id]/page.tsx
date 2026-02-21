import Link from "next/link";
import { MEETING_STATUS_LABELS, MEETING_STATUS_COLORS } from "@/lib/constants";

// Will be fetched from DB by meeting ID
// For now show a placeholder structure
export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // TODO: Fetch from database
  // const meeting = await db.query.meetings.findFirst({ where: eq(meetings.id, id) });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">
          Møte med ID <code className="bg-gray-100 px-2 py-1 rounded text-sm">{id}</code> vil vises her når databasen er koblet til.
        </p>
        <Link
          href="/"
          className="text-sm text-black hover:underline"
        >
          Tilbake til oversikten
        </Link>
      </div>
    </div>
  );
}
