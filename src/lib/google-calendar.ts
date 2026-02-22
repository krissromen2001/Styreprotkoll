import crypto from "crypto";
import type { User } from "@/lib/store";
import { updateUser } from "@/lib/store";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

type MeetingMode = "physical" | "digital";

function toIsoWithTimezone(date: string, time: string) {
  // Google Calendar accepts local time + explicit timeZone. Use a stable ISO-like local datetime.
  return `${date}T${time}:00`;
}

function addMinutes(date: string, time: string, minutesToAdd: number) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const base = new Date(Date.UTC(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0));
  const next = new Date(base.getTime() + minutesToAdd * 60 * 1000);
  const yyyy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(next.getUTCDate()).padStart(2, "0");
  const hh = String(next.getUTCHours()).padStart(2, "0");
  const mi = String(next.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00`;
}

async function refreshGoogleAccessToken(user: User) {
  if (!user.googleCalendarRefreshToken) {
    throw new Error("Missing Google refresh token");
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: user.googleCalendarRefreshToken,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; refresh_token?: string; error?: string }
    | null;
  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error || "Failed to refresh Google token");
  }

  const expiresAt = payload.expires_in
    ? new Date(Date.now() + Math.max(60, payload.expires_in - 60) * 1000)
    : null;

  await updateUser(user.id, {
    googleCalendarAccessToken: payload.access_token,
    googleCalendarRefreshToken: payload.refresh_token || user.googleCalendarRefreshToken,
    googleCalendarTokenExpiresAt: expiresAt,
  });

  return payload.access_token;
}

async function getValidGoogleAccessToken(user: User) {
  const expiresAt = user.googleCalendarTokenExpiresAt;
  if (
    user.googleCalendarAccessToken &&
    (!expiresAt || expiresAt.getTime() > Date.now() + 30 * 1000)
  ) {
    return user.googleCalendarAccessToken;
  }
  return refreshGoogleAccessToken(user);
}

export async function createGoogleCalendarEvent(params: {
  organizer: User;
  meetingId: string;
  companyName: string;
  meetingTitle: string;
  date: string;
  time: string;
  durationMinutes?: number;
  timezone?: string;
  meetingMode: MeetingMode;
  address?: string | null;
  room?: string | null;
  meetingLink?: string | null;
  agendaItems?: string[];
  appMeetingUrl?: string;
  attendees: Array<{ email: string; name?: string | null }>;
}) {
  const token = await getValidGoogleAccessToken(params.organizer);
  const timezone = params.timezone || "Europe/Oslo";
  const durationMinutes = params.durationMinutes ?? 60;
  const isDigital = params.meetingMode === "digital";

  const physicalLocation = [params.room?.trim(), params.address?.trim()].filter(Boolean).join(", ");

  const descriptionLines = [
    `Innkalling til ${params.meetingTitle.toLowerCase()} i ${params.companyName}.`,
    "",
    `Møteform: ${isDigital ? "Digitalt møte" : "Fysisk møte"}`,
    ...(isDigital
      ? params.meetingLink?.trim()
        ? [`Møtelenke (forhåndsutfylt): ${params.meetingLink.trim()}`]
        : []
      : physicalLocation
        ? [`Sted: ${physicalLocation}`]
        : []),
    ...(params.agendaItems?.length ? ["", "Dagsorden:", ...params.agendaItems.map((a) => `- ${a}`)] : []),
    ...(params.appMeetingUrl ? ["", `Se møte i appen: ${params.appMeetingUrl}`] : []),
  ];

  const body: Record<string, unknown> = {
    summary: `${params.meetingTitle} – ${params.companyName}`,
    description: descriptionLines.join("\n"),
    start: {
      dateTime: toIsoWithTimezone(params.date, params.time),
      timeZone: timezone,
    },
    end: {
      dateTime: addMinutes(params.date, params.time, durationMinutes),
      timeZone: timezone,
    },
    attendees: params.attendees.map((a) => ({ email: a.email, displayName: a.name || undefined })),
    guestsCanModify: false,
    reminders: { useDefault: true },
  };

  if (isDigital) {
    body.location = "Google Meet";
    body.conferenceData = {
      createRequest: {
        requestId: `styreprotokoll-${params.meetingId}-${crypto.randomUUID()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  } else if (physicalLocation) {
    body.location = physicalLocation;
  }

  const url = new URL(GOOGLE_EVENTS_URL);
  url.searchParams.set("sendUpdates", "all");
  if (isDigital) {
    url.searchParams.set("conferenceDataVersion", "1");
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        id?: string;
        htmlLink?: string;
        hangoutLink?: string;
        conferenceData?: {
          entryPoints?: Array<{ uri?: string; entryPointType?: string }>;
        };
        error?: { message?: string };
      }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Failed to create Google Calendar event");
  }

  const meetUrl =
    payload?.hangoutLink ||
    payload?.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri ||
    null;

  return {
    eventId: payload?.id || null,
    eventUrl: payload?.htmlLink || null,
    meetUrl,
  };
}
