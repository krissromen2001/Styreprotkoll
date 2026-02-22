function pad(num: number) {
  return String(num).padStart(2, "0");
}

function formatUtcTimestamp(date: Date) {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "T",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    "Z",
  ].join("");
}

function formatLocalCalendarDateTime(date: Date) {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "T",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join("");
}

function addMinutesToLocalDateTime(dateStr: string, timeStr: string, minutesToAdd: number) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const base = new Date(Date.UTC(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0));
  return new Date(base.getTime() + minutesToAdd * 60 * 1000);
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n/g, "\\n")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldIcsLine(line: string) {
  const limit = 73;
  if (line.length <= limit) return line;
  const parts: string[] = [];
  let remaining = line;
  while (remaining.length > limit) {
    parts.push(remaining.slice(0, limit));
    remaining = remaining.slice(limit);
  }
  if (remaining) parts.push(remaining);
  return parts.map((part, index) => (index === 0 ? part : ` ${part}`)).join("\r\n");
}

export function buildInvitationIcs(params: {
  meetingId: string;
  companyName: string;
  meetingTitle: string;
  date: string;
  time: string;
  meetingMode?: "physical" | "digital";
  meetingLink?: string;
  address?: string;
  room?: string;
  agendaItems?: string[];
  meetingUrl?: string;
  timezone?: string;
  durationMinutes?: number;
}) {
  const timezone = params.timezone || "Europe/Oslo";
  const durationMinutes = params.durationMinutes ?? 60;
  const meetingMode = params.meetingMode === "digital" ? "digital" : "physical";

  const start = addMinutesToLocalDateTime(params.date, params.time, 0);
  const end = addMinutesToLocalDateTime(params.date, params.time, durationMinutes);
  const now = new Date();

  const physicalLocation = [params.room?.trim(), params.address?.trim()].filter(Boolean).join(", ");
  const location = meetingMode === "digital" ? (params.meetingLink?.trim() || "Digitalt møte") : physicalLocation;
  const descriptionLines = [
    `Innkalling til ${params.meetingTitle.toLowerCase()} i ${params.companyName}.`,
    "",
    `Dato: ${params.date}`,
    `Tid: ${params.time}`,
    `Møteform: ${meetingMode === "digital" ? "Digitalt møte" : "Fysisk møte"}`,
    ...(meetingMode === "digital"
      ? params.meetingLink?.trim()
        ? [`Møtelenke: ${params.meetingLink.trim()}`]
        : []
      : location
        ? [`Sted: ${location}`]
        : []),
    ...(params.agendaItems && params.agendaItems.length > 0
      ? ["", "Dagsorden:", ...params.agendaItems.map((item) => `- ${item}`)]
      : []),
    ...(params.meetingUrl ? ["", `Se møte i appen: ${params.meetingUrl}`] : []),
  ];

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Styreprotokoll//Innkalling//NO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(`${params.meetingId}@styreprotokoll`)}`,
    `DTSTAMP:${formatUtcTimestamp(now)}`,
    `DTSTART;TZID=${timezone}:${formatLocalCalendarDateTime(start)}`,
    `DTEND;TZID=${timezone}:${formatLocalCalendarDateTime(end)}`,
    `SUMMARY:${escapeIcsText(`${params.meetingTitle} – ${params.companyName}`)}`,
    ...(location ? [`LOCATION:${escapeIcsText(location)}`] : []),
    `DESCRIPTION:${escapeIcsText(descriptionLines.join("\n"))}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

export function buildGoogleCalendarLink(params: {
  companyName: string;
  meetingTitle: string;
  date: string;
  time: string;
  meetingMode?: "physical" | "digital";
  meetingLink?: string;
  address?: string;
  room?: string;
  agendaItems?: string[];
  meetingUrl?: string;
  timezone?: string;
  durationMinutes?: number;
}) {
  const timezone = params.timezone || "Europe/Oslo";
  const durationMinutes = params.durationMinutes ?? 60;
  const meetingMode = params.meetingMode === "digital" ? "digital" : "physical";
  const start = addMinutesToLocalDateTime(params.date, params.time, 0);
  const end = addMinutesToLocalDateTime(params.date, params.time, durationMinutes);
  const physicalLocation = [params.room?.trim(), params.address?.trim()].filter(Boolean).join(", ");
  const location = meetingMode === "digital" ? (params.meetingLink?.trim() || "Digitalt møte") : physicalLocation;

  const detailsLines = [
    `Innkalling til ${params.meetingTitle.toLowerCase()} i ${params.companyName}.`,
    "",
    `Møteform: ${meetingMode === "digital" ? "Digitalt møte" : "Fysisk møte"}`,
    ...(meetingMode === "digital" && params.meetingLink?.trim()
      ? [`Møtelenke: ${params.meetingLink.trim()}`]
      : []),
    ...(params.agendaItems && params.agendaItems.length > 0
      ? ["", "Dagsorden:", ...params.agendaItems.map((item) => `- ${item}`)]
      : []),
    ...(params.meetingUrl ? ["", `Se møte i appen: ${params.meetingUrl}`] : []),
  ];

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", `${params.meetingTitle} - ${params.companyName}`);
  url.searchParams.set(
    "dates",
    `${formatLocalCalendarDateTime(start)}/${formatLocalCalendarDateTime(end)}`
  );
  url.searchParams.set("ctz", timezone);
  if (location) {
    url.searchParams.set("location", location);
  }
  url.searchParams.set("details", detailsLines.join("\n"));

  return url.toString();
}
