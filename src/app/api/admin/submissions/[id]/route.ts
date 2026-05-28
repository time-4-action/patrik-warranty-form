import { checkInternalAdmin } from "@/lib/admin-auth";
import {
  findWarrantyBySubmissionId,
  updateWarrantyWorkflow,
  type WorkflowPatch,
} from "@/lib/warranty-mongo";
import {
  ASSIGNEES,
  CUSTOMER_STATUSES,
  FACTORY_STATUSES,
  WARRANTY_STATUSES,
  WARRANTY_SUGGESTIONS,
  WARRANTY_TYPES,
  type Assignee,
  type CustomerStatus,
  type FactoryStatus,
  type WarrantyStatus,
  type WarrantySuggestion,
  type WarrantyType,
} from "@/types/warranty-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

function parseEnum<T extends string>(
  raw: unknown,
  allowed: readonly T[],
): T | null | undefined {
  if (raw === undefined) return undefined; // not present in patch
  if (raw === null || raw === "") return null;
  if (typeof raw === "string" && (allowed as readonly string[]).includes(raw)) {
    return raw as T;
  }
  return undefined; // signal "invalid"
}

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
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const patch: WorkflowPatch = {};
  if ("status" in body) {
    const v = parseEnum<WarrantyStatus>(body.status, WARRANTY_STATUSES);
    if (v === undefined) {
      return Response.json(
        { error: "invalid status", allowed: WARRANTY_STATUSES },
        { status: 400 },
      );
    }
    patch.status = v ?? "open";
  }
  if ("assignee" in body) {
    const v = parseEnum<Assignee>(body.assignee, ASSIGNEES);
    if (v === undefined) {
      return Response.json({ error: "invalid assignee", allowed: ASSIGNEES }, { status: 400 });
    }
    patch.assignee = v;
  }
  if ("warrantyType" in body) {
    const v = parseEnum<WarrantyType>(body.warrantyType, WARRANTY_TYPES);
    if (v === undefined) {
      return Response.json({ error: "invalid warrantyType" }, { status: 400 });
    }
    patch.warrantyType = v;
  }
  if ("suggestion" in body) {
    const v = parseEnum<WarrantySuggestion>(body.suggestion, WARRANTY_SUGGESTIONS);
    if (v === undefined) {
      return Response.json({ error: "invalid suggestion" }, { status: 400 });
    }
    patch.suggestion = v;
  }
  if ("factoryStatus" in body) {
    const v = parseEnum<FactoryStatus>(body.factoryStatus, FACTORY_STATUSES);
    if (v === undefined) {
      return Response.json({ error: "invalid factoryStatus" }, { status: 400 });
    }
    patch.factoryStatus = v;
  }
  if ("customerStatus" in body) {
    const v = parseEnum<CustomerStatus>(body.customerStatus, CUSTOMER_STATUSES);
    if (v === undefined) {
      return Response.json({ error: "invalid customerStatus" }, { status: 400 });
    }
    patch.customerStatus = v;
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "no fields to update" }, { status: 400 });
  }

  try {
    const doc = await updateWarrantyWorkflow(id, patch);
    if (!doc) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json(doc);
  } catch (err) {
    console.error("admin submission update failed", { id, err });
    return Response.json({ error: "update failed" }, { status: 500 });
  }
}
