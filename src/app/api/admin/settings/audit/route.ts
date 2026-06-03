import { checkInternalAdmin } from "@/lib/admin-auth";
import { listAuditEntries } from "@/lib/warranty-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Email-settings change history, newest first. Empty history → { entries: [] }.
export async function GET(request: Request) {
  const denied = checkInternalAdmin(request);
  if (denied) return denied;
  try {
    const entries = await listAuditEntries("settings", "settings");
    return Response.json({ entries });
  } catch (err) {
    console.error("admin settings audit list failed", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "audit fetch failed" },
      { status: 500 },
    );
  }
}
