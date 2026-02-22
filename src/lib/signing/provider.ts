import type { SigningProvider } from "./types";

export interface SigningProviderFactory {
  create(): SigningProvider;
}
