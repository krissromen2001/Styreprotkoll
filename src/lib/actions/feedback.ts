"use server";

import { auth } from "@/lib/auth";
import { Resend } from "resend";
import { getSelectedCompanyId } from "@/lib/company-selection";
import { getCompany } from "@/lib/store";

export async function submitFeedback(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Du må være innlogget for å sende tilbakemelding." };
  }

  const category = ((formData.get("category") as string) || "feedback").trim();
  const message = ((formData.get("message") as string) || "").trim();
  const pagePath = ((formData.get("pagePath") as string) || "").trim();

  if (message.length < 5) {
    return { error: "Skriv litt mer detaljer (minst 5 tegn)." };
  }

  const selectedCompanyId = await getSelectedCompanyId();
  const company = selectedCompanyId ? await getCompany(selectedCompanyId) : null;

  const payload = {
    category,
    message,
    pagePath: pagePath || null,
    userEmail: session.user.email,
    userName: session.user.name ?? null,
    companyId: company?.id ?? null,
    companyName: company?.name ?? null,
    createdAt: new Date().toISOString(),
  };

  const resendApiKey = process.env.RESEND_API_KEY;
  const feedbackToEmail = process.env.FEEDBACK_TO_EMAIL;

  if (!resendApiKey || !feedbackToEmail) {
    if (process.env.NODE_ENV !== "production") {
      console.log("Feedback (dev fallback):", payload);
      return { success: true, note: "Lagret i serverlogg (mangler FEEDBACK_TO_EMAIL eller RESEND_API_KEY)." };
    }
    return { error: "Tilbakemelding er ikke konfigurert ennå." };
  }

  const resend = new Resend(resendApiKey);
  try {
    await resend.emails.send({
      from: "Styreprotokoll <onboarding@resend.dev>",
      to: feedbackToEmail,
      replyTo: session.user.email,
      subject: `Tilbakemelding (${category})${company?.name ? ` - ${company.name}` : ""}`,
      text: [
        `Kategori: ${category}`,
        `Fra: ${session.user.name || "Ukjent bruker"} <${session.user.email}>`,
        company ? `Selskap: ${company.name} (${company.id})` : "Selskap: —",
        pagePath ? `Side: ${pagePath}` : "Side: —",
        "",
        message,
      ].join("\n"),
      html: `
        <p><strong>Kategori:</strong> ${category}</p>
        <p><strong>Fra:</strong> ${session.user.name || "Ukjent bruker"} (${session.user.email})</p>
        <p><strong>Selskap:</strong> ${company ? `${company.name} (${company.id})` : "—"}</p>
        <p><strong>Side:</strong> ${pagePath || "—"}</p>
        <hr />
        <p style="white-space: pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send feedback email", error);
    return { error: "Kunne ikke sende tilbakemelding akkurat nå." };
  }

  return { success: true };
}
