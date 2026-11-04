// ============================================================================
// One-off copy from MongoDB to Postgres
// ============================================================================
//
// Runs at boot (instrumentation.ts) only when MIGRATE_FROM_MONGODB_URI is set,
// and only while the Postgres `warranty` table is empty: once claims exist,
// Postgres is the source of truth and a restart must not copy anything back
// (a note deleted in Postgres would otherwise reappear from MongoDB).
//
// Claims (with notes), the audit log and the email settings are copied in one
// transaction, so a failure leaves Postgres empty and the next boot retries.
// Rate-limit buckets are not copied: they expire within the hour anyway.
//
// Remove this file, the env var and the `mongodb` dependency once production
// has run on Postgres for a while (docs/deployment.md, "MongoDB to Postgres").

import type postgres from "postgres";
import { getSql } from "./db";
import { importWarrantyDocuments } from "./warranty-store";

export async function copyFromMongo(uri: string): Promise<void> {
  const sql = getSql();
  const [{ n }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM warranty`;
  if (n > 0) {
    console.log(
      `[mongo-copy] skipped: Postgres already holds ${n} claims. Remove MIGRATE_FROM_MONGODB_URI.`,
    );
    return;
  }

  const { MongoClient } = await import("mongodb");
  const client = await new MongoClient(uri).connect();
  try {
    const db = client.db();
    const claims = await db.collection("warranty").find().toArray();
    const audit = await db.collection("warranty_audit").find().toArray();
    const settings = await db
      .collection<{ _id: string }>("warranty_settings")
      .findOne({ _id: "default" });

    await sql.begin(async (tx) => {
      await importWarrantyDocuments(claims as unknown as Record<string, unknown>[], tx);

      for (const a of audit) {
        const created = a.createdAt instanceof Date ? a.createdAt : new Date(String(a.createdAt));
        await tx`
          INSERT INTO warranty_audit
            (id, entity_type, entity_id, actor_id, actor_name, actor_email, message, changes,
             created_at)
          VALUES (${String(a._id)}, ${String(a.entityType)}, ${String(a.entityId)},
            ${String(a.actorId ?? "")}, ${String(a.actorName ?? "")},
            ${String(a.actorEmail ?? "")}, ${String(a.message ?? "")},
            ${tx.json((Array.isArray(a.changes) ? a.changes : []) as postgres.JSONValue)},
            ${created})
          ON CONFLICT (id) DO NOTHING`;
      }

      if (settings) {
        const { _id, ...data } = settings;
        await tx`
          INSERT INTO warranty_settings (id, data)
          VALUES (${_id}, ${tx.json(data as postgres.JSONValue)})
          ON CONFLICT (id) DO NOTHING`;
      }
    });

    const mongoNotes = claims.reduce(
      (sum, c) => sum + (Array.isArray(c.notes) ? c.notes.length : 0),
      0,
    );
    const [pg] = await sql<{ claims: number; notes: number; audit: number; settings: number }[]>`
      SELECT (SELECT count(*)::int FROM warranty) AS claims,
             (SELECT count(*)::int FROM warranty_note) AS notes,
             (SELECT count(*)::int FROM warranty_audit) AS audit,
             (SELECT count(*)::int FROM warranty_settings) AS settings`;
    console.log(
      `[mongo-copy] mongo: claims=${claims.length} notes=${mongoNotes} audit=${audit.length} ` +
        `settings=${settings ? 1 : 0} | postgres: claims=${pg.claims} notes=${pg.notes} ` +
        `audit=${pg.audit} settings=${pg.settings}`,
    );
  } finally {
    await client.close();
  }
}
