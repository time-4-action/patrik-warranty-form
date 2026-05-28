import { randomUUID } from "crypto";
import type { WarrantyPayload } from "@/types/warranty";
import {
  WARRANTY_STATUSES,
  normaliseStatus,
  normaliseWorkflow,
  type Assignee,
  type ClaimNote,
  type CustomerStatus,
  type FactoryStatus,
  type WarrantyStatus,
  type WarrantySuggestion,
  type WarrantyType,
  type WorkflowFields,
} from "@/types/warranty-settings";
import { WARRANTY_COLLECTION, getMongoDb } from "./mongo";

export type WarrantyDocument = WarrantyPayload &
  WorkflowFields & {
    submittedAt: string;
    statusUpdatedAt?: string;
    workflowUpdatedAt?: string;
    notes: ClaimNote[];
  };

function hydrate(raw: Record<string, unknown>): WarrantyDocument {
  const workflow = normaliseWorkflow(raw);
  const notesRaw = Array.isArray(raw.notes) ? (raw.notes as ClaimNote[]) : [];
  const notes = notesRaw
    .filter((n) => n && typeof n.text === "string")
    .map((n) => ({
      id: typeof n.id === "string" ? n.id : randomUUID(),
      authorName: String(n.authorName ?? ""),
      authorEmail: String(n.authorEmail ?? ""),
      text: String(n.text),
      createdAt: typeof n.createdAt === "string" ? n.createdAt : new Date().toISOString(),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    ...(raw as unknown as WarrantyDocument),
    ...workflow,
    notes,
  };
}

export async function insertWarrantyDoc(
  p: WarrantyPayload,
  submittedAt: string,
): Promise<void> {
  const db = await getMongoDb();
  await db.collection(WARRANTY_COLLECTION).insertOne({
    ...p,
    submittedAt,
    status: "open" satisfies WarrantyStatus,
    statusUpdatedAt: submittedAt,
    assignee: null,
    warrantyType: null,
    suggestion: null,
    factoryStatus: null,
    customerStatus: null,
    workflowUpdatedAt: submittedAt,
    notes: [],
  });
}

export async function findWarrantyBySubmissionId(
  submissionId: string,
): Promise<WarrantyDocument | null> {
  const db = await getMongoDb();
  const doc = await db
    .collection(WARRANTY_COLLECTION)
    .findOne({ submissionId }, { projection: { _id: 0 } });
  if (!doc) return null;
  return hydrate(doc as Record<string, unknown>);
}

export type ListWarrantyFilter = {
  status?: WarrantyStatus | "all";
  assignee?: Assignee | "unassigned" | "all";
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  skip?: number;
};

export type ListWarrantyResult = {
  total: number;
  items: WarrantyDocument[];
};

export async function listWarrantySubmissions(
  filter: ListWarrantyFilter = {},
): Promise<ListWarrantyResult> {
  const db = await getMongoDb();
  const coll = db.collection(WARRANTY_COLLECTION);

  const q: Record<string, unknown> = {};
  if (filter.status && filter.status !== "all") {
    if (filter.status === "open") {
      // legacy docs may have "new" — include both
      q.$or = [{ status: "open" }, { status: "new" }, { status: { $exists: false } }];
    } else {
      q.status = filter.status;
    }
  }
  if (filter.assignee && filter.assignee !== "all") {
    if (filter.assignee === "unassigned") {
      q.$and = [
        ...(q.$and ? (q.$and as object[]) : []),
        { $or: [{ assignee: null }, { assignee: { $exists: false } }, { assignee: "" }] },
      ];
    } else {
      q.assignee = filter.assignee;
    }
  }
  if (filter.search?.trim()) {
    const safe = filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(safe, "i");
    const searchOr = [
      { submissionId: rx },
      { name: rx },
      { surname: rx },
      { email: rx },
      { company: rx },
      { productName: rx },
      { serialNumber: rx },
      { invoiceNumber: rx },
    ];
    if (q.$or) {
      q.$and = [...(q.$and ? (q.$and as object[]) : []), { $or: q.$or }, { $or: searchOr }];
      delete q.$or;
    } else {
      q.$or = searchOr;
    }
  }
  if (filter.from || filter.to) {
    const range: Record<string, string> = {};
    if (filter.from) range.$gte = filter.from;
    if (filter.to) range.$lte = filter.to;
    q.submittedAt = range;
  }

  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 500);
  const skip = Math.max(filter.skip ?? 0, 0);

  const [total, raw] = await Promise.all([
    coll.countDocuments(q),
    coll
      .find(q, { projection: { _id: 0 } })
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
  ]);

  const items = raw.map((d) => hydrate(d as Record<string, unknown>));
  return { total, items };
}

// ----------------------------------------------------------------------------
// Workflow / status / notes updates
// ----------------------------------------------------------------------------

export type WorkflowPatch = Partial<{
  status: WarrantyStatus | null;
  assignee: Assignee | null;
  warrantyType: WarrantyType | null;
  suggestion: WarrantySuggestion | null;
  factoryStatus: FactoryStatus | null;
  customerStatus: CustomerStatus | null;
}>;

export async function updateWarrantyWorkflow(
  submissionId: string,
  patch: WorkflowPatch,
): Promise<WarrantyDocument | null> {
  const db = await getMongoDb();
  const coll = db.collection(WARRANTY_COLLECTION);
  const now = new Date().toISOString();

  const set: Record<string, unknown> = { workflowUpdatedAt: now };
  if ("status" in patch) {
    const status = patch.status;
    if (status && !WARRANTY_STATUSES.includes(status)) return null;
    set.status = status ?? "open";
    set.statusUpdatedAt = now;
  }
  for (const k of ["assignee", "warrantyType", "suggestion", "factoryStatus", "customerStatus"] as const) {
    if (k in patch) set[k] = patch[k] ?? null;
  }

  const res = await coll.findOneAndUpdate(
    { submissionId },
    { $set: set },
    { returnDocument: "after", projection: { _id: 0 } },
  );
  if (!res) return null;
  return hydrate(res as unknown as Record<string, unknown>);
}

export async function addClaimNote(
  submissionId: string,
  input: { text: string; authorName: string; authorEmail: string },
): Promise<ClaimNote | null> {
  const text = input.text?.trim();
  if (!text) return null;
  const note: ClaimNote = {
    id: randomUUID(),
    authorName: input.authorName?.trim() || "Admin",
    authorEmail: input.authorEmail?.trim() || "",
    text,
    createdAt: new Date().toISOString(),
  };
  const db = await getMongoDb();
  const res = await db.collection(WARRANTY_COLLECTION).updateOne(
    { submissionId },
    { $push: { notes: note } as never },
  );
  if (res.matchedCount === 0) return null;
  return note;
}

export async function removeClaimNote(
  submissionId: string,
  noteId: string,
): Promise<boolean> {
  const db = await getMongoDb();
  const res = await db.collection(WARRANTY_COLLECTION).updateOne(
    { submissionId },
    { $pull: { notes: { id: noteId } } as never },
  );
  return res.modifiedCount > 0;
}

// Re-export for callers that used to import normaliseStatus from this file.
export { normaliseStatus };
