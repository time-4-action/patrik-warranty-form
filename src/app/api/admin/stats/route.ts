import { checkInternalReader } from "@/lib/admin-auth";
import { getWarrantyStats } from "@/lib/warranty-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Claim counts for the T4A agent (read token) and t4a-admin (admin token).
// `from` / `to` filter submittedAt exactly like GET /api/admin/submissions.
export async function GET(request: Request) {
  const denied = checkInternalReader(request);
  if (denied) return denied;

  const url = new URL(request.url);
  try {
    const stats = await getWarrantyStats({
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
    });
    return Response.json(stats);
  } catch (err) {
    console.error("admin stats failed", err);
    return Response.json({ error: "stats failed" }, { status: 500 });
  }
}
