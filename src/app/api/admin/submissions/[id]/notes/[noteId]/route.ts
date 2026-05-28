import { checkInternalAdmin } from "@/lib/admin-auth";
import { findWarrantyBySubmissionId, removeClaimNote } from "@/lib/warranty-mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string; noteId: string }> };

export async function DELETE(request: Request, { params }: RouteParams) {
  const denied = checkInternalAdmin(request);
  if (denied) return denied;

  const { id, noteId } = await params;
  try {
    const ok = await removeClaimNote(id, noteId);
    if (!ok) return Response.json({ error: "not found" }, { status: 404 });
    const doc = await findWarrantyBySubmissionId(id);
    return Response.json({ ok: true, doc });
  } catch (err) {
    console.error("admin remove note failed", { id, noteId, err });
    return Response.json({ error: "remove note failed" }, { status: 500 });
  }
}
