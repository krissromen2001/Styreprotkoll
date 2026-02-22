"use client";

import { useState, useTransition } from "react";
import { generateProtocolDecisionDraft } from "@/lib/actions/ai";

export function ProtocolDecisionAiField({
  meetingId,
  agendaItemId,
  agendaTitle,
  decisionName,
  defaultDecision,
  aiAvailable,
}: {
  meetingId: string;
  agendaItemId: string;
  agendaTitle: string;
  decisionName: string;
  defaultDecision: string;
  aiAvailable: boolean;
}) {
  const [notes, setNotes] = useState("");
  const [decision, setDecision] = useState(defaultDecision);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const canGenerate = aiAvailable && notes.trim().length > 0 && !isPending;

  const handleGenerate = () => {
    if (!canGenerate) return;
    setError("");

    startTransition(async () => {
      const result = await generateProtocolDecisionDraft({
        meetingId,
        agendaItemId,
        notes,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.text) {
        setDecision(result.text);
      }
    });
  };

  return (
    <div className="space-y-3">
      {aiAvailable ? (
        <div className="rounded-md border border-blue-100 bg-blue-50/60 p-3">
          <label className="block text-sm font-medium text-slate-800 mb-1">
            Notater (kun for AI-utkast)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={`Notater for ${agendaTitle.toLowerCase()}...`}
            className="w-full px-3 py-2 border border-blue-100 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-200 resize-none"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Notatene lagres ikke som del av protokollen. Brukes kun for å foreslå beslutningstekst.
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="shrink-0 rounded-md bg-[#102a4c] px-3 py-2 text-xs font-medium text-white hover:bg-[#0b213d] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Genererer..." : "Generer forslag"}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-700">{error}</p>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs text-gray-600">
            AI-utkast er ikke konfigurert ennå.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Vedtakstekst
        </label>
        <textarea
          name={decisionName}
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          rows={4}
          placeholder="Vedtak: (inntas her)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
        />
        <p className="mt-2 text-xs text-gray-500">
          Denne teksten brukes direkte i protokoll-PDFen.
        </p>
      </div>
    </div>
  );
}
