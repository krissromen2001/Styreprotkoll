import "server-only";
import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

export function getAppBaseUrl() {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export function getStripeBillingMode(): "subscription" | "payment" {
  return process.env.STRIPE_BILLING_MODE === "payment" ? "payment" : "subscription";
}
