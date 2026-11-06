import "server-only";
import { createHash, timingSafeEqual } from "crypto";

const TOKEN_HEADER = "authorization";

function bearerToken(request: Request): string | undefined {
  const header = request.headers.get(TOKEN_HEADER) ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m?.[1]?.trim() || undefined;
}

// Timing-safe string compare. Hashing first makes both sides the same length,
// so the length of the expected token doesn't leak either.
function tokenMatches(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

const unauthorized = () => Response.json({ error: "unauthorized" }, { status: 401 });

/**
 * Authorises an internal admin caller. Returns null on success, or a JSON
 * Response (401 / 503) on failure that the route should return as-is.
 *
 * Security model: the warranty service trusts any caller that presents
 * `Authorization: Bearer <INTERNAL_ADMIN_TOKEN>`. The token is a shared secret
 * with t4a-admin and lives only in server-side env. Never expose to the browser.
 * Every write route (PATCH / POST / PUT / DELETE) and the settings must use this.
 */
export function checkInternalAdmin(request: Request): Response | null {
  const expected = process.env.INTERNAL_ADMIN_TOKEN;
  if (!expected) {
    return Response.json(
      { error: "INTERNAL_ADMIN_TOKEN not configured" },
      { status: 503 },
    );
  }
  const provided = bearerToken(request);
  if (!provided || !tokenMatches(provided, expected)) return unauthorized();
  return null;
}

/**
 * Authorises a read-only caller: `Authorization: Bearer <INTERNAL_READ_TOKEN>`
 * (held by the T4A agent) or the admin token. Use it ONLY on GET routes that
 * read claims; settings and every write route stay on checkInternalAdmin.
 * Returns null on success, 401 on a wrong / missing token, 503 when neither
 * token is configured.
 */
export function checkInternalReader(request: Request): Response | null {
  const expected = [process.env.INTERNAL_READ_TOKEN, process.env.INTERNAL_ADMIN_TOKEN].filter(
    (t): t is string => !!t,
  );
  if (expected.length === 0) {
    return Response.json(
      { error: "INTERNAL_READ_TOKEN / INTERNAL_ADMIN_TOKEN not configured" },
      { status: 503 },
    );
  }
  const provided = bearerToken(request);
  if (!provided) return unauthorized();
  // Compare against every configured token (no short-circuit) so timing
  // doesn't reveal which one matched.
  const ok = expected.map((t) => tokenMatches(provided, t)).some(Boolean);
  return ok ? null : unauthorized();
}
