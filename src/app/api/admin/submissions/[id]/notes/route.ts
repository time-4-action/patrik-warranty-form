import { checkInternalAdmin } from "@/lib/admin-auth";
import { addClaimNote, findWarrantyBySubmissionId } from "@/lib/warranty-mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const denied = checkInternalAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  let body: { text?: string; authorName?: string; authorEmail?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const text = (body.text ?? "").trim();
  if (!text) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }
  try {
    const note = await addClaimNote(id, {
      text,
      authorName: body.authorName ?? "",
      authorEmail: body.authorEmail ?? "",
    });
    if (!note) return Response.json({ error: "not found" }, { status: 404 });
    const doc = await findWarrantyBySubmissionId(id);
    return Response.json({ note, doc });
  } catch (err) {
    console.error("admin add note failed", { id, err });
    return Response.json({ error: "add note failed" }, { status: 500 });
  }
}
