import { checkInternalAdmin } from "@/lib/admin-auth";
import { listAuditEntries } from "@/lib/warranty-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

// Claim change history, newest first. An unknown submissionId returns an empty
// timeline (200), not 404 — the audit list shouldn't 404 on no history.
export async function GET(request: Request, { params }: RouteParams) {
  const denied = checkInternalAdmin(request);
  if (denied) return denied;
  const { id } = await params;
  try {
    const entries = await listAuditEntries("claim", id);
    return Response.json({ entries });
  } catch (err) {
    console.error("admin submission audit list failed", { id, err });
    return Response.json(
      { error: err instanceof Error ? err.message : "audit fetch failed" },
      { status: 500 },
    );
  }
}
