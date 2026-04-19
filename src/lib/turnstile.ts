import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const DEFAULT_SESSION_TTL_SECONDS = 30 * 60;

function getSessionSecret(): string {
  const secret = process.env.TURNSTILE_SESSION_SECRET;
  if (!secret) {
    throw new Error("TURNSTILE_SESSION_SECRET is not configured");
  }
  return secret;
}

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload: string): string {
  return base64url(createHmac("sha256", getSessionSecret()).update(payload).digest());
}

export type VerifyTurnstileResult =
  | { ok: true }
  | { ok: false; errorCodes?: string[] };

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<VerifyTurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new Error("TURNSTILE_SECRET_KEY is not configured");
  }
  if (!token) {
    return { ok: false, errorCodes: ["missing-input-response"] };
  }

  const body = new URLSearchParams();
  body.append("secret", secret);
  body.append("response", token);
  if (remoteIp) body.append("remoteip", remoteIp);

  const res = await fetch(SITEVERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    return { ok: false, errorCodes: [`http-${res.status}`] };
  }

  const data = (await res.json()) as {
    success: boolean;
    "error-codes"?: string[];
  };

  if (data.success) return { ok: true };
  return { ok: false, errorCodes: data["error-codes"] };
}

export type IssuedSessionToken = {
  token: string;
  expiresAt: number;
};

const SUBMISSION_ID_RX = /^[a-zA-Z0-9-]{8,64}$/;

export function isValidSubmissionId(value: unknown): value is string {
  return typeof value === "string" && SUBMISSION_ID_RX.test(value);
}

export function issueSessionToken(
  submissionId: string,
  ttlSeconds: number = DEFAULT_SESSION_TTL_SECONDS,
): IssuedSessionToken {
  if (!isValidSubmissionId(submissionId)) {
    throw new Error("invalid submissionId");
  }
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const nonce = base64url(randomBytes(12));
  const payload = `${submissionId}.${exp}.${nonce}`;
  const signature = sign(payload);
  return { token: `${payload}.${signature}`, expiresAt: exp };
}

export type SessionVerifyResult =
  | { ok: true; submissionId: string; expiresAt: number }
  | {
      ok: false;
      reason: "malformed" | "expired" | "bad_signature" | "submission_mismatch";
    };

export function verifySessionToken(
  token: string | null | undefined,
  expectedSubmissionId?: string,
): SessionVerifyResult {
  if (!token) return { ok: false, reason: "malformed" };
  const parts = token.split(".");
  if (parts.length !== 4) return { ok: false, reason: "malformed" };

  const [submissionId, expStr, nonce, signature] = parts;
  const exp = Number(expStr);
  if (
    !isValidSubmissionId(submissionId) ||
    !Number.isFinite(exp) ||
    !nonce ||
    !signature
  ) {
    return { ok: false, reason: "malformed" };
  }

  const expected = sign(`${submissionId}.${expStr}.${nonce}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }

  if (Math.floor(Date.now() / 1000) > exp) {
    return { ok: false, reason: "expired" };
  }

  if (expectedSubmissionId && submissionId !== expectedSubmissionId) {
    return { ok: false, reason: "submission_mismatch" };
  }

  return { ok: true, submissionId, expiresAt: exp };
}
