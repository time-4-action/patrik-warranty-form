import { randomUUID } from "crypto";
import type postgres from "postgres";
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
import { getSql } from "./db";

export type WarrantyDocument = WarrantyPayload &
  WorkflowFields & {
    submittedAt: string;
    statusUpdatedAt?: string;
    workflowUpdatedAt?: string;
    notes: ClaimNote[];
  };

type WarrantyRow = {
  submission_id: string;
  submitted_at: string;
  status: string;
  status_updated_at: string | null;
  assignee: string | null;
  warranty_type: string | null;
  suggestion: string | null;
  factory_status: string | null;
  customer_status: string | null;
  workflow_updated_at: string | null;
  data: Record<string, unknown>;
  notes: ClaimNote[];
};

// Every claim read goes through this, so notes always come back newest first.
function selectClaims(sql: postgres.Sql, where: postgres.PendingQuery<postgres.Row[]>) {
  return sql<WarrantyRow[]>`
    SELECT w.*,
      coalesce((
        SELECT json_agg(json_build_object(
          'id', n.id, 'authorName', n.author_name, 'authorEmail', n.author_email,
          'text', n.text, 'createdAt', n.created_at) ORDER BY n.created_at DESC)
        FROM warranty_note n WHERE n.submission_id = w.submission_id
      ), '[]'::json) AS notes
    FROM warranty w
    WHERE ${where}`;
}

function toDocument(row: WarrantyRow): WarrantyDocument {
  const raw = {
    status: row.status,
    assignee: row.assignee,
    warrantyType: row.warranty_type,
    suggestion: row.suggestion,
    factoryStatus: row.factory_status,
    customerStatus: row.customer_status,
  };
  return {
    ...(row.data as unknown as WarrantyPayload),
    submissionId: row.submission_id,
    submittedAt: row.submitted_at,
    ...(row.status_updated_at ? { statusUpdatedAt: row.status_updated_at } : {}),
    ...(row.workflow_updated_at ? { workflowUpdatedAt: row.workflow_updated_at } : {}),
    ...normaliseWorkflow(raw),
    notes: row.notes,
  };
}

