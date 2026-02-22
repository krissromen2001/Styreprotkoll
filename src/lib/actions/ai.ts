"use server";

import { auth } from "@/lib/auth";
import { getAgendaItems, getBoardMemberByEmail, getCompany, getMeeting } from "@/lib/store";
import { MEETING_TYPE_LABELS } from "@/lib/constants";

const AI_MIN_INTERVAL_MS = 1500;
const lastRequestByUser = new Map<string, number>();

function checkRateLimit(userKey: string) {
  const now = Date.now();
  const last = lastRequestByUser.get(userKey) ?? 0;
  if (now - last < AI_MIN_INTERVAL_MS) {
    return false;
  }
  lastRequestByUser.set(userKey, now);
  return true;
}

function normalizeText(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function buildProtocolDecisionPrompt(params: {
  companyName: string;
  meetingTypeLabel: string;
  agendaTitle: string;
  agendaDescription: string;
  notes: string;
}) {
  const system = [
    "Du er en juridisk og administrativ skrivehjelp for styreprotokoller i Norge.",
    "Skriv kort, formell beslutningstekst på norsk bokmål i protokollstil.",
    "Bruk kun informasjon fra notatene og sakskonteksten.",
    "Ikke finn på detaljer, tall, datoer, ansvarspersoner eller vedtak som ikke er oppgitt.",
    "Svar med 1 til 4 setninger som ren tekst (ingen punktliste, ingen overskrifter).",
    "Hvis notatene er for uklare eller mangler beslutning, skriv en kort nøytral tekst som sier at saken må konkretiseres før vedtak kan protokollføres.",
  ].join(" ");

  const user = [
    `Selskap: ${params.companyName}`,
    `Møtetype: ${params.meetingTypeLabel}`,
    `Sakstittel: ${params.agendaTitle}`,
    `Saksbeskrivelse: ${params.agendaDescription || "(ingen beskrivelse)"}`,
    "",
    "Møtenotater:",
    params.notes,
    "",
    "Skriv forslag til beslutningstekst for protokollen.",
  ].join("\n");

  return { system, user };
}

export async function generateProtocolDecisionDraft(input: {
  meetingId: string;
  agendaItemId: string;
  notes: string;
}) {
  const notes = normalizeText(input.notes || "");
  if (!input.meetingId || !input.agendaItemId) {
    return { error: "Ugyldig forespørsel" as const };
  }
  if (!notes) {
    return { error: "Skriv noen notater først" as const };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { error: "AI er ikke konfigurert" as const };
  }

  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Du må være innlogget" as const };
  }
  if (!checkRateLimit(session.user.email.toLowerCase())) {
    return { error: "Vent litt før du genererer på nytt" as const };
  }

  const meeting = await getMeeting(input.meetingId);
  if (!meeting) return { error: "Møtet finnes ikke" as const };

  const member = await getBoardMemberByEmail(meeting.companyId, session.user.email);
  if (!member || member.role !== "styreleder") {
    return { error: "Du har ikke tilgang" as const };
  }

  const [items, company] = await Promise.all([
    getAgendaItems(meeting.id),
    getCompany(meeting.companyId),
  ]);
  const agendaItem = items.find((item) => item.id === input.agendaItemId);
  if (!agendaItem) return { error: "Saken finnes ikke" as const };

  const { system, user } = buildProtocolDecisionPrompt({
    companyName: company?.name || "Selskapet",
    meetingTypeLabel: MEETING_TYPE_LABELS[meeting.type] || "Møte",
    agendaTitle: agendaItem.title,
    agendaDescription: agendaItem.description || "",
    notes,
  });

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

  const startedAt = Date.now();
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          choices?: Array<{ message?: { content?: string } }>;
          error?: { message?: string; type?: string };
        }
      | null;

    if (!response.ok) {
      console.error("AI protocol draft error", {
        meetingId: meeting.id,
        agendaItemId: agendaItem.id,
        status: response.status,
        type: payload?.error?.type,
      });
      return { error: "Kunne ikke generere forslag akkurat nå. Prøv igjen." as const };
    }

    const text = payload?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return { error: "AI returnerte ikke noe forslag" as const };
    }

    console.log("AI protocol draft generated", {
      meetingId: meeting.id,
      agendaItemId: agendaItem.id,
      latencyMs: Date.now() - startedAt,
    });

    return { text };
  } catch (error) {
    console.error("AI protocol draft request failed", {
      meetingId: meeting.id,
      agendaItemId: agendaItem.id,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "unknown",
    });
    return { error: "Kunne ikke generere forslag akkurat nå. Prøv igjen." as const };
  }
}
