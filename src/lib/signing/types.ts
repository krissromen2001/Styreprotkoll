export type SigningProviderKey = "signicat";

export type NormalizedSignatureStatus =
  | "created"
  | "sent"
  | "viewed"
  | "signed"
  | "declined"
  | "failed"
  | "expired"
  | "cancelled"
  | "completed";

export interface SigningRecipientInput {
  boardMemberId: string;
  name: string;
  email: string;
  role?: string;
}

export interface CreateProtocolSigningSessionInput {
  meetingId: string;
  companyId: string;
  companyName: string;
  protocolDateLabel: string;
  fileName: string;
  pdfBuffer: Buffer;
  recipients: SigningRecipientInput[];
  redirectUrl?: string;
}

export interface CreateProtocolSigningSessionResult {
  providerSessionId: string;
  signatureLevel?: string | null;
  raw?: unknown;
}

export interface NormalizedSignerUpdate {
  boardMemberId?: string;
  email?: string;
  providerSignerId?: string;
  status: NormalizedSignatureStatus;
  signedAt?: Date;
  raw?: unknown;
}

export interface NormalizedWebhookEvent {
  providerSessionId: string;
  eventType?: string;
  signerUpdates: NormalizedSignerUpdate[];
  packageStatus?: NormalizedSignatureStatus;
  completed: boolean;
  raw: unknown;
}

export interface SigningArtifact {
  filename: string;
  contentType: string;
  content: Buffer | string;
}

export interface SigningProvider {
  key: SigningProviderKey;
  createProtocolSigningSession(
    input: CreateProtocolSigningSessionInput
  ): Promise<CreateProtocolSigningSessionResult>;
  getSigningSessionStatus(providerSessionId: string): Promise<{
    packageStatus?: NormalizedSignatureStatus;
    signerUpdates?: NormalizedSignerUpdate[];
    raw?: unknown;
  }>;
  downloadSignedProtocol(providerSessionId: string): Promise<Buffer>;
  downloadEvidence(providerSessionId: string): Promise<SigningArtifact[]>;
  parseWebhook(request: Request): Promise<NormalizedWebhookEvent | null>;
}
