import Link from "next/link";

export default async function ProtocolPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  // TODO: Fetch meeting + agenda items from DB
  // Pre-fill agenda items from the invitation

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">
          Protokollredigering for møte <code className="bg-gray-100 px-2 py-1 rounded text-sm">{id}</code> vil vises her når databasen er koblet til.
        </p>
        <Link href="/" className="text-sm text-black hover:underline">
          Tilbake til oversikten
        </Link>
      </div>
    </div>
  );
}
