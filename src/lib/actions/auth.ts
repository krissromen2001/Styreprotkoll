"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
  await db.insert(users).values({
    name,
    email,
    passwordHash,
  });

  return { success: true };
}
