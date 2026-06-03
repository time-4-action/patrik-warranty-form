// ============================================================================
// Change history (audit log) — contract types
// ============================================================================
//
// These shapes are the binding contract with the t4a-admin dashboard, which
// renders the audit timeline. The admin keeps a mirror of these types by hand
// (it imports nothing from this repo at runtime), so keep them in sync when
// either side changes — see warranty_implementation.md §3 / §7.

export type AuditEntityType = "claim" | "settings";

// One field-level diff inside an audit entry.
export type AuditChange = {
  field: string; // machine key, e.g. "status", "customer.subject"
  label: string; // human label, e.g. "Status", "Customer · subject"
  from: string; // human-readable previous value ("—" / "Unassigned" / "none" for empty)
  to: string; // human-readable new value
};

// The actor envelope supplied by t4a-admin inside the write-request body. The
// warranty service does not know the Auth0 user, so identity travels in-band.
export type AuditActor = {
  actorId: string; // Auth0 `sub`, may be ""
  actorName: string; // display name; falls back to email, then "Admin"
  actorEmail: string; // may be ""
};

export type AuditEnvelope = AuditActor & {
  message: string; // optional free-text note, may be ""
};

// One stored history entry, as returned by the read endpoints.
export type AuditEntry = {
  id: string; // stringified ObjectId
  entityType: AuditEntityType;
  entityId: string; // submissionId for claims; "settings" for the singleton
  actorId: string;
  actorName: string;
  actorEmail: string;
  message: string;
  changes: AuditChange[];
  createdAt: string; // ISO-8601
};
