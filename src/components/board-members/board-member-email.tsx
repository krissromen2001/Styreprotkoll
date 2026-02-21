"use client";

import { useState } from "react";
import { updateBoardMemberEmail } from "@/lib/actions/board-members";

export function BoardMemberEmail({
  memberId,
  email,
  canManage,
}: {
  memberId: string;
  email: string | null;
  canManage: boolean;
}) {
  const [value, setValue] = useState(email ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!canManage) return <span className="text-sm text-gray-500">{email || "—"}</span>;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const result = await updateBoardMemberEmail(memberId, value);
    if (result?.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="email"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="epost@eksempel.no"
          className="w-56 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs bg-black text-white px-2 py-1 rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Lagrer..." : "Lagre"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
