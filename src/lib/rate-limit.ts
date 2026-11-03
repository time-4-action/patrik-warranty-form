import { getSql } from "./db";

export const SUBMISSION_LIMIT = 5;
// 4 slots × SUBMISSION_LIMIT submissions, plus headroom for retries / reloads.
export const UPLOAD_LIMIT = SUBMISSION_LIMIT * 4 * 2;
export const WINDOW_MS = 60 * 60 * 1000;

export type RateLimitResult =
  | { allowed: true; remaining: number; limit: number }
  | { allowed: false; retryAfterSeconds: number; limit: number };

// Old rows are deleted per key on every call; this sweeps keys that went quiet,
// on roughly 1 call in 50.
const SWEEP_PROBABILITY = 0.02;

/**
 * Sliding-window rate limit: at most `limit` attempts per `windowMs` per key.
 * One row per attempt in `rate_limit_attempt`. A transaction-scoped advisory
 * lock on the key makes count-then-insert atomic across requests.
 */
export async function consumeSubmissionAttempt(
  key: string,
  limit: number = SUBMISSION_LIMIT,
  windowMs: number = WINDOW_MS,
): Promise<RateLimitResult> {
  const sql = getSql();
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  const result = await sql.begin(async (tx): Promise<RateLimitResult> => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${"rl:" + key}))`;
    await tx`DELETE FROM rate_limit_attempt WHERE key = ${key} AND at < ${windowStart}`;
    const attempts = await tx<{ at: Date }[]>`
      SELECT at FROM rate_limit_attempt WHERE key = ${key} ORDER BY at`;
    if (attempts.length >= limit) {
      const oldest = attempts[0].at;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldest.getTime() + windowMs - now.getTime()) / 1000),
      );
      return { allowed: false, retryAfterSeconds, limit };
    }
    await tx`INSERT INTO rate_limit_attempt (key, at) VALUES (${key}, ${now})`;
    return { allowed: true, remaining: limit - attempts.length - 1, limit };
  });

  if (Math.random() < SWEEP_PROBABILITY) {
    const cutoff = new Date(now.getTime() - 2 * windowMs);
    sql`DELETE FROM rate_limit_attempt WHERE at < ${cutoff}`.catch((err) =>
      console.error("rate limit sweep failed", err),
    );
  }

  return result;
}

/**
 * Extract the caller's IP address. Prefers Cloudflare / proxy-provided headers,
 * then falls back to a generic `unknown` bucket (so mis-configured deployments
 * still get rate limited, just globally).
 */
export function getClientIp(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}
