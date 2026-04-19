import { getMongoDb } from "./mongo";

export const RATE_LIMIT_COLLECTION = "rate_limits";
export const SUBMISSION_LIMIT = 5;
// 4 slots × SUBMISSION_LIMIT submissions, plus headroom for retries / reloads.
export const UPLOAD_LIMIT = SUBMISSION_LIMIT * 4 * 2;
export const WINDOW_MS = 60 * 60 * 1000;

type RateLimitDoc = {
  _id: string;
  attempts: Date[];
  updatedAt: Date;
};

export type RateLimitResult =
  | { allowed: true; remaining: number; limit: number }
  | { allowed: false; retryAfterSeconds: number; limit: number };

let indexesEnsured = false;

async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const db = await getMongoDb();
  // TTL on updatedAt so idle IPs drop out of the collection after the window passes.
  await db.collection(RATE_LIMIT_COLLECTION).createIndex(
    { updatedAt: 1 },
    { expireAfterSeconds: Math.ceil(WINDOW_MS / 1000) * 2 },
  );
  indexesEnsured = true;
}

/**
 * Sliding-window rate limit: at most `limit` attempts per `windowMs` per key.
 * Atomically prunes stale timestamps and (if under the limit) records the new attempt.
 */
export async function consumeSubmissionAttempt(
  key: string,
  limit: number = SUBMISSION_LIMIT,
  windowMs: number = WINDOW_MS,
): Promise<RateLimitResult> {
  await ensureIndexes();
  const db = await getMongoDb();
  const coll = db.collection<RateLimitDoc>(RATE_LIMIT_COLLECTION);

  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  const result = await coll.findOneAndUpdate(
    { _id: key },
    [
      {
        $set: {
          attempts: {
            $filter: {
              input: { $ifNull: ["$attempts", []] },
              cond: { $gte: ["$$this", windowStart] },
            },
          },
        },
      },
      {
        $set: {
          attempts: {
            $cond: [
              { $lt: [{ $size: "$attempts" }, limit] },
              { $concatArrays: ["$attempts", [now]] },
              "$attempts",
            ],
          },
          updatedAt: now,
        },
      },
    ],
    { upsert: true, returnDocument: "after" },
  );

  const attempts: Date[] = result?.attempts ?? [];
  const accepted =
    attempts.length > 0 &&
    attempts[attempts.length - 1].getTime() === now.getTime();

  if (!accepted) {
    const oldest = attempts[0];
    const retryAfterSeconds = oldest
      ? Math.max(1, Math.ceil((oldest.getTime() + windowMs - now.getTime()) / 1000))
      : Math.ceil(windowMs / 1000);
    return { allowed: false, retryAfterSeconds, limit };
  }

  return { allowed: true, remaining: limit - attempts.length, limit };
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
