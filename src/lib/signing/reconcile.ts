import "server-only";
import type { SigningProvider, NormalizedWebhookEvent, NormalizedSignerUpdate, NormalizedSignatureStatus } from "./types";
import {
  getBoardMembers,
  getMeetingBySigningProviderSessionId,
  getSignatures,
  updateMeeting,
  updateSignature,
} from "@/lib/store";
import { uploadProtocolAsset, uploadProtocolPdfNamed } from "@/lib/protocol-storage";
import { revalidatePath } from "next/cache";

type ReconcileInput = {
  provider: SigningProvider;
  providerSessionId: string;
  signerUpdates: NormalizedSignerUpdate[];
  packageStatus?: NormalizedSignatureStatus;
  completed: boolean;
};

export async function reconcileProviderSigningSession(input: ReconcileInput) {
  const meeting = await getMeetingBySigningProviderSessionId(input.providerSessionId);
  if (!meeting) {
    return { ok: true as const, ignored: "unknown_session" as const };
  }

  const signatures = await getSignatures(meeting.id);
  const members = await getBoardMembers(meeting.companyId);
  const memberByEmail = new Map(
    members.filter((m) => m.email).map((m) => [m.email!.trim().toLowerCase(), m])
  );

  for (const update of input.signerUpdates) {
    const member =
      (update.boardMemberId && members.find((m) => m.id === update.boardMemberId)) ||
      (update.email ? memberByEmail.get(update.email.trim().toLowerCase()) : undefined);
    if (!member) continue;

    const sig = signatures.find((s) => s.boardMemberId === member.id);
    if (!sig) continue;

    await updateSignature(sig.id, {
      provider: input.provider.key,
      providerSignerId: update.providerSignerId ?? sig.providerSignerId ?? null,
      providerStatus: update.status,
      signedAtProvider: update.signedAt ?? sig.signedAtProvider ?? null,
      signedAt: update.status === "signed" ? (update.signedAt ?? sig.signedAt ?? new Date()) : sig.signedAt,
      rawProviderMeta: update.raw ? JSON.stringify(update.raw) : sig.rawProviderMeta ?? null,
    });
  }

  if (input.packageStatus) {
    await updateMeeting(meeting.id, {
      signingProvider: input.provider.key,
      signingMethod: meeting.signingMethod ?? "provider_bankid",
      signatureLevel: meeting.signatureLevel ?? "aes",
      status: input.packageStatus === "completed" ? meeting.status : "pending_signatures",
    });
  }

  const refreshedSignatures = await getSignatures(meeting.id);
  const allSigned = refreshedSignatures.length > 0 && refreshedSignatures.every((s) => s.signedAt);
  const alreadyFinalized = meeting.status === "signed" && meeting.signedProtocolStoragePath;
  if (input.completed && allSigned && !alreadyFinalized) {
    const signedPdf = await input.provider.downloadSignedProtocol(input.providerSessionId);
    const signedPath = await uploadProtocolPdfNamed(meeting.companyId, meeting.id, "protokoll-signed.pdf", signedPdf);
    const evidence = await input.provider.downloadEvidence(input.providerSessionId);
    const evidencePaths: string[] = [];

    for (const artifact of evidence) {
      const path = `${meeting.companyId}/${meeting.id}/signing-evidence/${artifact.filename}`;
      await uploadProtocolAsset(path, artifact.content, artifact.contentType || "application/octet-stream", true);
      evidencePaths.push(path);
    }

    await updateMeeting(meeting.id, {
      status: "signed",
      signedProtocolStoragePath: signedPath,
      signingCompletedAt: new Date(),
    });

    if (evidencePaths.length > 0) {
      for (const sig of refreshedSignatures) {
        await updateSignature(sig.id, {
          evidenceStoragePath: sig.evidenceStoragePath ?? evidencePaths[0],
        });
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath(`/meetings/${meeting.id}`);

  return { ok: true as const, meetingId: meeting.id };
}

export async function reconcileProviderWebhookEvent(provider: SigningProvider, event: NormalizedWebhookEvent) {
  return reconcileProviderSigningSession({
    provider,
    providerSessionId: event.providerSessionId,
    signerUpdates: event.signerUpdates,
    packageStatus: event.packageStatus,
    completed: event.completed,
  });
}
