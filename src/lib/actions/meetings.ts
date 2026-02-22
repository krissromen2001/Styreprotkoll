"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  createMeeting,
  createAgendaItem,
  updateMeeting,
  updateAgendaItem,
  getMeeting,
  getBoardMembers,
  getAgendaItems,
  createSignature,
  getSignatureByMember,
  updateSignature,
  getBoardMemberByEmail,
  createSigningToken,
  getSignatures,
  getSigningTokenByToken,
  markSigningTokenUsed,
  getAgendaCountForCompanyYear,
  getCompany,
  getMeetings,
  getMeetingAttachments,
  getMeetingAttachment,
  createMeetingAttachment,
  deleteMeetingAttachment,
  deleteSignaturesByMeeting,
  deleteMeetingById,
  getMeetingAttendees,
  replaceMeetingAttendees,
  getUserByEmail,
} from "@/lib/store";
import { Resend } from "resend";
import crypto from "crypto";
import { DEFAULT_LAST_AGENDA_ITEM, MEETING_TYPE_LABELS } from "@/lib/constants";
import { formatAgendaNumber, formatDate } from "@/lib/utils";
import { InvitationPDF } from "@/components/pdf/invitation-pdf";
import { ProtocolPDF } from "@/components/pdf/protocol-pdf";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  deleteStorageAsset,
  downloadStorageAsset,
  getSignedStorageUrl,
  uploadInvitationAttachment,
  uploadProtocolPdf,
  uploadProtocolPdfNamed,
} from "@/lib/protocol-storage";
import { getSigningProvider } from "@/lib/signing";
import type { SigningProvider } from "@/lib/signing/types";
import { reconcileProviderSigningSession } from "@/lib/signing/reconcile";
import { canCreateMeetingForCompany } from "@/lib/billing";
import { buildGoogleCalendarLink, buildInvitationIcs } from "@/lib/calendar-invite";
import { createGoogleCalendarEvent } from "@/lib/google-calendar";

const ADMIN_ROLE = "styreleder";
const PROVIDER_SIGNING_METHOD = "provider_bankid";
const APPROVAL_AGENDA_TITLE = "godkjennelse av innkalling og dagsorden";
const APPROVAL_YES_TEXT = "Styret godkjenner innkalling og dagsorden.";
const APPROVAL_NO_TEXT = "Styret godkjenner ikke innkalling og dagsorden.";
const MAX_INVITATION_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB per file
const MAX_INVITATION_ATTACHMENTS = 8;
const MAX_INVITATION_ATTACHMENTS_TOTAL_BYTES = 40 * 1024 * 1024; // 40 MB total
const MAX_EMAIL_ATTACHMENT_BYTES = 18 * 1024 * 1024; // practical cap incl. innkalling pdf + vedlegg

function isFormFile(value: FormDataEntryValue): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function hasFileContent(file: File) {
  return file.size > 0 && file.name.trim().length > 0;
}

async function ensureSignatureRowsForActiveMembers(
  meetingId: string,
  members: Awaited<ReturnType<typeof getBoardMembers>>
) {
  for (const member of members) {
    if (!member.active) continue;
    const existing = await getSignatureByMember(meetingId, member.id);
    if (!existing) {
      await createSignature({
        meetingId,
        boardMemberId: member.id,
        signedAt: null,
        typedName: null,
      });
    }
  }
}

async function buildProtocolSigningPayload(meeting: NonNullable<Awaited<ReturnType<typeof getMeeting>>>) {
  const company = await getCompany(meeting.companyId);
  const members = await getBoardMembers(meeting.companyId);
  const agendaItems = await getAgendaItems(meeting.id);
  const attendance = await getMeetingAttendees(meeting.id);
  const attendanceMap = new Map(attendance.map((a) => [a.boardMemberId, a.present]));
  const companyName = company?.name || "Selskapet";
  const formattedDate = formatDate(meeting.date);

  const pdfBuffer = await renderToBuffer(
    ProtocolPDF({
      companyName,
      orgNumber: company?.orgNumber || "",
      address: meeting.address || "",
      room: meeting.room || "",
      meetingMode: meeting.meetingMode === "digital" ? "digital" : "physical",
      meetingLink: meeting.meetingLink || "",
      date: formattedDate,
      time: meeting.time,
      meetingType: meeting.type,
      agendaItems: agendaItems.map((item) => ({
        sortOrder: item.sortOrder,
        title: item.title,
        decision: item.decision || "",
      })),
      attendees: members.map((m) => ({
        name: m.name,
        role: m.role,
        present: attendanceMap.get(m.id) ?? true,
      })),
      signatures: members.map((m) => ({ name: m.name, role: m.role })),
    })
  );

  return {
    company,
    members,
    companyName,
    formattedDate,
    pdfBuffer,
  };
}

