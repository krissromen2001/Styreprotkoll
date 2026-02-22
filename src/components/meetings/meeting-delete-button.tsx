"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteMeeting } from "@/lib/actions/meetings";

export function MeetingDeleteButton({
  meetingId,
  variant = "text",
}: {
  meetingId: string;
  variant?: "text" | "icon";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    const ok = window.confirm("Er du sikker på at du vil slette møtet? Dette kan ikke angres.");
    if (!ok) return;

    setLoading(true);
    const result = await deleteMeeting(meetingId);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.refresh();
  };

  return (
    <div className={variant === "icon" ? "flex items-center" : "flex flex-col items-start gap-2"}>
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        aria-label="Slett møte"
        title="Slett møte"
        className={
          variant === "icon"
            ? "inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
            : "px-4 py-2 rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm font-medium"
        }
      >
        {variant === "icon" ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        ) : loading ? (
          "Sletter..."
        ) : (
          "Slett møte"
        )}
      </button>
      {error && variant === "text" && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
