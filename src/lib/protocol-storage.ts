import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import crypto from "crypto";

const BUCKET = "protokoller";

export async function uploadProtocolAsset(
  path: string,
  content: Buffer | string,
  contentType: string,
  upsert = true
): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, content, {
      contentType,
      upsert,
    });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

export async function uploadProtocolPdf(
  companyId: string,
  meetingId: string,
  buffer: Buffer
): Promise<string> {
  const path = `${companyId}/${meetingId}/protokoll.pdf`;
  return uploadProtocolAsset(path, buffer, "application/pdf", true);
}

export async function uploadProtocolPdfNamed(
  companyId: string,
  meetingId: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  const path = `${companyId}/${meetingId}/${filename}`;
  return uploadProtocolAsset(path, buffer, "application/pdf", true);
}

function sanitizeFilename(name: string) {
  const trimmed = name.trim();
  const safe = trimmed
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
  return safe || "vedlegg";
}

export async function uploadInvitationAttachment(
  companyId: string,
  meetingId: string,
  fileName: string,
  content: Buffer,
  contentType: string
): Promise<string> {
  const safeName = sanitizeFilename(fileName);
  const path = `${companyId}/${meetingId}/innkalling-vedlegg/${crypto.randomUUID()}-${safeName}`;
  return uploadProtocolAsset(path, content, contentType || "application/octet-stream", false);
}

export async function getSignedStorageUrl(path: string, expiresInSeconds = 3600) {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) return null;
  return data.signedUrl;
}

export async function downloadStorageAsset(path: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(path);
  if (error) {
    throw new Error(error.message);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteStorageAsset(path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function getSignedProtocolUrl(path: string, expiresInSeconds = 3600) {
  return getSignedStorageUrl(path, expiresInSeconds);
}
