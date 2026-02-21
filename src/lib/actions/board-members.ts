"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  createBoardMember,
  updateBoardMember,
  deleteBoardMember,
  getBoardMember,
  getBoardMemberByEmail,
} from "@/lib/store";

export async function addBoardMember(formData: FormData) {
  const companyId = formData.get("companyId") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as "styreleder" | "nestleder" | "styremedlem" | "varamedlem";

  if (!companyId || !name || !email) {
    return { error: "Alle felt er påkrevd" };
  }

  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Du må være innlogget" };
  }
  const admin = await getBoardMemberByEmail(companyId, session.user.email);
  if (!admin || admin.role !== "styreleder") {
    return { error: "Du har ikke tilgang til å legge til medlemmer" };
  }

  await createBoardMember({ companyId, name, email, role, active: true, userId: null });
  revalidatePath("/board-members");
}

export async function toggleBoardMemberActive(id: string) {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Du må være innlogget" };
  }
  const member = await getBoardMember(id);
  if (!member) return { error: "Styremedlem ikke funnet" };
  const admin = await getBoardMemberByEmail(member.companyId, session.user.email);
  if (!admin || admin.role !== "styreleder") {
    return { error: "Du har ikke tilgang til å endre medlemmer" };
  }
  await updateBoardMember(id, { active: !member.active });
  revalidatePath("/board-members");
}

export async function removeBoardMember(id: string) {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Du må være innlogget" };
  }
  const member = await getBoardMember(id);
  if (!member) return { error: "Styremedlem ikke funnet" };
  const admin = await getBoardMemberByEmail(member.companyId, session.user.email);
  if (!admin || admin.role !== "styreleder") {
    return { error: "Du har ikke tilgang til å fjerne medlemmer" };
  }
  await deleteBoardMember(id);
  revalidatePath("/board-members");
}

export async function updateBoardMemberEmail(id: string, email: string) {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Du må være innlogget" };
  }
  const member = await getBoardMember(id);
  if (!member) return { error: "Styremedlem ikke funnet" };
  const admin = await getBoardMemberByEmail(member.companyId, session.user.email);
  if (!admin || admin.role !== "styreleder") {
    return { error: "Du har ikke tilgang til å oppdatere e-post" };
  }
  const trimmed = email.trim();
  if (!trimmed) {
    return { error: "E-post kan ikke være tom" };
  }
  await updateBoardMember(id, { email: trimmed });
  revalidatePath("/board-members");
}
