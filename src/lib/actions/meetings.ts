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
  deleteSignaturesByMeeting,
  deleteMeetingById,
  getMeetingAttendees,
  replaceMeetingAttendees,
} from "@/lib/store";
import { Resend } from "resend";
import crypto from "crypto";
import { MEETING_TYPE_LABELS } from "@/lib/constants";
import { formatAgendaNumber, formatDate } from "@/lib/utils";
import { InvitationPDF } from "@/components/pdf/invitation-pdf";
import { ProtocolPDF } from "@/components/pdf/protocol-pdf";
import { renderToBuffer } from "@react-pdf/renderer";
import { uploadProtocolPdf } from "@/lib/protocol-storage";

const ADMIN_ROLE = "styreleder";

export async function createNewMeeting(formData: FormData) {
  const companyId = formData.get("companyId") as string;
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

  if (!companyId || !address || !date || !time) {
    return { error: "Alle påkrevde felt må fylles ut" };
  }

  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Du må være innlogget" };
  }
  const admin = await getBoardMemberByEmail(companyId, session.user.email);
  if (!admin || admin.role !== ADMIN_ROLE) {
    return { error: "Du har ikke tilgang til å opprette møter" };
  }

  const meeting = await createMeeting({
    companyId,
    address,
    room: room || "",
    date,
    time,
    type: type || "board_meeting",
    status: "draft",
    title: null,
    protocolStoragePath: null,
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
  const meetingTitle = MEETING_TYPE_LABELS[meeting.type] || "Møte";

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(
      InvitationPDF({
        companyName,
        orgNumber: company?.orgNumber || "",
        address: meeting.address || "",
        room: meeting.room || "",
        date: meeting.date,
        time: meeting.time,
        meetingType: meeting.type,
        agendaItems: agendaItems.map((item) => ({
          sortOrder: item.sortOrder,
          title: item.title,
          description: item.description || "",
        })),
      })
    );
  } catch {
    return { error: "Kunne ikke generere PDF for innkalling" };
  }

  const agendaList = agendaItems
    .map((item) => `${formatAgendaNumber(item.sortOrder, meeting.date)} ${item.title}`)
    .join("\n");

  const agendaHtml = agendaItems
    .map((item) => `<li>${formatAgendaNumber(item.sortOrder, meeting.date)} ${item.title}</li>`)
    .join("");

  const meetingUrl = `${baseUrl}/meetings/${meeting.id}`;

  for (const recipient of recipients) {
    await resend.emails.send({
      from: "Styreprotokoll <onboarding@resend.dev>",
      to: recipient.email!,
      subject: `${meetingTitle} - ${companyName} - ${formatDate(meeting.date)}`,
      text: [
        `Du er invitert til ${meetingTitle.toLowerCase()}.`,
        `Dato: ${meeting.date}`,
        `Tid: ${meeting.time}`,
        `Adresse: ${meeting.address || ""}`,
        `Rom: ${meeting.room || ""}`,
        "",
        "Dagsorden:",
        agendaList,
        "",
        `Se møte i appen: ${meetingUrl}`,
      ].join("\n"),
      html: `<p>Du er invitert til <strong>${meetingTitle.toLowerCase()}</strong>.</p>
<p>Dato: ${meeting.date}<br/>Tid: ${meeting.time}<br/>Adresse: ${meeting.address || ""}<br/>Rom: ${meeting.room || ""}</p>
<p><strong>Dagsorden:</strong></p>
<ol>${agendaHtml}</ol>
<p><a href="${meetingUrl}">Se møte i appen</a></p>`,
      attachments: [
        {
          filename: `Innkalling_${meetingTitle.replace(/\s+/g, "_")}_${meeting.date}.pdf`,
          content: pdfBuffer,
        },
      ],
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
  const members = await getBoardMembers(meeting.companyId);
  const decisions = items.map((item) => ({
    id: item.id,
    decision: (formData.get(`decision-${item.id}`) as string) || "",
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

  if (intent === "send") {
    const result = await sendForSignatures(meetingId);
    if (result?.error) return result;
    redirect(`/meetings/${meetingId}?sent=1`);
  }

  redirect(`/meetings/${meetingId}?saved=1`);
}

export async function sendForSignatures(meetingId: string) {
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

    const existing = await getSignatureByMember(meetingId, member.id);
    if (!existing) {
      await createSignature({
        meetingId,
        boardMemberId: member.id,
        signedAt: null,
        typedName: null,
      });
    }

    if (member.email) {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
      await createSigningToken({
        meetingId,
        boardMemberId: member.id,
        token,
        expiresAt,
      });

      if (resend) {
        const signingUrl = `${baseUrl}/meetings/${meetingId}/sign?token=${token}`;
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

  await updateMeeting(meetingId, { status: "pending_signatures" });
  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/");
}

export async function signProtocolAsUser(meetingId: string, typedName: string) {
  const meeting = await getMeeting(meetingId);
  if (!meeting) return { error: "Møtet finnes ikke" };

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
  redirect("/");
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
  await updateMeeting(meeting.id, { status: "signed", protocolStoragePath: path });
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
  await updateMeeting(meeting.id, { protocolStoragePath: path });
  revalidatePath(`/meetings/${meetingId}`);
}
