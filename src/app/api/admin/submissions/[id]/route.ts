import { checkInternalAdmin } from "@/lib/admin-auth";
import {
  findWarrantyBySubmissionId,
  updateWarrantyStatus,
} from "@/lib/warranty-mongo";
import {
  WARRANTY_STATUSES,
  type WarrantyStatus,
} from "@/types/warranty-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const denied = checkInternalAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  try {
    const doc = await findWarrantyBySubmissionId(id);
    if (!doc) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json(doc);
  } catch (err) {
    console.error("admin submission detail failed", { id, err });
    return Response.json({ error: "fetch failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const denied = checkInternalAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  let body: { status?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const status = body.status as WarrantyStatus | undefined;
  if (!status || !WARRANTY_STATUSES.includes(status)) {
    return Response.json(
      { error: "invalid status", allowed: WARRANTY_STATUSES },
      { status: 400 },
    );
  }

  try {
    const doc = await updateWarrantyStatus(id, status);
    if (!doc) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json(doc);
  } catch (err) {
    console.error("admin submission update failed", { id, err });
    return Response.json({ error: "update failed" }, { status: 500 });
  }
}
