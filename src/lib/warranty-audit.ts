// ============================================================================
// Change history (audit log) — Postgres-backed store
// ============================================================================
//
// One table, `warranty_audit`, holds an append-only timeline of edits to
// claims and email settings. See warranty_implementation.md §3.

import { randomUUID } from "crypto";
import { getSql } from "./db";
import type {
  AuditChange,
  AuditEntityType,
  AuditEntry,
  AuditEnvelope,
} from "@/types/warranty-audit";

// Timeline reads scope to a single entity and cap at the newest 200 — plenty
// for this volume.
const MAX_ENTRIES = 200;

type AuditRow = {
  id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  actor_id: string;
  actor_name: string;
  actor_email: string;
  message: string;
  changes: AuditChange[];
  created_at: Date;
};

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
    const sql = getSql();
    const actorName =
      audit.actorName.trim() || audit.actorEmail.trim() || "Admin";
    await sql`
      INSERT INTO warranty_audit
        (id, entity_type, entity_id, actor_id, actor_name, actor_email, message, changes)
      VALUES (${randomUUID()}, ${entityType}, ${entityId}, ${audit.actorId ?? ""},
              ${actorName}, ${audit.actorEmail ?? ""}, ${audit.message ?? ""},
              ${sql.json(changes)})`;
  } catch (err) {
    console.error("audit record failed", { entityType, entityId, err });
  }
}

function toEntry(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorEmail: row.actor_email,
    message: row.message,
    changes: Array.isArray(row.changes) ? row.changes : [],
    createdAt: row.created_at.toISOString(),
  };
}

/** Returns an entity's history, newest first, capped at the most recent 200. */
export async function listAuditEntries(
  entityType: AuditEntityType,
  entityId: string,
): Promise<AuditEntry[]> {
  const sql = getSql();
  const rows = await sql<AuditRow[]>`
    SELECT * FROM warranty_audit
    WHERE entity_type = ${entityType} AND entity_id = ${entityId}
    ORDER BY created_at DESC
    LIMIT ${MAX_ENTRIES}`;
  return rows.map(toEntry);
}
