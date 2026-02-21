import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "protokoller";

export async function uploadProtocolPdf(
  companyId: string,
  meetingId: string,
  buffer: Buffer
): Promise<string> {
  const path = `${companyId}/${meetingId}/protokoll.pdf`;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

export async function getSignedProtocolUrl(path: string, expiresInSeconds = 3600) {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) return null;
  return data.signedUrl;
}
