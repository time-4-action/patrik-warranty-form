// ============================================================================
// Audit diffing & value formatting
// ============================================================================
//
// The warranty service is the source of truth for what actually persisted, so
// it computes the field-level diff itself (warranty_implementation.md §6). The
// human-readable labels reuse the existing catalogues in warranty-settings.ts
// so the admin's staged preview and the recorded diff stay in agreement.

import {
  ADMIN_FIELD_LABELS,
  CUSTOMER_FIELD_LABELS,
  CUSTOMER_STATUS_LABELS,
  FACTORY_STATUS_LABELS,
  WARRANTY_STATUS_LABELS,
  WARRANTY_SUGGESTION_LABELS,
  WARRANTY_TYPE_LABELS,
  type WarrantySettings,
  type WorkflowFields,
} from "@/types/warranty-settings";
import type { AuditChange, AuditEnvelope } from "@/types/warranty-audit";
import type { WorkflowPatch } from "./warranty-mongo";

// ----------------------------------------------------------------------------
// Envelope extraction
// ----------------------------------------------------------------------------

/**
 * Pulls the optional `_audit` envelope out of a write-request body and deletes
 * it in place, so it is never persisted onto the claim / settings document.
 * Returns `null` when absent (backward-compatible: callers then skip auditing).
 */
export function extractAuditEnvelope(
  body: Record<string, unknown>,
): AuditEnvelope | null {
  const raw = body._audit;
  delete body._audit;
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  return {
    actorId: typeof a.actorId === "string" ? a.actorId : "",
    actorName: typeof a.actorName === "string" ? a.actorName : "",
    actorEmail: typeof a.actorEmail === "string" ? a.actorEmail : "",
    message: typeof a.message === "string" ? a.message : "",
  };
}

// ----------------------------------------------------------------------------
// Formatting helpers
// ----------------------------------------------------------------------------

function collapse(value: unknown): string {
  return (typeof value === "string" ? value : "").replace(/\s+/g, " ").trim();
}

// Collapse runs of whitespace, trim, and cap at 80 chars with an ellipsis.
function truncate80(value: unknown): string {
  const c = collapse(value);
  return c.length > 80 ? `${c.slice(0, 80)}…` : c;
}

function labelOrDash(
  labels: Record<string, string>,
  value: unknown,
): string {
  if (value === null || value === undefined || value === "") return "—";
  return labels[value as string] ?? "—";
}

// Normalises null / undefined / "" to "" so they all compare as "empty".
function normEmpty(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

// ----------------------------------------------------------------------------
// Claim diff (§6.1)
// ----------------------------------------------------------------------------

type ClaimFieldKey = keyof WorkflowPatch;

const CLAIM_FIELD_DEFS: Record<
  ClaimFieldKey,
  { label: string; format: (v: unknown) => string }
> = {
  status: {
    label: "Status",
    format: (v) => labelOrDash(WARRANTY_STATUS_LABELS, v),
  },
  warrantyType: {
    label: "Warranty type",
    format: (v) => labelOrDash(WARRANTY_TYPE_LABELS, v),
  },
  assignee: {
    label: "Assigned to",
    format: (v) =>
      typeof v === "string" && v.trim() ? v.trim() : "Unassigned",
  },
  suggestion: {
    label: "Suggestion",
    format: (v) => labelOrDash(WARRANTY_SUGGESTION_LABELS, v),
  },
  factoryStatus: {
    label: "Factory",
    format: (v) => labelOrDash(FACTORY_STATUS_LABELS, v),
  },
  customerStatus: {
    label: "Customer",
    format: (v) => labelOrDash(CUSTOMER_STATUS_LABELS, v),
  },
};

/**
 * Diffs the tracked claim fields between the loaded claim and the applied
 * patch. Only fields present in the patch are considered, so untouched fields
 * never surface as changes.
 */
export function diffClaimFields(
  before: WorkflowFields,
  patch: WorkflowPatch,
): AuditChange[] {
  const changes: AuditChange[] = [];
  for (const key of Object.keys(patch) as ClaimFieldKey[]) {
    const def = CLAIM_FIELD_DEFS[key];
    if (!def) continue;
    const fromRaw = (before as Record<string, unknown>)[key];
    const toRaw = patch[key];
    if (normEmpty(fromRaw) === normEmpty(toRaw)) continue;
    changes.push({
      field: key,
      label: def.label,
      from: def.format(fromRaw),
      to: def.format(toRaw),
    });
  }
  return changes;
}

// ----------------------------------------------------------------------------
// Settings diff (§6.2)
// ----------------------------------------------------------------------------

// Each definition produces a comparison `key` (detects change) and a `display`
// string (shown in the timeline). They differ for truncated text: comparison
// uses the full collapsed value, display the 80-char cap.
type SettingsValue = { key: string; display: string };

function textValue(raw: unknown): SettingsValue {
  return { key: collapse(raw), display: truncate80(raw) };
}

function listValue(items: string[]): SettingsValue {
  const joined = items.join(", ");
  return { key: joined, display: items.length ? joined : "none" };
}

function fieldKeysValue(
  keys: string[],
  labels: Record<string, string>,
): SettingsValue {
  return listValue(keys.map((k) => labels[k] ?? k));
}

const SETTINGS_FIELD_DEFS: {
  field: string;
  label: string;
  value: (s: WarrantySettings) => SettingsValue;
}[] = [
  {
    field: "adminRecipients",
    label: "Admin recipients",
    value: (s) => listValue(s.adminRecipients ?? []),
  },
  {
    field: "customer.subject",
    label: "Customer · subject",
    value: (s) => textValue(s.customer?.subject),
  },
  {
    field: "customer.intro",
    label: "Customer · intro",
    value: (s) => textValue(s.customer?.intro),
  },
  {
    field: "customer.outro",
    label: "Customer · outro",
    value: (s) => textValue(s.customer?.outro),
  },
  {
    field: "customer.fields",
    label: "Customer · rows",
    value: (s) => fieldKeysValue(s.customer?.fields ?? [], CUSTOMER_FIELD_LABELS),
  },
  {
    field: "admin.subject",
    label: "Admin · subject",
    value: (s) => textValue(s.admin?.subject),
  },
  {
    field: "admin.intro",
    label: "Admin · intro",
    value: (s) => textValue(s.admin?.intro),
  },
  {
    field: "admin.fields",
    label: "Admin · fields",
    value: (s) => fieldKeysValue(s.admin?.fields ?? [], ADMIN_FIELD_LABELS),
  },
];

/** Diffs the tracked settings fields between the current and saved settings. */
export function diffSettingsFields(
  before: WarrantySettings,
  after: WarrantySettings,
): AuditChange[] {
  const changes: AuditChange[] = [];
  for (const def of SETTINGS_FIELD_DEFS) {
    const from = def.value(before);
    const to = def.value(after);
    if (from.key === to.key) continue;
    changes.push({
      field: def.field,
      label: def.label,
      from: from.display,
      to: to.display,
    });
  }
  return changes;
}
