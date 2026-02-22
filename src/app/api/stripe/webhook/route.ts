import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import {
  getCompanyByStripeCustomerId,
  getCompanyByStripeSubscriptionId,
  updateCompany,
} from "@/lib/store";

export const runtime = "nodejs";

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const rawEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
  if (!rawEnd || typeof rawEnd !== "number") return null;
  return new Date(rawEnd * 1000);
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (!customerId) return;

  let company =
    (await getCompanyByStripeCustomerId(customerId)) ??
    (await getCompanyByStripeSubscriptionId(subscription.id));

  const companyIdFromMetadata = subscription.metadata?.companyId;
  if (!company && companyIdFromMetadata) {
    // fallback path if customer id was not persisted yet
    // dynamic import avoids adding more top-level store imports than needed
    const { getCompany } = await import("@/lib/store");
    company = await getCompany(companyIdFromMetadata);
  }
  if (!company) return;

  const priceId =
    subscription.items.data[0]?.price?.id ??
    company.stripePriceId ??
    null;

  await updateCompany(company.id, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: subscription.status,
    stripePriceId: priceId,
    stripeCurrentPeriodEnd: getSubscriptionPeriodEnd(subscription),
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        const companyId = session.metadata?.companyId;

        if (companyId && customerId) {
          await updateCompany(companyId, {
            stripeCustomerId: customerId,
            ...(subscriptionId ? {} : { stripeSubscriptionStatus: "paid_once" }),
          });
        }

        if (subscriptionId) {
          const stripe = getStripe();
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(subscription);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handling failed", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