export async function insertWarrantyDoc(
  p: WarrantyPayload,
  submittedAt: string,
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO warranty (submission_id, submitted_at, status, status_updated_at,
                          workflow_updated_at, data)
    VALUES (${p.submissionId}, ${submittedAt}, ${"open" satisfies WarrantyStatus},
            ${submittedAt}, ${submittedAt}, ${sql.json(p as unknown as postgres.JSONValue)})`;
}

export async function findWarrantyBySubmissionId(
  submissionId: string,
): Promise<WarrantyDocument | null> {
  const sql = getSql();
  const [row] = await selectClaims(sql, sql`w.submission_id = ${submissionId}`);
  return row ? toDocument(row) : null;
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

const SEARCH_FIELDS = [
  "name",
  "surname",
  "email",
  "company",
  "productName",
  "serialNumber",
  "invoiceNumber",
] as const;

export async function listWarrantySubmissions(
  filter: ListWarrantyFilter = {},
): Promise<ListWarrantyResult> {
  const sql = getSql();
  const conds: postgres.PendingQuery<postgres.Row[]>[] = [];

  if (filter.status && filter.status !== "all") {
    conds.push(sql`w.status = ${filter.status}`);
  }
  if (filter.assignee && filter.assignee !== "all") {
    conds.push(
      filter.assignee === "unassigned"
        ? sql`coalesce(w.assignee, '') = ''`
        : sql`w.assignee = ${filter.assignee}`,
    );
  }
  const search = filter.search?.trim();
  if (search) {
    const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    const fieldConds = SEARCH_FIELDS.map((f) => sql`w.data->>${f} ILIKE ${pattern}`);
    conds.push(
      fieldConds.reduce((acc, c) => sql`${acc} OR ${c}`, sql`w.submission_id ILIKE ${pattern}`),
    );
  }
  // Same string comparison as before: submittedAt is "YYYY-MM-DD HH:MM:SS" (UTC).
  if (filter.from) conds.push(sql`w.submitted_at >= ${filter.from}`);
  if (filter.to) conds.push(sql`w.submitted_at <= ${filter.to}`);

  const where = conds.reduce((acc, c) => sql`${acc} AND (${c})`, sql`TRUE`);
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 500);
  const skip = Math.max(filter.skip ?? 0, 0);

  const [[{ total }], rows] = await Promise.all([
    sql<{ total: number }[]>`SELECT count(*)::int AS total FROM warranty w WHERE ${where}`,
    sql<WarrantyRow[]>`
      ${selectClaims(sql, where)}
      ORDER BY w.submitted_at DESC
      LIMIT ${limit} OFFSET ${skip}`,
  ]);

  return { total, items: rows.map(toDocument) };
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

const WORKFLOW_COLUMNS = {
  assignee: "assignee",
  warrantyType: "warranty_type",
  suggestion: "suggestion",
  factoryStatus: "factory_status",
  customerStatus: "customer_status",
} as const;

export async function updateWarrantyWorkflow(
  submissionId: string,
  patch: WorkflowPatch,
): Promise<WarrantyDocument | null> {
  const sql = getSql();
  const now = new Date().toISOString();

  const set: Record<string, string | null> = { workflow_updated_at: now };
  if ("status" in patch) {
    const status = patch.status;
    if (status && !WARRANTY_STATUSES.includes(status)) return null;
    set.status = status ?? "open";
    set.status_updated_at = now;
  }
  for (const k of Object.keys(WORKFLOW_COLUMNS) as (keyof typeof WORKFLOW_COLUMNS)[]) {
    if (k in patch) set[WORKFLOW_COLUMNS[k]] = patch[k] ?? null;
  }

  const updated = await sql`
    UPDATE warranty SET ${sql(set)} WHERE submission_id = ${submissionId}
    RETURNING submission_id`;
  if (updated.length === 0) return null;
  return findWarrantyBySubmissionId(submissionId);
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
  const sql = getSql();
  // INSERT ... SELECT so a missing claim inserts nothing (instead of an FK error).
  const res = await sql`
    INSERT INTO warranty_note (id, submission_id, author_name, author_email, text, created_at)
    SELECT ${note.id}, submission_id, ${note.authorName}, ${note.authorEmail}, ${note.text},
           ${note.createdAt}
    FROM warranty WHERE submission_id = ${submissionId}`;
  if (res.count === 0) return null;
  return note;
}

export async function removeClaimNote(
  submissionId: string,
  noteId: string,
): Promise<boolean> {
  const sql = getSql();
  const res = await sql`
    DELETE FROM warranty_note WHERE submission_id = ${submissionId} AND id = ${noteId}`;
  return res.count > 0;
}

// Re-export for callers that used to import normaliseStatus from this file.
export { normaliseStatus };

// ----------------------------------------------------------------------------
// Bulk import (the dev seed)
// ----------------------------------------------------------------------------

// Stored in their own columns (or table), not in `data`.
const NON_PAYLOAD_KEYS = [
  "_id", "submittedAt", "status", "statusUpdatedAt", "assignee", "warrantyType",
  "suggestion", "factoryStatus", "customerStatus", "workflowUpdatedAt", "notes",
];

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

/**
 * Inserts whole claim documents (the WarrantyDocument shape) with their notes.
 * Existing claims and notes are left alone, so it is safe to run again.
 * Returns how many claims and notes were inserted. Runs in `tx` when given,
 * otherwise in its own transaction.
 */
export async function importWarrantyDocuments(
  docs: Record<string, unknown>[],
  tx?: postgres.TransactionSql,
): Promise<{ claims: number; notes: number }> {
  if (!tx) return getSql().begin((t) => importWarrantyDocuments(docs, t));
  let claims = 0;
  let notes = 0;
  {
    for (const doc of docs) {
      const payload: Record<string, unknown> = { ...doc };
      for (const k of NON_PAYLOAD_KEYS) delete payload[k];
      const submissionId = str(doc.submissionId);
      if (!submissionId) continue;
      const wf = normaliseWorkflow(doc);
      const res = await tx`
        INSERT INTO warranty (submission_id, submitted_at, status, status_updated_at, assignee,
          warranty_type, suggestion, factory_status, customer_status, workflow_updated_at, data)
        VALUES (${submissionId}, ${str(doc.submittedAt) ?? ""}, ${wf.status}, ${str(doc.statusUpdatedAt)},
          ${wf.assignee}, ${wf.warrantyType}, ${wf.suggestion}, ${wf.factoryStatus},
          ${wf.customerStatus}, ${str(doc.workflowUpdatedAt)},
          ${tx.json(payload as postgres.JSONValue)})
        ON CONFLICT (submission_id) DO NOTHING`;
      claims += res.count;

      for (const n of Array.isArray(doc.notes) ? (doc.notes as Record<string, unknown>[]) : []) {
        if (!n || typeof n.text !== "string") continue;
        const r = await tx`
          INSERT INTO warranty_note (id, submission_id, author_name, author_email, text, created_at)
          VALUES (${str(n.id) ?? randomUUID()}, ${submissionId}, ${String(n.authorName ?? "")},
            ${String(n.authorEmail ?? "")}, ${n.text},
            ${str(n.createdAt) ?? new Date().toISOString()})
          ON CONFLICT (id) DO NOTHING`;
        notes += r.count;
      }
    }
  }
  return { claims, notes };
}
