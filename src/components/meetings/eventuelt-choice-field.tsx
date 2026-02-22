"use client";

import { useState } from "react";

export function EventueltChoiceField() {
  const [choice, setChoice] = useState<"yes" | "no">("no");

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="radio"
          name="eventueltChoice"
          value="yes"
          checked={choice === "yes"}
          onChange={() => setChoice("yes")}
        />
        <span>Ja</span>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="radio"
          name="eventueltChoice"
          value="no"
          checked={choice === "no"}
          onChange={() => setChoice("no")}
        />
        <span>Nei</span>
      </label>
      <div className="mt-2">
        <textarea
          name="decision-eventuelt"
          rows={3}
          disabled={choice !== "yes"}
          placeholder="Beslutning/konklusjon for Eventuelt"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-500">
          Teksten brukes bare hvis du velger &quot;Ja&quot;.
        </p>
      </div>
    </div>
  );
}
