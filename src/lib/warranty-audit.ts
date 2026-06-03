// ============================================================================
// Change history (audit log) — Mongo-backed store
// ============================================================================
//
// One collection, `warranty_audit`, holds an append-only timeline of edits to
// claims and email settings. See warranty_implementation.md §3.

import { ObjectId } from "mongodb";
import { getMongoDb } from "./mongo";
import type {
  AuditChange,
  AuditEntityType,
  AuditEntry,
  AuditEnvelope,
} from "@/types/warranty-audit";

export const WARRANTY_AUDIT_COLLECTION = "warranty_audit";

// Timeline reads scope to a single entity and cap at the newest 200 — plenty
// for this volume.
const MAX_ENTRIES = 200;

type AuditDoc = {
  _id?: ObjectId;
  entityType: AuditEntityType;
  entityId: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  message: string;
  changes: AuditChange[];
  createdAt: Date;
};

let indexesEnsured = false;

async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const db = await getMongoDb();
  // Timeline reads always scope to one entity, newest first.
  await db
    .collection(WARRANTY_AUDIT_COLLECTION)
    .createIndex({ entityType: 1, entityId: 1, createdAt: -1 });
  indexesEnsured = true;
}

/**
 * Records one audit entry — best-effort. Skips no-op saves (no field changes
 * and no note), and never throws: auditing must never fail the underlying save
 * (warranty_implementation.md §4.3 / §4.4). Call this *after* the update has
 * been persisted so history never shows a change that didn't land.
 */
export async function recordAuditEntry(
  entityType: AuditEntityType,
  entityId: string,
  audit: AuditEnvelope,
  changes: AuditChange[],
): Promise<void> {
  if (changes.length === 0 && audit.message.trim() === "") return;
  try {
    await ensureIndexes();
    const db = await getMongoDb();
    const actorName =
      audit.actorName.trim() || audit.actorEmail.trim() || "Admin";
    await db.collection<AuditDoc>(WARRANTY_AUDIT_COLLECTION).insertOne({
      entityType,
      entityId,
      actorId: audit.actorId ?? "",
      actorName,
      actorEmail: audit.actorEmail ?? "",
      message: audit.message ?? "",
      changes,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("audit record failed", { entityType, entityId, err });
  }
}

function toEntry(doc: AuditDoc): AuditEntry {
  const createdAt =
    doc.createdAt instanceof Date
      ? doc.createdAt
      : new Date(doc.createdAt as unknown as string);
  return {
    id: doc._id ? doc._id.toString() : "",
    entityType: doc.entityType,
    entityId: doc.entityId,
    actorId: doc.actorId ?? "",
    actorName: doc.actorName ?? "",
    actorEmail: doc.actorEmail ?? "",
    message: doc.message ?? "",
    changes: Array.isArray(doc.changes) ? doc.changes : [],
    createdAt: createdAt.toISOString(),
  };
}

/** Returns an entity's history, newest first, capped at the most recent 200. */
export async function listAuditEntries(
  entityType: AuditEntityType,
  entityId: string,
): Promise<AuditEntry[]> {
  await ensureIndexes();
  const db = await getMongoDb();
  const docs = await db
    .collection<AuditDoc>(WARRANTY_AUDIT_COLLECTION)
    .find({ entityType, entityId })
    .sort({ createdAt: -1 })
    .limit(MAX_ENTRIES)
    .toArray();
  return docs.map(toEntry);
}