async function sendForSignaturesWithProvider(
  meeting: NonNullable<Awaited<ReturnType<typeof getMeeting>>>,
  provider: SigningProvider
) {
  const { members, companyName, formattedDate, pdfBuffer } = await buildProtocolSigningPayload(meeting);
  const recipients = members.filter((m) => m.active && m.email);
  const resendApiKey = process.env.RESEND_API_KEY;
  const resend = resendApiKey ? new Resend(resendApiKey) : null;

  if (recipients.length === 0) {
    return { error: "Ingen aktive styremedlemmer med e-post" };
  }

  await ensureSignatureRowsForActiveMembers(meeting.id, members);

  const unsignedPath = await uploadProtocolPdfNamed(
    meeting.companyId,
    meeting.id,
    "protokoll-unsigned.pdf",
    pdfBuffer
  );

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const signingSession = await provider.createProtocolSigningSession({
    meetingId: meeting.id,
    companyId: meeting.companyId,
    companyName,
    protocolDateLabel: formattedDate,
    fileName: `Protokoll_${companyName.replace(/\s+/g, "_")}_${formattedDate}.pdf`,
    pdfBuffer,
    recipients: recipients.map((m) => ({
      boardMemberId: m.id,
      name: m.name,
      email: m.email!,
      role: m.role,
    })),
    redirectUrl: `${baseUrl}/signing/result`,
  });

  const signingSessions = Array.isArray((signingSession.raw as { signingSessions?: unknown })?.signingSessions)
    ? (((signingSession.raw as { signingSessions?: unknown }).signingSessions as unknown[]).filter(Boolean) as Array<{
        boardMemberId?: string;
        email?: string;
        sessionId?: string;
        signatureUrl?: string;
        raw?: unknown;
      }>)
    : [];

  for (const recipient of recipients) {
    const sig = await getSignatureByMember(meeting.id, recipient.id);
    if (!sig) continue;
    const signerSession = signingSessions.find((s) => s.boardMemberId === recipient.id);
    await updateSignature(sig.id, {
      provider: provider.key,
      providerSignerId: signerSession?.sessionId ?? null,
      providerStatus: signerSession?.signatureUrl ? "sent" : "created",
      signatureLevel: signingSession.signatureLevel || "aes",
      rawProviderMeta:
        signerSession?.raw
          ? JSON.stringify(signerSession.raw)
          : signingSession.raw
            ? JSON.stringify(signingSession.raw)
            : null,
    });

    if (resend && recipient.email && signerSession?.signatureUrl) {
      try {
        await resend.emails.send({
          from: "Styreprotokoll <onboarding@resend.dev>",
          to: recipient.email,
          subject: `Protokoll til signering (BankID) - ${companyName} - ${formattedDate}`,
          text: `Protokollen er klar til signering. Åpne lenken: ${signerSession.signatureUrl}`,
          html: `<p>Protokollen er klar til signering.</p><p><a href="${signerSession.signatureUrl}">Signer protokoll med BankID</a></p>`,
          attachments: [
            {
              filename: `Protokoll_${companyName.replace(/\s+/g, "_")}_${formattedDate}.pdf`,
              content: pdfBuffer,
            },
          ],
        });
      } catch {
        // Keep provider session alive even if email delivery fails
      }
    }
  }

  await updateMeeting(meeting.id, {
    status: "pending_signatures",
    protocolStoragePath: unsignedPath,
    signingProvider: provider.key,
    signingMethod: PROVIDER_SIGNING_METHOD,
    signingProviderSessionId: signingSession.providerSessionId,
    signatureLevel: signingSession.signatureLevel || "aes",
    signingCompletedAt: null,
  });

  revalidatePath(`/meetings/${meeting.id}`);
  revalidatePath("/");
  return { success: true as const, mode: "provider" as const };
}

async function sendForSignaturesLegacy(meeting: NonNullable<Awaited<ReturnType<typeof getMeeting>>>) {
  // Create signature records for all active board members
  const company = await getCompany(meeting.companyId);
  const members = await getBoardMembers(meeting.companyId);
  const resendApiKey = process.env.RESEND_API_KEY;
  const resend = resendApiKey ? new Resend(resendApiKey) : null;
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const agendaItems = await getAgendaItems(meeting.id);
  const companyName = company?.name || "Selskapet";
  const formattedDate = formatDate(meeting.date);
  const attendance = await getMeetingAttendees(meeting.id);
  const attendanceMap = new Map(attendance.map((a) => [a.boardMemberId, a.present]));
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(
      ProtocolPDF({
        companyName,
        orgNumber: company?.orgNumber || "",
        address: meeting.address || "",
        room: meeting.room || "",
        meetingMode: meeting.meetingMode === "digital" ? "digital" : "physical",
        meetingLink: meeting.meetingLink || "",
        date: formattedDate,
        time: meeting.time,
        meetingType: meeting.type,
        agendaItems: agendaItems.map((item) => ({
          sortOrder: item.sortOrder,
          title: item.title,
          decision: item.decision || "",
        })),
        attendees: members.map((m) => ({
          name: m.name,
          role: m.role,
          present: attendanceMap.get(m.id) ?? true,
        })),
        signatures: members.map((m) => ({ name: m.name, role: m.role })),
      })
    );
  } catch {
    return { error: "Kunne ikke generere protokoll-PDF" };
  }

  for (const member of members) {
    if (!member.active) continue;

    const existing = await getSignatureByMember(meeting.id, member.id);
    if (!existing) {
      await createSignature({
        meetingId: meeting.id,
        boardMemberId: member.id,
        signedAt: null,
        typedName: null,
      });
    }

    if (member.email) {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
      await createSigningToken({
        meetingId: meeting.id,
        boardMemberId: member.id,
        token,
        expiresAt,
      });

      if (resend) {
        const signingUrl = `${baseUrl}/meetings/${meeting.id}/sign?token=${token}`;
        try {
          await resend.emails.send({
            from: "Styreprotokoll <onboarding@resend.dev>",
            to: member.email,
            subject: `Protokoll til signering - ${companyName} - ${formattedDate}`,
            text: `Protokollen er klar til signering. Åpne lenken: ${signingUrl}`,
            html: `<p>Protokollen er klar til signering.</p><p><a href=\"${signingUrl}\">Signer protokoll</a></p>`,
            attachments: [
              {
                filename: `Protokoll_${companyName.replace(/\\s+/g, "_")}_${formattedDate}.pdf`,
                content: pdfBuffer,
              },
            ],
          });
        } catch {
          // Ignore email errors to avoid blocking signature flow
        }
      }
    }
  }

  await updateMeeting(meeting.id, {
    status: "pending_signatures",
    signingProvider: null,
    signingMethod: null,
    signingProviderSessionId: null,
    signatureLevel: null,
    signingCompletedAt: null,
  });
  revalidatePath(`/meetings/${meeting.id}`);
  revalidatePath("/");
  return { success: true as const, mode: "legacy" as const };
}

