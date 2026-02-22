import "server-only";
import type {
  CreateProtocolSigningSessionInput,
  CreateProtocolSigningSessionResult,
  NormalizedSignatureStatus,
  NormalizedSignerUpdate,
  NormalizedWebhookEvent,
  SigningArtifact,
  SigningProvider,
} from "./types";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function normalizeStatus(value: unknown): NormalizedSignatureStatus | undefined {
  if (typeof value !== "string") return undefined;
  const key = value.toLowerCase();
  if (["created", "draft"].includes(key)) return "created";
  if (["sent", "invited", "invitation_sent"].includes(key)) return "sent";
  if (["opened", "viewed"].includes(key)) return "viewed";
  if (["signed", "completed_by_signer"].includes(key)) return "signed";
  if (["declined", "rejected"].includes(key)) return "declined";
  if (["failed", "error"].includes(key)) return "failed";
  if (["expired", "timeout"].includes(key)) return "expired";
  if (["cancelled", "canceled"].includes(key)) return "cancelled";
  if (["completed", "finalized"].includes(key)) return "completed";
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function safeJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export class SignicatSigningProvider implements SigningProvider {
  readonly key = "signicat" as const;
  private readonly baseUrl = requireEnv("SIGNICAT_BASE_URL").replace(/\/$/, "");
  private readonly clientId = requireEnv("SIGNICAT_CLIENT_ID");
  private readonly clientSecret = requireEnv("SIGNICAT_CLIENT_SECRET");
  private readonly webhookSecret = process.env.SIGNICAT_WEBHOOK_SECRET || "";
  private readonly documentsPath = process.env.SIGNICAT_DOCUMENTS_PATH || "/sign/documents";
  private readonly documentCollectionsPath =
    process.env.SIGNICAT_DOCUMENT_COLLECTIONS_PATH || "/sign/document-collections";
  private readonly signingsPath = process.env.SIGNICAT_SIGNINGS_PATH || "/sign/signing-sessions";
  private readonly idpName = process.env.SIGNICAT_IDP_NAME || "nbid";
  private readonly vendor = process.env.SIGNICAT_VENDOR || "NBID";
  private readonly signingFlow = process.env.SIGNICAT_SIGNING_FLOW || "PKISIGNING";
  private readonly uiLanguage = process.env.SIGNICAT_UI_LANGUAGE || "nb";

  private accessTokenCache: { value: string; expiresAt: number } | null = null;

  private async getAccessToken() {
    if (this.accessTokenCache && this.accessTokenCache.expiresAt > Date.now() + 10_000) {
      return this.accessTokenCache.value;
    }

    const tokenPath = process.env.SIGNICAT_TOKEN_PATH || "/auth/open/connect/token";
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: process.env.SIGNICAT_SCOPE || "signicat-api",
    });

    const response = await fetch(`${this.baseUrl}${tokenPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) {
      const payload = await safeJson(response);
      throw new Error(`Signicat token error (${response.status}): ${JSON.stringify(payload)}`);
    }
    const payload = (await response.json()) as { access_token: string; expires_in?: number };
    this.accessTokenCache = {
      value: payload.access_token,
      expiresAt: Date.now() + (payload.expires_in ?? 300) * 1000,
    };
    return payload.access_token;
  }

  private async signedRequest(path: string, init?: RequestInit) {
    const token = await this.getAccessToken();
    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });
  }

  private buildSigningSetup() {
    if (this.signingFlow.toUpperCase() === "PKISIGNING") {
      return [
        {
          signingFlow: "PKISIGNING",
          vendor: this.vendor,
        },
      ];
    }

    return [
      {
        identityProviders: [{ idpName: this.idpName }],
        signingFlow: this.signingFlow,
      },
    ];
  }

  private usesPkiSigning() {
    return this.signingFlow.toUpperCase() === "PKISIGNING";
  }

  async createProtocolSigningSession(
    input: CreateProtocolSigningSessionInput
  ): Promise<CreateProtocolSigningSessionResult> {
    const docResponse = await this.signedRequest(this.documentsPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
      },
      body: new Uint8Array(input.pdfBuffer),
    });
    const docRaw = await safeJson(docResponse);
    if (!docResponse.ok) {
      throw new Error(
        `Signicat document upload error (${docResponse.status}): ${JSON.stringify(docRaw)}`
      );
    }
    const docRecord = asRecord(docRaw);
    const documentId = typeof docRecord?.documentId === "string" ? docRecord.documentId : null;
    if (!documentId) throw new Error("Signicat document upload did not return documentId");

    const collectionResponse = await this.signedRequest(this.documentCollectionsPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documents: [{ documentId }],
      }),
    });
    const collectionRaw = await safeJson(collectionResponse);
    if (!collectionResponse.ok) {
      throw new Error(
        `Signicat document collection error (${collectionResponse.status}): ${JSON.stringify(collectionRaw)}`
      );
    }
    const collectionRecord = asRecord(collectionRaw);
    const documentCollectionId = typeof collectionRecord?.id === "string" ? collectionRecord.id : null;
    if (!documentCollectionId) {
      throw new Error("Signicat document collection response did not include id");
    }

    const sessionResults: Array<{
      boardMemberId: string;
      email: string;
      sessionId: string;
      signatureUrl?: string;
      raw: unknown;
    }> = [];

    for (const recipient of input.recipients) {
      const externalReference = `${input.meetingId}:${recipient.boardMemberId}:${Date.now()}`;
      const sessionPayload = [
        {
          title: `Protokollsignering - ${input.companyName} - ${input.protocolDateLabel}`,
          externalReference,
          documents: [
            {
              action: "SIGN",
              documentCollectionId,
              documentId,
            },
          ],
          signingSetup: this.buildSigningSetup(),
          packageTo: this.usesPkiSigning() ? undefined : ["PADES_CONTAINER"],
          ui: { language: this.uiLanguage },
          redirectSettings: input.redirectUrl
            ? {
                success: input.redirectUrl,
                error: input.redirectUrl,
                cancel: input.redirectUrl,
              }
            : undefined,
        },
      ];

      const response = await this.signedRequest(this.signingsPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionPayload),
      });
      const raw = await safeJson(response);
      if (!response.ok) {
        throw new Error(
          `Signicat create signing session error (${response.status}): ${JSON.stringify(raw)}`
        );
      }

      const sessions = Array.isArray(raw) ? raw : [];
      const record = asRecord(sessions[0]);
      const sessionId = typeof record?.id === "string" ? record.id : null;
      if (!sessionId) {
        throw new Error("Signicat response did not include signing session id");
      }
      sessionResults.push({
        boardMemberId: recipient.boardMemberId,
        email: recipient.email,
        sessionId,
        signatureUrl: typeof record?.signatureUrl === "string" ? record.signatureUrl : undefined,
        raw,
      });
    }

    const providerSessionId = sessionResults[0]?.sessionId ?? null;

    if (!providerSessionId) {
      throw new Error("Signicat response did not include signing session id");
    }

    return {
      providerSessionId,
      signatureLevel: "aes",
      raw: {
        document: docRaw,
        documentCollection: collectionRaw,
        signingSessions: sessionResults,
        delivery: "app_email_with_signicat_signature_url",
        signingSetupDefaults: {
          signingFlow: this.signingFlow,
          vendor: this.vendor,
          idpName: this.idpName,
        },
      },
    };
  }

  async getSigningSessionStatus(providerSessionId: string) {
    const response = await this.signedRequest(`${this.signingsPath}/${encodeURIComponent(providerSessionId)}`);
    const raw = await safeJson(response);
    if (!response.ok) {
      throw new Error(`Signicat status error (${response.status}): ${JSON.stringify(raw)}`);
    }
    const record = asRecord(raw);
    const lifecycle = asRecord(record?.lifecycle);
    const externalReference =
      typeof record?.externalReference === "string" ? record.externalReference : undefined;
    const lifecycleState =
      (typeof lifecycle?.state === "string" && lifecycle.state.toLowerCase()) || "";
    const packageStatus: NormalizedSignatureStatus | undefined =
      lifecycleState === "ready"
        ? "sent"
        : lifecycleState === "signed"
          ? "completed"
          : lifecycleState === "cancelled"
            ? "cancelled"
            : lifecycleState === "expired"
              ? "expired"
              : normalizeStatus(lifecycleState);

    const signerUpdates: NormalizedSignerUpdate[] = [];
    if (packageStatus === "completed") {
      const boardMemberId =
        externalReference?.split(":").length && externalReference.split(":")[1]
          ? externalReference.split(":")[1]
          : undefined;
      signerUpdates.push({
        boardMemberId,
        providerSignerId: providerSessionId,
        status: "signed",
        raw,
      });
    }

    return {
      packageStatus,
      signerUpdates,
      raw,
    };
  }

  async downloadSignedProtocol(providerSessionId: string): Promise<Buffer> {
    const sessionResponse = await this.signedRequest(
      `${this.signingsPath}/${encodeURIComponent(providerSessionId)}`
    );
    const sessionRaw = await safeJson(sessionResponse);
    if (!sessionResponse.ok) {
      throw new Error(
        `Signicat signing session fetch error (${sessionResponse.status}): ${JSON.stringify(sessionRaw)}`
      );
    }
    const session = asRecord(sessionRaw);
    const output = asRecord(session?.output);
    const packages = Array.isArray(output?.packages) ? output?.packages : [];
    const padesPackage = packages
      .map(asRecord)
      .find((pkg) => (typeof pkg?.packageType === "string" ? pkg.packageType : "") === "PADES_CONTAINER");
    const resultDocumentId =
      typeof padesPackage?.resultDocumentId === "string" ? padesPackage.resultDocumentId : null;

    if (!resultDocumentId) {
      throw new Error("Signicat signing session does not contain a PADES result document yet");
    }

    const documentResponse = await this.signedRequest(
      `${this.documentsPath}/${encodeURIComponent(resultDocumentId)}`
    );
    if (!documentResponse.ok) {
      const raw = await safeJson(documentResponse);
      throw new Error(
        `Signicat signed document download error (${documentResponse.status}): ${JSON.stringify(raw)}`
      );
    }
    const arr = await documentResponse.arrayBuffer();
    return Buffer.from(arr);
  }

  async downloadEvidence(providerSessionId: string): Promise<SigningArtifact[]> {
    const status = await this.getSigningSessionStatus(providerSessionId);
    return [
      {
        filename: "audit.json",
        contentType: "application/json",
        content: JSON.stringify(
          {
            provider: "signicat",
            providerSessionId,
            fetchedAt: new Date().toISOString(),
            status,
          },
          null,
          2
        ),
      },
    ];
  }

  async parseWebhook(request: Request): Promise<NormalizedWebhookEvent | null> {
    if (this.webhookSecret) {
      const header =
        request.headers.get("x-signicat-signature") ||
        request.headers.get("x-webhook-secret") ||
        request.headers.get("authorization");
      const expectedBearer = `Bearer ${this.webhookSecret}`;
      if (header !== this.webhookSecret && header !== expectedBearer) {
        return null;
      }
    }

    const raw = (await request.json().catch(() => null)) as unknown;
    if (!raw) return null;
    const record = asRecord(raw);
    if (!record) return null;

    const providerSessionId =
      (typeof record.signingId === "string" && record.signingId) ||
      (typeof record.id === "string" && record.id) ||
      (typeof record.packageId === "string" && record.packageId) ||
      (typeof record.sessionId === "string" && record.sessionId) ||
      (asRecord(record.eventData)?.id as string | undefined);

    if (!providerSessionId) return null;

    const eventType =
      (typeof record.eventName === "string" && record.eventName) ||
      (typeof record.eventType === "string" && record.eventType) ||
      (typeof record.type === "string" && record.type) ||
      undefined;

    const packageStatus =
      eventType === "package.completed"
        ? "completed"
        : eventType === "signing-session.completed"
          ? "completed"
        : eventType === "signing-session.opened"
          ? "viewed"
        : eventType === "package.failed"
          ? "failed"
          : normalizeStatus(record.status) || normalizeStatus(record.state) || normalizeStatus(eventType);

    const signerCandidates = [
      ...(Array.isArray(record.signers) ? record.signers : []),
      ...(Array.isArray(record.signatures) ? record.signatures : []),
      ...(Array.isArray(record.events) ? record.events : []),
      ...(asRecord(record.eventData) ? [record.eventData] : []),
    ];

    const signerUpdates: NormalizedSignerUpdate[] = signerCandidates
      .map((candidate) => {
        const signer = asRecord(candidate);
        if (!signer) return null;
        const status =
          normalizeStatus(signer.status) ||
          normalizeStatus(signer.state) ||
          normalizeStatus(signer.eventType) ||
          normalizeStatus(signer.type);
        if (!status) return null;
        return {
          boardMemberId:
            (typeof signer.externalId === "string" && signer.externalId) ||
            (typeof signer.boardMemberId === "string" && signer.boardMemberId) ||
            (typeof signer.externalReference === "string" ? signer.externalReference.split(":")[1] : undefined) ||
            undefined,
          email:
            (typeof signer.email === "string" && signer.email) ||
            (typeof signer.signerEmail === "string" && signer.signerEmail) ||
            undefined,
          providerSignerId:
            (typeof signer.id === "string" && signer.id) ||
            (typeof signer.signerId === "string" && signer.signerId) ||
            undefined,
          status,
          signedAt:
            typeof signer.signedAt === "string" ? new Date(signer.signedAt) :
            typeof signer.completedAt === "string" ? new Date(signer.completedAt) : undefined,
          raw: candidate,
        };
      })
      .filter(Boolean) as NormalizedSignerUpdate[];

    return {
      providerSessionId,
      eventType,
      signerUpdates,
      packageStatus,
      completed:
        eventType === "package.completed" ||
        eventType === "signing-session.completed" ||
        packageStatus === "completed",
      raw,
    };
  }
}
