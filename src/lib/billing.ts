import type { Company } from "@/lib/store";

const PAID_STATUSES = new Set(["paid_once", "active", "trialing", "past_due"]);

export function isCompanyPaid(company: Pick<Company, "stripeSubscriptionStatus">): boolean {
  return PAID_STATUSES.has(company.stripeSubscriptionStatus || "");
}

export function canCreateMeetingForCompany(input: {
  company: Pick<Company, "stripeSubscriptionStatus">;
  currentMeetingsCount: number;
}) {
  if (isCompanyPaid(input.company)) {
    return { allowed: true as const };
  }

  if (input.currentMeetingsCount < 1) {
    return { allowed: true as const };
  }

  return {
    allowed: false as const,
    reason:
      "Du kan opprette ett møte gratis for å teste løsningen. Betal for selskapet i dashboard for å opprette flere møter.",
  };
}
