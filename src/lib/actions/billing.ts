"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSelectedCompanyId } from "@/lib/company-selection";
import { getBoardMemberByEmail, getCompany, updateCompany } from "@/lib/store";
import { getAppBaseUrl, getStripe, getStripeBillingMode } from "@/lib/stripe";

async function getBillingContext() {
  const session = await auth();
  const sessionEmail = session?.user?.email;
  if (!sessionEmail) {
    return { error: "Du må være innlogget" } as const;
  }

  const companyId = await getSelectedCompanyId();
  if (!companyId) {
    return { error: "Velg et selskap først" } as const;
  }

  const [company, membership] = await Promise.all([
    getCompany(companyId),
    getBoardMemberByEmail(companyId, sessionEmail),
  ]);

  if (!company) return { error: "Fant ikke selskapet" } as const;
  if (!membership || membership.role !== "styreleder") {
    return { error: "Kun styreleder kan administrere abonnement" } as const;
  }

  return { company, sessionEmail } as const;
}

export async function startStripeCheckout() {
  const context = await getBillingContext();
  if ("error" in context) {
    redirect(`/dashboard?billingError=${encodeURIComponent(context.error ?? "Ukjent feil")}`);
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    redirect("/dashboard?billingError=STRIPE_PRICE_ID%20mangler");
  }

  const stripe = getStripe();
  const baseUrl = getAppBaseUrl();
  const billingMode = getStripeBillingMode();

  let customerId = context.company.stripeCustomerId || null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: context.company.name,
      email: context.sessionEmail,
      metadata: {
        companyId: context.company.id,
        orgNumber: context.company.orgNumber,
      },
    });
    customerId = customer.id;
    await updateCompany(context.company.id, { stripeCustomerId: customer.id });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: billingMode,
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/dashboard?billing=success`,
    cancel_url: `${baseUrl}/dashboard?billing=cancelled`,
    allow_promotion_codes: true,
    metadata: {
      companyId: context.company.id,
    },
    ...(billingMode === "subscription"
      ? {
          subscription_data: {
            metadata: {
              companyId: context.company.id,
            },
          },
        }
      : {}),
  });

  if (!checkout.url) {
    redirect("/dashboard?billingError=Kunne%20ikke%20opprette%20Stripe%20Checkout");
  }

  redirect(checkout.url);
}

export async function openStripeBillingPortal() {
  if (getStripeBillingMode() !== "subscription") {
    redirect("/dashboard?billingError=Billing%20Portal%20brukes%20bare%20for%20abonnement");
  }

  const context = await getBillingContext();
  if ("error" in context) {
    redirect(`/dashboard?billingError=${encodeURIComponent(context.error ?? "Ukjent feil")}`);
  }

  if (!context.company.stripeCustomerId) {
    redirect("/dashboard?billingError=Ingen%20Stripe-kunde%20funnet%20for%20selskapet");
  }

  const stripe = getStripe();
  const baseUrl = getAppBaseUrl();
  const portal = await stripe.billingPortal.sessions.create({
    customer: context.company.stripeCustomerId,
    return_url: `${baseUrl}/dashboard`,
  });

  redirect(portal.url);
}
