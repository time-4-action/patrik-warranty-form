// ============================================================================
// One-off copy from MongoDB to Postgres
// ============================================================================
//
// Runs at boot (instrumentation.ts) only when MIGRATE_FROM_MONGODB_URI is set.
// Copies claims (with notes), the audit log and the email settings. Rows that
// already exist in Postgres are left alone, so a restart is harmless. Rate-limit
// buckets are not copied: they expire within the hour anyway.
//
// Remove this file, the env var and the `mongodb` dependency once production
// has run on Postgres for a while (docs/deployment.md, "MongoDB to Postgres").

import type postgres from "postgres";
import { getSql } from "./db";
import { importWarrantyDocuments } from "./warranty-store";

export async function copyFromMongo(uri: string): Promise<void> {
  const { MongoClient } = await import("mongodb");
  const client = await new MongoClient(uri).connect();
  try {
    const db = client.db();
    const sql = getSql();

    const claims = await db.collection("warranty").find().toArray();
    const inserted = await importWarrantyDocuments(
      claims as unknown as Record<string, unknown>[],
    );

    const audit = await db.collection("warranty_audit").find().toArray();
    let auditInserted = 0;
    for (const a of audit) {
      const created = a.createdAt instanceof Date ? a.createdAt : new Date(String(a.createdAt));
      const r = await sql`
        INSERT INTO warranty_audit
          (id, entity_type, entity_id, actor_id, actor_name, actor_email, message, changes, created_at)
        VALUES (${String(a._id)}, ${String(a.entityType)}, ${String(a.entityId)},
          ${String(a.actorId ?? "")}, ${String(a.actorName ?? "")}, ${String(a.actorEmail ?? "")},
          ${String(a.message ?? "")},
          ${sql.json((Array.isArray(a.changes) ? a.changes : []) as postgres.JSONValue)}, ${created})
        ON CONFLICT (id) DO NOTHING`;
      auditInserted += r.count;
    }

    const settings = await db
      .collection<{ _id: string }>("warranty_settings")
      .findOne({ _id: "default" });
    let settingsInserted = 0;
    if (settings) {
      const { _id, ...data } = settings;
      const r = await sql`
        INSERT INTO warranty_settings (id, data) VALUES (${_id}, ${sql.json(data as postgres.JSONValue)})
        ON CONFLICT (id) DO NOTHING`;
      settingsInserted = r.count;
    }

    const mongoNotes = claims.reduce(
      (n, c) => n + (Array.isArray(c.notes) ? c.notes.length : 0),
      0,
    );
    const [pg] = await sql<{ claims: number; notes: number; audit: number; settings: number }[]>`
      SELECT (SELECT count(*)::int FROM warranty) AS claims,
             (SELECT count(*)::int FROM warranty_note) AS notes,
             (SELECT count(*)::int FROM warranty_audit) AS audit,
             (SELECT count(*)::int FROM warranty_settings) AS settings`;
    console.log(
      "[mongo-copy] mongo: " +
        `claims=${claims.length} notes=${mongoNotes} audit=${audit.length} settings=${settings ? 1 : 0}` +
        ` | inserted: claims=${inserted.claims} notes=${inserted.notes} audit=${auditInserted} settings=${settingsInserted}` +
        ` | postgres now: claims=${pg.claims} notes=${pg.notes} audit=${pg.audit} settings=${pg.settings}`,
    );
  } finally {
    await client.close();
  }
}
