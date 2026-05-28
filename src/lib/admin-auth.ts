import "server-only";

const TOKEN_HEADER = "authorization";

/**
 * Authorises an internal admin caller. Returns null on success, or a JSON
 * Response (401 / 503) on failure that the route should return as-is.
 *
 * Security model: the warranty service trusts any caller that presents
 * `Authorization: Bearer <INTERNAL_ADMIN_TOKEN>`. The token is a shared secret
 * with t4a-admin and lives only in server-side env. Never expose to the browser.
 */
export function checkInternalAdmin(request: Request): Response | null {
  const expected = process.env.INTERNAL_ADMIN_TOKEN;
  if (!expected) {
    return Response.json(
      { error: "INTERNAL_ADMIN_TOKEN not configured" },
      { status: 503 },
    );
  }
  const header = request.headers.get(TOKEN_HEADER) ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  const provided = m?.[1]?.trim();
  if (!provided || provided !== expected) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
