import postgres from "postgres";

// One pool per process, cached on globalThis so dev HMR reuses it. The t4a role
// allows 30 connections; 5 is plenty for this app.
const globalForDb = globalThis as unknown as { _sql?: postgres.Sql };

export function getSql(): postgres.Sql {
  if (globalForDb._sql) return globalForDb._sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  globalForDb._sql = postgres(url, {
    max: 5,
    idle_timeout: 60,
    connection: { TimeZone: "UTC" },
    onnotice: () => {},
  });
  return globalForDb._sql;
}

// Schema migrations, applied in order at boot (instrumentation.ts). Append new
// ones; never edit one that has shipped.
//
// Timestamps the API returns (submittedAt, statusUpdatedAt, workflowUpdatedAt,
// note createdAt) stay `text` in the exact format the app has always written,
// so the JSON t4a-admin reads is unchanged.
const MIGRATIONS: string[] = [
  /* 1: initial schema, moved from MongoDB */ `
  CREATE TABLE warranty (
    submission_id       text PRIMARY KEY,
    submitted_at        text NOT NULL,
    status              text NOT NULL DEFAULT 'open',
    status_updated_at   text,
    assignee            text,
    warranty_type       text,
    suggestion          text,
    factory_status      text,
    customer_status     text,
    workflow_updated_at text,
    -- The rest of WarrantyPayload (name, email, product, fileUrls, ...).
    data                jsonb NOT NULL
  );
  CREATE INDEX warranty_submitted_at_idx ON warranty (submitted_at DESC);
  CREATE INDEX warranty_status_idx ON warranty (status);

  CREATE TABLE warranty_note (
    id            text PRIMARY KEY,
    submission_id text NOT NULL REFERENCES warranty ON DELETE CASCADE,
    author_name   text NOT NULL DEFAULT '',
    author_email  text NOT NULL DEFAULT '',
    text          text NOT NULL,
    created_at    text NOT NULL
  );
  CREATE INDEX warranty_note_submission_idx ON warranty_note (submission_id);

  CREATE TABLE warranty_audit (
    id          text PRIMARY KEY,
    entity_type text NOT NULL,
    entity_id   text NOT NULL,
    actor_id    text NOT NULL DEFAULT '',
    actor_name  text NOT NULL DEFAULT '',
    actor_email text NOT NULL DEFAULT '',
    message     text NOT NULL DEFAULT '',
    changes     jsonb NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX warranty_audit_entity_idx ON warranty_audit (entity_type, entity_id, created_at DESC);

  CREATE TABLE warranty_settings (
    id   text PRIMARY KEY,
    data jsonb NOT NULL
  );

  CREATE TABLE rate_limit_attempt (
    key text NOT NULL,
    at  timestamptz NOT NULL
  );
  CREATE INDEX rate_limit_attempt_key_at_idx ON rate_limit_attempt (key, at);
  `,
];

/** Applies pending migrations. Safe with several processes: an advisory lock serialises them. */
export async function migrate(): Promise<void> {
  const sql = getSql();
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('patrik-warranty-migrate'))`;
    await tx`CREATE TABLE IF NOT EXISTS schema_migrations (
      version int PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    const [{ v }] = await tx<{ v: number }[]>`
      SELECT coalesce(max(version), 0)::int AS v FROM schema_migrations`;
    for (let i = v; i < MIGRATIONS.length; i++) {
      await tx.unsafe(MIGRATIONS[i]);
      await tx`INSERT INTO schema_migrations (version) VALUES (${i + 1})`;
      console.log(`[db] applied migration ${i + 1}`);
    }
  });
}
