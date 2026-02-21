"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";
import {
  createEmailVerificationToken,
  getEmailVerificationToken,
  markEmailVerificationTokenUsed,
  markUserEmailVerified,
} from "@/lib/store";

const EMAIL_TOKEN_TTL_HOURS = 48;

export async function registerUser(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "Alle felt er påkrevd" };
  }

  if (password.length < 8) {
    return { error: "Passord må være minst 8 tegn" };
  }

  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    return { error: "E-post er allerede registrert" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await db.insert(users).values({
    name,
    email,
    passwordHash,
  }).returning({ id: users.id });

  const userId = created[0]?.id;
  if (!userId) {
    return { error: "Kunne ikke opprette bruker" };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { error: "RESEND_API_KEY mangler" };
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_HOURS * 60 * 60 * 1000);
  await createEmailVerificationToken({ userId, token, expiresAt });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/auth/verify?token=${token}`;
  const resend = new Resend(resendApiKey);

  try {
    const result = await resend.emails.send({
      from: "Styreprotokoll <onboarding@resend.dev>",
      to: email,
      subject: "Bekreft e-postadressen din",
      text: `Klikk for å bekrefte e-posten din: ${verifyUrl}`,
      html: `<p>Velkommen til Styreprotokoll.</p><p><a href="${verifyUrl}">Bekreft e-postadressen din</a></p>`,
    });
    if (process.env.NODE_ENV !== "production") {
      console.log("Resend verification email result:", result);
    }
  } catch (err) {
    console.error("Failed to send verification email", err);
    return { error: "Kunne ikke sende e-post. Sjekk RESEND-oppsett." };
  }

  return { success: true };
}

export async function verifyEmailToken(token: string) {
  if (!token) return { error: "Ugyldig token" };

  const record = await getEmailVerificationToken(token);
  if (!record) return { error: "Token finnes ikke" };
  if (record.usedAt) return { error: "Token er allerede brukt" };
  if (record.expiresAt.getTime() < Date.now()) return { error: "Token er utløpt" };

  await markUserEmailVerified(record.userId);
  await markEmailVerificationTokenUsed(record.id);
  return { success: true };
}