export async function createNewMeeting(formData: FormData) {
  const companyId = formData.get("companyId") as string;
  const meetingModeRaw = formData.get("meetingMode") as string | null;
  const meetingMode = meetingModeRaw === "digital" ? "digital" : "physical";
  const meetingLink = ((formData.get("meetingLink") as string) || "").trim();
  const address = formData.get("address") as string;
  const room = formData.get("room") as string;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const type = formData.get("type") as
    | "board_meeting"
    | "general_assembly"
    | "extraordinary_general_assembly";
  const agendaJson = formData.get("agendaItems") as string;
  const intent = formData.get("intent") as string | null;
  const attachmentFiles = formData
    .getAll("invitationAttachments")
    .filter(isFormFile)
    .filter(hasFileContent);

  if (!companyId || !date || !time) {
    return { error: "Alle påkrevde felt må fylles ut" };
  }
  if (meetingMode === "physical" && !address) {
    return { error: "Adresse er påkrevd for fysisk møte" };
  }

  if (attachmentFiles.length > MAX_INVITATION_ATTACHMENTS) {
    return { error: `Du kan laste opp maks ${MAX_INVITATION_ATTACHMENTS} vedlegg per innkalling.` };
  }

  const totalAttachmentSize = attachmentFiles.reduce((sum, file) => sum + file.size, 0);
  if (totalAttachmentSize > MAX_INVITATION_ATTACHMENTS_TOTAL_BYTES) {
    return { error: "Vedleggene er for store totalt. Maks total størrelse er 40 MB." };
  }
  if (attachmentFiles.some((file) => file.size > MAX_INVITATION_ATTACHMENT_SIZE_BYTES)) {
    return { error: "Hvert vedlegg må være mindre enn 15 MB." };
  }

  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Du må være innlogget" };
  }
  const admin = await getBoardMemberByEmail(companyId, session.user.email);
  if (!admin || admin.role !== ADMIN_ROLE) {
    return { error: "Du har ikke tilgang til å opprette møter" };
  }

  const [company, existingMeetings] = await Promise.all([
    getCompany(companyId),
    getMeetings(companyId),
  ]);
  if (!company) {
    return { error: "Fant ikke selskapet" };
  }

  const createAccess = canCreateMeetingForCompany({
    company,
    currentMeetingsCount: existingMeetings.length,
  });
  if (!createAccess.allowed) {
    return { error: createAccess.reason };
  }

  const meeting = await createMeeting({
    companyId,
    meetingMode,
    meetingLink: meetingMode === "digital" ? meetingLink : null,
    address: meetingMode === "physical" ? address : "",
    room: room || "",
    date,
    time,
    type: type || "board_meeting",
    status: "draft",
    title: null,
    protocolStoragePath: null,
    signedProtocolStoragePath: null,
    signingProvider: null,
    signingMethod: null,
    signingProviderSessionId: null,
    signatureLevel: null,
    signingCompletedAt: null,
    createdById: session.user.id ?? null,
  });

  // Create agenda items
  if (agendaJson) {
    const items = JSON.parse(agendaJson) as { title: string; description: string }[];
    const year = date.split("-")[0];
    const baseOffset = year ? await getAgendaCountForCompanyYear(companyId, year) : 0;
    for (const [index, item] of items.entries()) {
      await createAgendaItem({
        meetingId: meeting.id,
        sortOrder: baseOffset + index + 1,
        title: item.title,
        description: item.description,
        decision: "",
      });
    }
  }

  const uploadedAttachmentPaths: string[] = [];
  try {
    for (const file of attachmentFiles) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const storagePath = await uploadInvitationAttachment(
        meeting.companyId,
        meeting.id,
        file.name,
        buffer,
        file.type || "application/octet-stream"
      );
      uploadedAttachmentPaths.push(storagePath);

      await createMeetingAttachment({
        meetingId: meeting.id,
        fileName: file.name,
        storagePath,
        contentType: file.type || "application/octet-stream",
        fileSize: file.size,
      });
    }
  } catch (error) {
    for (const path of uploadedAttachmentPaths) {
      try {
        await deleteStorageAsset(path);
      } catch {
        // Best-effort cleanup
      }
    }
    try {
      await deleteMeetingById(meeting.id);
    } catch {
      // Best-effort rollback
    }
    console.error("Invitation attachment upload failed", error);
    return {
      error:
        error instanceof Error
          ? `Kunne ikke laste opp vedlegg: ${error.message}`
          : "Kunne ikke laste opp ett eller flere vedlegg.",
    };
  }

  if (intent === "send") {
    await sendInvitation(meeting.id);
  }

  redirect(`/meetings/${meeting.id}`);
}

