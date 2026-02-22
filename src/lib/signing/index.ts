import "server-only";
import { SignicatSigningProvider } from "./signicat";
import type { SigningProvider, SigningProviderKey } from "./types";

export function getConfiguredSigningProviderKey(): SigningProviderKey | null {
  const value = process.env.SIGNING_PROVIDER?.trim().toLowerCase();
  if (!value) return null;
  if (value === "signicat") return "signicat";
  return null;
}

export function getSigningProvider(): SigningProvider | null {
  const key = getConfiguredSigningProviderKey();
  if (!key) return null;

  if (key === "signicat") {
    return new SignicatSigningProvider();
  }

  return null;
}
