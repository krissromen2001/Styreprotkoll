import "server-only";
import { SignicatSigningProvider } from "./signicat";
import { DokobitSigningProvider } from "./dokobit";
import type { SigningProvider, SigningProviderKey } from "./types";

export function getConfiguredSigningProviderKey(): SigningProviderKey | null {
  const value = process.env.SIGNING_PROVIDER?.trim().toLowerCase();
  if (!value) return null;
  if (value === "signicat") return "signicat";
  if (value === "dokobit") return "dokobit";
  return null;
}

export function getSigningProvider(): SigningProvider | null {
  const key = getConfiguredSigningProviderKey();
  if (!key) return null;

  if (key === "signicat") {
    return new SignicatSigningProvider();
  }
  if (key === "dokobit") {
    return new DokobitSigningProvider();
  }

  return null;
}
