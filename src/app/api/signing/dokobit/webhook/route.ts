import { NextResponse } from "next/server";
import { getSigningProvider } from "@/lib/signing";
import { reconcileProviderWebhookEvent } from "@/lib/signing/reconcile";
import { getMeetingByProviderSignerSessionId, updateMeeting } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const provider = getSigningProvider();
  if (!provider || provider.key !== "dokobit") {
    return NextResponse.json({ error: "Dokobit webhook is disabled" }, { status: 404 });
  }

  const event = await provider.parseWebhook(request);
  if (!event) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  const meetingBySignerSession = await getMeetingByProviderSignerSessionId(event.providerSessionId);
  if (meetingBySignerSession && !meetingBySignerSession.signingProviderSessionId) {
    await updateMeeting(meetingBySignerSession.id, {
      signingProviderSessionId: event.providerSessionId,
    });
  }

  const result = await reconcileProviderWebhookEvent(provider, event);
  return NextResponse.json(result);
}
