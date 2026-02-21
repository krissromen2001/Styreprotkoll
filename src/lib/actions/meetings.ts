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
  createSignature,
  getSignatureByMember,
  updateSignature,
  getBoardMemberByEmail,
  createSigningToken,
  getSignatures,
  getSigningTokenByToken,
  markSigningTokenUsed,
} from "@/lib/store";
import { Resend } from "resend";
import crypto from "crypto";

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
    createdById: session.user.id ?? null,
  });

  // Create agenda items
  if (agendaJson) {
    const items = JSON.parse(agendaJson) as { title: string; description: string }[];
    for (const [index, item] of items.entries()) {
      await createAgendaItem({
        meetingId: meeting.id,
        sortOrder: index + 1,
        title: item.title,
        description: item.description,
        decision: "",
      });
    }
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
  const members = await getBoardMembers(meeting.companyId);
  const resendApiKey = process.env.RESEND_API_KEY;
  const resend = resendApiKey ? new Resend(resendApiKey) : null;
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

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
            subject: "Signer protokoll",
            text: `Du er invitert til å signere protokollen. Åpne lenken: ${signingUrl}`,
            html: `<p>Du er invitert til å signere protokollen.</p><p><a href=\"${signingUrl}\">Signer protokoll</a></p>`,
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

  const allSigs = await getSignatures(meetingId);
  const allSigned = allSigs.every((s) => s.signedAt !== null);
  if (allSigned) {
    await updateMeeting(meetingId, { status: "signed" });
  }

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

  const allSigs = await getSignatures(signingToken.meetingId);
  const allSigned = allSigs.every((s) => s.signedAt !== null);
  if (allSigned) {
    await updateMeeting(signingToken.meetingId, { status: "signed" });
  }

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

  const allSigs = await getSignatures(meetingId);
  const allSigned = allSigs.every((s) => s.signedAt !== null);
  if (allSigned) {
    await updateMeeting(meetingId, { status: "signed" });
  }

  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/");
}
