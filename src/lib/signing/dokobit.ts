import "server-only";
import crypto from "crypto";
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

function normalizeStatus(value: unknown): NormalizedSignatureStatus | undefined {
  if (typeof value !== "string") return undefined;
  const key = value.toLowerCase();
  if (["created", "pending", "draft"].includes(key)) return "created";
  if (["sent", "invited", "invitation_sent"].includes(key)) return "sent";
  if (["viewed", "opened", "seen"].includes(key)) return "viewed";
  if (["signed", "completed_by_signer", "signed_by_signer"].includes(key)) return "signed";
  if (["declined", "rejected"].includes(key)) return "declined";
  if (["failed", "error"].includes(key)) return "failed";
  if (["expired", "timeout"].includes(key)) return "expired";
  if (["cancelled", "canceled"].includes(key)) return "cancelled";
  if (["completed", "signed_all", "done", "archived"].includes(key)) return "completed";
  return undefined;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { name: "Signer", surname: "User" };
  if (parts.length === 1) return { name: parts[0], surname: "." };
  return { name: parts.slice(0, -1).join(" "), surname: parts[parts.length - 1] };
}

function applyTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => values[key] ?? "");
}

function sha256Hex(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export class DokobitSigningProvider implements SigningProvider {
  readonly key = "dokobit" as const;

  private readonly baseUrl = (process.env.DOKOBIT_BASE_URL || "https://beta.dokobit.com").replace(/\/$/, "");
  private readonly accessToken = requireEnv("DOKOBIT_ACCESS_TOKEN");
  private readonly webhookSecret = process.env.DOKOBIT_WEBHOOK_SECRET || "";
  private readonly createPath =
    process.env.DOKOBIT_SIGNING_CREATE_PATH || "/api/signing-external/create.json";
  private readonly statusPathTemplate =
    process.env.DOKOBIT_SIGNING_STATUS_PATH_TEMPLATE || "/api/signing/{token}/status.json";
  private readonly downloadPathTemplate =
    process.env.DOKOBIT_SIGNING_DOWNLOAD_PATH_TEMPLATE || "/api/signing/{token}/download";
  private readonly signerUrlTemplate =
    process.env.DOKOBIT_SIGNER_URL_TEMPLATE || "";
  private readonly language = process.env.DOKOBIT_LANGUAGE || "lt";
  private readonly postbackMode = (process.env.DOKOBIT_POSTBACK_MODE || "json").toLowerCase();
  private readonly authMode = (process.env.DOKOBIT_AUTH_MODE || "query").toLowerCase(); // query|header

  private buildUrl(path: string) {
    const url = new URL(`${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
    if (this.authMode !== "header") {
      url.searchParams.set("access_token", this.accessToken);
    }
    return url;
  }

  private async request(path: string, init?: RequestInit) {
    const url = this.buildUrl(path);
    return fetch(url, {
      ...init,
      headers: {
        ...(this.authMode === "header" ? { Authorization: `Bearer ${this.accessToken}` } : {}),
        ...(init?.headers || {}),
      },
    });
  }

  private getPostbackUrl() {
    const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
    if (!base) return undefined;
    return `${base}/api/signing/dokobit/webhook`;
  }

  private extractSignerSessions(raw: unknown, recipients: CreateProtocolSigningSessionInput["recipients"]) {
    const root = asRecord(raw);
    const signersRaw = Array.isArray(root?.signers) ? root.signers : [];
    return recipients.map((recipient, index) => {
      const signer = asRecord(signersRaw[index]) || null;
      const signerToken =
        (typeof signer?.token === "string" && signer.token) ||
        (typeof signer?.signer_token === "string" && signer.signer_token) ||
        undefined;
      const redirectUri =
        (typeof signer?.redirect_uri === "string" && signer.redirect_uri) ||
        (typeof signer?.redirectUrl === "string" && signer.redirectUrl) ||
        undefined;
      const signatureUrl =
        redirectUri ||
        (this.signerUrlTemplate && signerToken
          ? applyTemplate(this.signerUrlTemplate, { signerToken, token: String(root?.token || "") })
          : undefined);

      return {
        boardMemberId: recipient.boardMemberId,
        email: recipient.email,
        sessionId: signerToken || `${root?.token || ""}:${recipient.boardMemberId}`,
        signatureUrl,
        raw: signer || raw,
      };
    });
  }

  async createProtocolSigningSession(
    input: CreateProtocolSigningSessionInput
  ): Promise<CreateProtocolSigningSessionResult> {
    const form = new FormData();
    form.set("type", "pdf");
    form.set("name", `Protokollsignering ${input.companyName} ${input.protocolDateLabel}`);
    form.set("subject", `Protokoll til signering - ${input.companyName}`);
    form.set("files[0][name]", input.fileName);
    form.set("files[0][content]", input.pdfBuffer.toString("base64"));
    form.set("files[0][digest]", sha256Hex(input.pdfBuffer));
    const postbackUrl = this.getPostbackUrl();
    if (postbackUrl) {
      form.set("postback_url", postbackUrl);
    }
    if (this.postbackMode) {
      form.set("postback", this.postbackMode);
    }

    input.recipients.forEach((recipient, idx) => {
      const { name, surname } = splitName(recipient.name);
      form.set(`signers[${idx}][name]`, name);
      form.set(`signers[${idx}][surname]`, surname);
      form.set(`signers[${idx}][email]`, recipient.email);
      form.set(`signers[${idx}][external_id]`, recipient.boardMemberId);
      form.set(`signers[${idx}][notifications_language]`, this.language);
    });

    const response = await this.request(this.createPath, {
      method: "POST",
      body: form,
    });
    const raw = await safeJson(response);
    if (!response.ok) {
      throw new Error(`Dokobit create signing error (${response.status}): ${JSON.stringify(raw)}`);
    }

    const record = asRecord(raw);
    const providerSessionId =
      (typeof record?.token === "string" && record.token) ||
      (typeof record?.id === "string" && record.id) ||
      null;

    if (!providerSessionId) {
      throw new Error("Dokobit create signing response did not include token/id");
    }

    const signingSessions = this.extractSignerSessions(raw, input.recipients);

    return {
      providerSessionId,
      signatureLevel: "aes",
      raw: {
        ...record,
        signingSessions,
      },
    };
  }

  async getSigningSessionStatus(providerSessionId: string) {
    const path = applyTemplate(this.statusPathTemplate, { token: providerSessionId });
    const response = await this.request(path);
    const raw = await safeJson(response);
    if (!response.ok) {
      throw new Error(`Dokobit status error (${response.status}): ${JSON.stringify(raw)}`);
    }

    const root = asRecord(raw);
    const signers = Array.isArray(root?.signers) ? root.signers : [];
    const signerUpdates: NormalizedSignerUpdate[] = signers
      .map(asRecord)
      .filter(Boolean)
      .map((signer) => ({
        boardMemberId:
          typeof signer!.external_id === "string" ? signer!.external_id : undefined,
        email: typeof signer!.email === "string" ? signer!.email : undefined,
        providerSignerId:
          typeof signer!.token === "string"
            ? signer!.token
            : typeof signer!.signer_token === "string"
              ? signer!.signer_token
              : undefined,
        status:
          normalizeStatus(signer!.status) ||
          normalizeStatus(signer!.action) ||
          "created",
        raw: signer!,
      }));

    const packageStatus =
      normalizeStatus(root?.status) ||
      normalizeStatus(root?.action) ||
      (signerUpdates.length > 0 && signerUpdates.every((s) => s.status === "signed")
        ? "completed"
        : undefined);

    return {
      packageStatus,
      signerUpdates,
      raw,
    };
  }

  async downloadSignedProtocol(providerSessionId: string): Promise<Buffer> {
    const path = applyTemplate(this.downloadPathTemplate, { token: providerSessionId });
    const response = await this.request(path);
    if (!response.ok) {
      const raw = await safeJson(response);
      throw new Error(`Dokobit download error (${response.status}): ${JSON.stringify(raw)}`);
    }
    const arr = await response.arrayBuffer();
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
            provider: "dokobit",
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
        request.headers.get("x-dokobit-signature") ||
        request.headers.get("x-webhook-secret") ||
        request.headers.get("authorization");
      const expectedBearer = `Bearer ${this.webhookSecret}`;
      if (header !== this.webhookSecret && header !== expectedBearer) {
        return null;
      }
    }

    const body = (await request.json().catch(() => null)) as unknown;
    const root = asRecord(body);
    if (!root) return null;

    const providerSessionId =
      (typeof root.token === "string" && root.token) ||
      (typeof root.signing_token === "string" && root.signing_token) ||
      (typeof root.id === "string" && root.id) ||
      "";
    if (!providerSessionId) return null;

    const signer = asRecord(root.signer) || asRecord(root.signer_info);
    const signerStatus =
      normalizeStatus(root.action) ||
      normalizeStatus(root.status) ||
      normalizeStatus(signer?.status);

    const signerUpdates: NormalizedSignerUpdate[] =
      signer && signerStatus
        ? [
            {
              boardMemberId:
                typeof signer.external_id === "string" ? signer.external_id : undefined,
              email: typeof signer.email === "string" ? signer.email : undefined,
              providerSignerId:
                typeof signer.token === "string"
                  ? signer.token
                  : typeof signer.signer_token === "string"
                    ? signer.signer_token
                    : undefined,
              status: signerStatus === "completed" ? "signed" : signerStatus,
              raw: signer,
            },
          ]
        : [];

    const packageStatus = normalizeStatus(root.status) || normalizeStatus(root.action);
    const completed = packageStatus === "completed" || packageStatus === "signed";

    return {
      providerSessionId,
      eventType: typeof root.action === "string" ? root.action : undefined,
      signerUpdates,
      packageStatus:
        completed && packageStatus !== "completed"
          ? "completed"
          : packageStatus,
      completed,
      raw: body,
    };
  }
}
