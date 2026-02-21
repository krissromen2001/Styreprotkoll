"use client";

import { toggleBoardMemberActive, removeBoardMember } from "@/lib/actions/board-members";

export function BoardMemberActions({
  memberId,
  active,
  canManage = true,
}: {
  memberId: string;
  active: boolean;
  canManage?: boolean;
}) {
  if (!canManage) return null;

  return (
    <div className="flex gap-2">
      <button
        onClick={() => toggleBoardMemberActive(memberId)}
        className="text-xs text-gray-500 hover:text-gray-700"
      >
        {active ? "Deaktiver" : "Aktiver"}
      </button>
      <button
        onClick={() => removeBoardMember(memberId)}
        className="text-xs text-red-500 hover:text-red-700"
      >
        Fjern
      </button>
    </div>
  );
}