export async function sendInvitation(meetingId: string) {
  const meeting = await getMeeting(meetingId);
  if (!meeting) return { error: "Møtet finnes ikke" };

  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Du må være innlogget" };
  }
  const admin = await getBoardMemberByEmail(meeting.companyId, session.user.email);
  if (!admin || admin.role !== ADMIN_ROLE) {
    return { error: "Du har ikke tilgang til å sende innkalling" };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { error: "RESEND_API_KEY mangler" };
  }
  const resend = new Resend(resendApiKey);
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const members = await getBoardMembers(meeting.companyId);
  const recipients = members.filter((m) => m.active && m.email);
  if (recipients.length === 0) {
    return { error: "Ingen aktive styremedlemmer med e-post" };
  }

  const company = await (await import("@/lib/store")).getCompany(meeting.companyId);
  const companyName = company?.name || "Selskapet";
  const agendaItems = await getAgendaItems(meeting.id);
  const invitationAttachments = await getMeetingAttachments(meeting.id);
  const meetingTitle = MEETING_TYPE_LABELS[meeting.type] || "Møte";
  const meetingMode = meeting.meetingMode === "digital" ? "digital" : "physical";
  const isDigitalMeeting = meetingMode === "digital";
  const meetingModeLabel = isDigitalMeeting ? "Digitalt møte" : "Fysisk møte";
  let effectiveMeeting = meeting;

  let pdfBuffer: Buffer;
  const agendaList = agendaItems
    .map((item) => `${formatAgendaNumber(item.sortOrder, meeting.date)} ${item.title}`)
    .join("\n");

  const agendaHtml = agendaItems
    .map((item) => `<li>${formatAgendaNumber(item.sortOrder, meeting.date)} ${item.title}</li>`)
    .join("");

  const meetingUrl = `${baseUrl}/meetings/${meeting.id}`;
  const agendaTitlesForInvite = agendaItems.map(
    (item) => `${formatAgendaNumber(item.sortOrder, meeting.date)} ${item.title}`
  );

  // Optional Google Calendar event creation (real invite). Falls back silently to ICS-only.
  try {
    const organizerUser = await getUserByEmail(session.user.email);
    if (organizerUser?.googleCalendarAccessToken || organizerUser?.googleCalendarRefreshToken) {
      const googleEvent = await createGoogleCalendarEvent({
        organizer: organizerUser,
        meetingId: meeting.id,
        companyName,
        meetingTitle,
        date: meeting.date,
        time: meeting.time,
        durationMinutes: 60,
        timezone: "Europe/Oslo",
        meetingMode,
        address: meeting.address || "",
        room: meeting.room || "",
        meetingLink: meeting.meetingLink || "",
        agendaItems: agendaTitlesForInvite,
        appMeetingUrl: meetingUrl,
        attendees: recipients
          .filter((m) => m.email)
          .map((m) => ({ email: m.email!, name: m.name })),
      });

      if (isDigitalMeeting && googleEvent.meetUrl && googleEvent.meetUrl !== meeting.meetingLink) {
        const updatedMeeting = await updateMeeting(meeting.id, { meetingLink: googleEvent.meetUrl });
        if (updatedMeeting) {
          effectiveMeeting = updatedMeeting;
        }
      }
    }
  } catch {
    // Keep innkalling sending robust; ICS + email invitation still works.
  }

  try {
    pdfBuffer = await renderToBuffer(
      InvitationPDF({
        companyName,
        orgNumber: company?.orgNumber || "",
        address: effectiveMeeting.address || "",
        room: effectiveMeeting.room || "",
        meetingMode,
        meetingLink: effectiveMeeting.meetingLink || "",
        date: effectiveMeeting.date,
        time: effectiveMeeting.time,
        meetingType: effectiveMeeting.type,
        agendaItems: agendaItems.map((item) => ({
          sortOrder: item.sortOrder,
          title: item.title,
          description: item.description || "",
        })),
        attachmentNames: invitationAttachments.map((attachment) => attachment.fileName),
      })
    );
  } catch {
    return { error: "Kunne ikke generere PDF for innkalling" };
  }

  const calendarInvite = buildInvitationIcs({
    meetingId: meeting.id,
    companyName,
    meetingTitle,
    date: effectiveMeeting.date,
    time: effectiveMeeting.time,
    meetingMode,
    meetingLink: effectiveMeeting.meetingLink || "",
    address: effectiveMeeting.address || "",
    room: effectiveMeeting.room || "",
    agendaItems: agendaTitlesForInvite,
    meetingUrl,
    timezone: "Europe/Oslo",
    durationMinutes: 60,
  });
  const googleCalendarLink = buildGoogleCalendarLink({
    companyName,
    meetingTitle,
    date: effectiveMeeting.date,
    time: effectiveMeeting.time,
    meetingMode,
    meetingLink: effectiveMeeting.meetingLink || "",
    address: effectiveMeeting.address || "",
    room: effectiveMeeting.room || "",
    agendaItems: agendaTitlesForInvite,
    meetingUrl,
    timezone: "Europe/Oslo",
    durationMinutes: 60,
  });
  const attachmentLinks = await Promise.all(
    invitationAttachments.map(async (attachment) => ({
      attachment,
      url: await getSignedStorageUrl(attachment.storagePath, 60 * 60 * 24 * 7),
    }))
  );
  const availableAttachmentLinks = attachmentLinks.filter((item) => item.url);

  const attachmentsTextBlock = availableAttachmentLinks.length
    ? [
        "",
        "Vedlegg:",
        ...availableAttachmentLinks.map((item) => `- ${item.attachment.fileName}: ${item.url}`),
      ].join("\n")
    : "";
  const attachmentsHtmlBlock = availableAttachmentLinks.length
    ? `<p><strong>Vedlegg:</strong></p><ul>${availableAttachmentLinks
        .map((item) => `<li><a href="${item.url}">${item.attachment.fileName}</a></li>`)
        .join("")}</ul>`
    : "";

  const emailAttachments: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }> = [
    {
      filename: `Innkalling_${meetingTitle.replace(/\s+/g, "_")}_${meeting.date}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    },
    {
      filename: `Moteinvitasjon_${meetingTitle.replace(/\s+/g, "_")}_${meeting.date}.ics`,
      content: Buffer.from(calendarInvite, "utf8"),
      contentType: "text/calendar; charset=utf-8; method=PUBLISH",
    },
  ];

  let emailAttachmentBytes = pdfBuffer.length + Buffer.byteLength(calendarInvite, "utf8");
  const attachedAttachmentPaths = new Set<string>();

  for (const attachment of invitationAttachments) {
    if (!attachment.fileSize) continue;
    if (emailAttachmentBytes + attachment.fileSize > MAX_EMAIL_ATTACHMENT_BYTES) {
      continue;
    }

    try {
      const content = await downloadStorageAsset(attachment.storagePath);
      emailAttachments.push({
        filename: attachment.fileName,
        content,
        contentType: attachment.contentType || "application/octet-stream",
      });
      emailAttachmentBytes += content.length;
      attachedAttachmentPaths.add(attachment.storagePath);
    } catch {
      // Keep invitation sending robust; link remains available in email/app
    }
  }

  const notAttached = invitationAttachments.filter(
    (attachment) => !attachedAttachmentPaths.has(attachment.storagePath)
  );
  const attachmentModeText =
    notAttached.length > 0
      ? `\n\nNoen vedlegg er sendt som lenker pga. størrelsebegrensning i e-post.`
      : "";
  const attachmentModeHtml =
    notAttached.length > 0
      ? `<p><em>Noen vedlegg er sendt som lenker pga. størrelsebegrensning i e-post.</em></p>`
      : "";
  const meetingDetailsTextLines = isDigitalMeeting
    ? [
        `Møteform: ${meetingModeLabel}`,
        `Møtelenke: ${effectiveMeeting.meetingLink || ""}`,
      ]
    : [
        `Møteform: ${meetingModeLabel}`,
        `Adresse: ${effectiveMeeting.address || ""}`,
        `Rom: ${effectiveMeeting.room || ""}`,
      ];
  const meetingDetailsHtml = isDigitalMeeting
    ? `Møteform: ${meetingModeLabel}<br/>Møtelenke: ${
        effectiveMeeting.meetingLink
          ? `<a href="${effectiveMeeting.meetingLink}">${effectiveMeeting.meetingLink}</a>`
          : ""
      }`
    : `Møteform: ${meetingModeLabel}<br/>Adresse: ${effectiveMeeting.address || ""}<br/>Rom: ${effectiveMeeting.room || ""}`;

  for (const recipient of recipients) {
    await resend.emails.send({
      from: "Styreprotokoll <onboarding@resend.dev>",
      to: recipient.email!,
      subject: `${meetingTitle} - ${companyName} - ${formatDate(meeting.date)}`,
      text: [
        `Du er invitert til ${meetingTitle.toLowerCase()}.`,
        `Dato: ${meeting.date}`,
        `Tid: ${meeting.time}`,
        ...meetingDetailsTextLines,
        "",
        "Dagsorden:",
        agendaList,
        "",
        `Se møte i appen: ${meetingUrl}`,
        `Legg til i Google Kalender: ${googleCalendarLink}`,
        attachmentsTextBlock,
        attachmentModeText,
      ].join("\n"),
      html: `<p>Du er invitert til <strong>${meetingTitle.toLowerCase()}</strong>.</p>
<p>Dato: ${meeting.date}<br/>Tid: ${meeting.time}<br/>${meetingDetailsHtml}</p>
<p><strong>Dagsorden:</strong></p>
<ol>${agendaHtml}</ol>
${attachmentsHtmlBlock}
${attachmentModeHtml}
<p><a href="${meetingUrl}">Se møte i appen</a></p>
<p><a href="${googleCalendarLink}">Legg til i Google Kalender</a></p>`,
      attachments: emailAttachments,
    });
  }

  await updateMeeting(meetingId, { status: "invitation_sent" });
  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/");
}

export async function saveProtocol(meetingId: string, decisions: { id: string; decision: string }[]) {
  const meeting = await getMeeting(meetingId);
  if (!meeting) return { error: "Møtet finnes ikke" };

  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Du må være innlogget" };
  }
  const admin = await getBoardMemberByEmail(meeting.companyId, session.user.email);
  if (!admin || admin.role !== ADMIN_ROLE) {
    return { error: "Du har ikke tilgang til å oppdatere protokollen" };
  }

  for (const d of decisions) {
    await updateAgendaItem(d.id, { decision: d.decision });
  }

  await updateMeeting(meetingId, { status: "protocol_draft" });
  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/");
}

export async function saveProtocolFromForm(meetingId: string, formData: FormData) {
  const meeting = await getMeeting(meetingId);
  if (!meeting) return { error: "Møtet finnes ikke" };

  const intent = (formData.get("intent") as string) || "draft";

  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Du må være innlogget" };
  }
  const admin = await getBoardMemberByEmail(meeting.companyId, session.user.email);
  if (!admin || admin.role !== ADMIN_ROLE) {
    return { error: "Du har ikke tilgang til å oppdatere protokollen" };
  }

  const items = await getAgendaItems(meeting.id);
  const includeEventuelt =
    formData.get("eventueltChoice") === "yes" || formData.get("includeEventuelt") === "on";
  if (
    includeEventuelt &&
    !items.some((item) => item.title.trim().toLowerCase() === DEFAULT_LAST_AGENDA_ITEM.title.toLowerCase())
  ) {
    const maxSortOrder = items.reduce((max, item) => Math.max(max, item.sortOrder), 0);
    const createdEventuelt = await createAgendaItem({
      meetingId: meeting.id,
      sortOrder: maxSortOrder + 1,
      title: DEFAULT_LAST_AGENDA_ITEM.title,
      description: DEFAULT_LAST_AGENDA_ITEM.description,
      decision: (formData.get("decision-eventuelt") as string) || "",
    });
    items.push(createdEventuelt);
  }

  const members = await getBoardMembers(meeting.companyId);
  const decisions = items.map((item) => ({
    id: item.id,
    decision:
      item.title.trim().toLowerCase() === APPROVAL_AGENDA_TITLE && formData.has(`approval-${item.id}`)
        ? ((formData.get(`approval-${item.id}`) as string) === "yes" ? APPROVAL_YES_TEXT : APPROVAL_NO_TEXT)
        : formData.has(`decision-${item.id}`)
          ? ((formData.get(`decision-${item.id}`) as string) || "")
          : (item.decision || ""),
  }));

  for (const d of decisions) {
    await updateAgendaItem(d.id, { decision: d.decision });
  }

  const attendees = members.map((m) => ({
    boardMemberId: m.id,
    present: formData.get(`present-${m.id}`) === "on",
  }));
  await replaceMeetingAttendees(meeting.id, attendees);

  await updateMeeting(meetingId, { status: "protocol_draft" });
  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/");

  if (intent === "send" || intent === "send_provider" || intent === "send_legacy") {
    const mode =
      intent === "send_provider"
        ? "provider"
        : intent === "send_legacy"
          ? "legacy"
          : "auto";
    const result = await sendForSignatures(meetingId, mode);
    if (result?.error) return result;
    redirect(`/meetings/${meetingId}?sent=1`);
  }

  redirect(`/meetings/${meetingId}?saved=1`);
}

export async function sendForSignatures(
  meetingId: string,
  mode: "auto" | "provider" | "legacy" = "auto"
) {
  const meeting = await getMeeting(meetingId);
  if (!meeting) return { error: "Møtet finnes ikke" };

  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Du må være innlogget" };
  }
  const admin = await getBoardMemberByEmail(meeting.companyId, session.user.email);
  if (!admin || admin.role !== ADMIN_ROLE) {
    return { error: "Du har ikke tilgang til å sende til signering" };
  }

  if (mode !== "legacy") {
    try {
      const provider = getSigningProvider();
      if (provider) {
        return await sendForSignaturesWithProvider(meeting, provider);
      }
      if (mode === "provider") {
        return { error: "Signicat er ikke konfigurert." };
      }
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? `Signeringsprovider er ikke klar: ${error.message}`
            : "Signeringsprovider er ikke klar",
      };
    }
  }

  return sendForSignaturesLegacy(meeting);
}

export async function signProtocolAsUser(meetingId: string, typedName: string) {
  const meeting = await getMeeting(meetingId);
  if (!meeting) return { error: "Møtet finnes ikke" };
  if (meeting.signingMethod === PROVIDER_SIGNING_METHOD) {
    return { error: "Denne protokollen signeres via signeringsleverandør. Bruk lenken fra e-post." };
  }

  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Du må være innlogget" };
  }
  const member = await getBoardMemberByEmail(meeting.companyId, session.user.email);
  if (!member) return { error: "Du er ikke registrert som styremedlem" };
  if (!member.active) return { error: "Styremedlemmet er deaktivert" };

  const sig = await getSignatureByMember(meetingId, member.id);
  if (!sig) return { error: "Signatur ikke funnet" };
  if (sig.signedAt) return { error: "Allerede signert" };

  await updateSignature(sig.id, {
    signedAt: new Date(),
    typedName,
  });

  await finalizeProtocolIfComplete(meetingId);

  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/");
}

export async function signProtocolWithToken(token: string, typedName: string) {
  const signingToken = await getSigningTokenByToken(token);
  if (!signingToken) return { error: "Ugyldig lenke" };
  if (signingToken.usedAt) return { error: "Lenken er allerede brukt" };
  if (signingToken.expiresAt.getTime() < Date.now()) return { error: "Lenken er utløpt" };

  const meeting = await getMeeting(signingToken.meetingId);
  if (!meeting) return { error: "Møtet finnes ikke" };
  if (meeting.signingMethod === PROVIDER_SIGNING_METHOD) {
    return { error: "Denne protokollen signeres via signeringsleverandør." };
  }

  const sig = await getSignatureByMember(signingToken.meetingId, signingToken.boardMemberId);
  if (!sig) return { error: "Signatur ikke funnet" };
  if (sig.signedAt) return { error: "Allerede signert" };

  await updateSignature(sig.id, { signedAt: new Date(), typedName });
  await markSigningTokenUsed(signingToken.id);

  await finalizeProtocolIfComplete(signingToken.meetingId);

  revalidatePath(`/meetings/${signingToken.meetingId}`);
  revalidatePath("/");
}

export async function signProtocol(meetingId: string, boardMemberId: string, typedName: string) {
  const meeting = await getMeeting(meetingId);
  if (!meeting) return { error: "Møtet finnes ikke" };
  if (meeting.signingMethod === PROVIDER_SIGNING_METHOD) {
    return { error: "Denne protokollen signeres via signeringsleverandør." };
  }

  const sig = await getSignatureByMember(meetingId, boardMemberId);
  if (!sig) return { error: "Signatur ikke funnet" };
  if (sig.signedAt) return { error: "Allerede signert" };

  await updateSignature(sig.id, {
    signedAt: new Date(),
    typedName,
  });

  await finalizeProtocolIfComplete(meetingId);

  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/");
}

export async function deleteMeeting(meetingId: string) {
  const meeting = await getMeeting(meetingId);
  if (!meeting) return { error: "Møtet finnes ikke" };

  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Du må være innlogget" };
  }
  const admin = await getBoardMemberByEmail(meeting.companyId, session.user.email);
  if (!admin || admin.role !== ADMIN_ROLE) {
    return { error: "Du har ikke tilgang til å slette møtet" };
  }

  await deleteSignaturesByMeeting(meetingId);
  await deleteMeetingById(meetingId);
  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function removeInvitationAttachment(formData: FormData) {
  const attachmentId = formData.get("attachmentId") as string;
  if (!attachmentId) {
    redirect("/dashboard?error=Ugyldig%20vedlegg");
  }

  const attachment = await getMeetingAttachment(attachmentId);
  if (!attachment) {
    redirect("/dashboard?error=Vedlegget%20finnes%20ikke");
  }

  const meeting = await getMeeting(attachment.meetingId);
  if (!meeting) {
    redirect("/dashboard?error=M%C3%B8tet%20finnes%20ikke");
  }

  const session = await auth();
  if (!session?.user?.email) {
    redirect(`/meetings/${meeting.id}?error=Du%20m%C3%A5%20v%C3%A6re%20innlogget`);
  }
  const admin = await getBoardMemberByEmail(meeting.companyId, session.user.email);
  if (!admin || admin.role !== ADMIN_ROLE) {
    redirect(`/meetings/${meeting.id}?error=Ingen%20tilgang`);
  }

  if (meeting.status !== "draft" && meeting.status !== "invitation_sent") {
    redirect(`/meetings/${meeting.id}?error=Kan%20ikke%20fjerne%20vedlegg%20n%C3%A5`);
  }

  try {
    await deleteStorageAsset(attachment.storagePath);
  } catch {
    // If file is already deleted in storage, still remove metadata row
  }

  await deleteMeetingAttachment(attachment.id);
  revalidatePath(`/meetings/${meeting.id}`);
  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect(`/meetings/${meeting.id}`);
}

async function finalizeProtocolIfComplete(meetingId: string) {
  const allSigs = await getSignatures(meetingId);
  const allSigned = allSigs.every((s) => s.signedAt !== null);
  if (!allSigned) return;

  const meeting = await getMeeting(meetingId);
  if (!meeting) return;

  const company = await getCompany(meeting.companyId);
  const agendaItems = await getAgendaItems(meeting.id);
  const members = await getBoardMembers(meeting.companyId);
  const attendance = await getMeetingAttendees(meeting.id);
  const attendanceMap = new Map(attendance.map((a) => [a.boardMemberId, a.present]));

  const pdfBuffer = await renderToBuffer(
    ProtocolPDF({
      companyName: company?.name || "Selskapet",
      orgNumber: company?.orgNumber || "",
      address: meeting.address || "",
      room: meeting.room || "",
      meetingMode: meeting.meetingMode === "digital" ? "digital" : "physical",
      meetingLink: meeting.meetingLink || "",
      date: formatDate(meeting.date),
      time: meeting.time,
      meetingType: meeting.type,
      agendaItems: agendaItems.map((item) => ({
        sortOrder: item.sortOrder,
        title: item.title,
        decision: item.decision || "",
      })),
      attendees: members.map((m) => ({
        name: m.name,
        role: m.role,
        present: attendanceMap.get(m.id) ?? true,
      })),
      signatures: allSigs.map((sig) => {
        const member = members.find((m) => m.id === sig.boardMemberId);
        return {
          name: member?.name || "Ukjent",
          role: member?.role || "",
          signedAt: sig.signedAt ? sig.signedAt.toISOString() : undefined,
        };
      }),
    })
  );

  const path = await uploadProtocolPdf(meeting.companyId, meeting.id, pdfBuffer);
  await updateMeeting(meeting.id, {
    status: "signed",
    protocolStoragePath: path,
    signedProtocolStoragePath: path,
    signingCompletedAt: new Date(),
  });
}

export async function regenerateSignedProtocol(formData: FormData) {
  const meetingId = formData.get("meetingId") as string;
  if (!meetingId) {
    console.error("Ugyldig møte");
    return;
  }
  const meeting = await getMeeting(meetingId);
  if (!meeting) {
    console.error("Møtet finnes ikke");
    return;
  }

  const session = await auth();
  if (!session?.user?.email) {
    console.error("Du må være innlogget");
    return;
  }
  const admin = await getBoardMemberByEmail(meeting.companyId, session.user.email);
  if (!admin || admin.role !== ADMIN_ROLE) {
    console.error("Du har ikke tilgang til å regenerere protokoll");
    return;
  }
  if (meeting.status !== "signed") {
    console.error("Møtet er ikke signert");
    return;
  }

  const company = await getCompany(meeting.companyId);
  const agendaItems = await getAgendaItems(meeting.id);
  const members = await getBoardMembers(meeting.companyId);
  const sigs = await getSignatures(meetingId);

  const pdfBuffer = await renderToBuffer(
    ProtocolPDF({
      companyName: company?.name || "Selskapet",
      orgNumber: company?.orgNumber || "",
      address: meeting.address || "",
      room: meeting.room || "",
      meetingMode: meeting.meetingMode === "digital" ? "digital" : "physical",
      meetingLink: meeting.meetingLink || "",
      date: formatDate(meeting.date),
      time: meeting.time,
      meetingType: meeting.type,
      agendaItems: agendaItems.map((item) => ({
        sortOrder: item.sortOrder,
        title: item.title,
        decision: item.decision || "",
      })),
      signatures: sigs.map((sig) => {
        const member = members.find((m) => m.id === sig.boardMemberId);
        return {
          name: member?.name || "Ukjent",
          role: member?.role || "",
          signedAt: sig.signedAt ? sig.signedAt.toISOString() : undefined,
        };
      }),
    })
  );

  const path = await uploadProtocolPdf(meeting.companyId, meeting.id, pdfBuffer);
  await updateMeeting(meeting.id, {
    protocolStoragePath: path,
    ...(meeting.signingMethod === PROVIDER_SIGNING_METHOD ? {} : { signedProtocolStoragePath: path }),
  });
  revalidatePath(`/meetings/${meetingId}`);
}

export async function refreshProviderSigningStatus(formData: FormData) {
  const meetingId = formData.get("meetingId") as string;
  if (!meetingId) return { error: "Ugyldig møte" };

  const meeting = await getMeeting(meetingId);
  if (!meeting) return { error: "Møtet finnes ikke" };

  if (meeting.signingMethod !== PROVIDER_SIGNING_METHOD || !meeting.signingProviderSessionId) {
    return { error: "Møtet bruker ikke provider-signering" };
  }

  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Du må være innlogget" };
  }
  const admin = await getBoardMemberByEmail(meeting.companyId, session.user.email);
  if (!admin || admin.role !== ADMIN_ROLE) {
    return { error: "Du har ikke tilgang til å oppdatere signeringsstatus" };
  }

  const provider = getSigningProvider();
  if (!provider || provider.key !== meeting.signingProvider) {
    return { error: "Signeringsprovider er ikke konfigurert" };
  }

  const status = await provider.getSigningSessionStatus(meeting.signingProviderSessionId);
  await reconcileProviderSigningSession({
    provider,
    providerSessionId: meeting.signingProviderSessionId,
    signerUpdates: status.signerUpdates ?? [],
    packageStatus: status.packageStatus,
    completed: status.packageStatus === "completed",
  });

  return { success: true };
}
