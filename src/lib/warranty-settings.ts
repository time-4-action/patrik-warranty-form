import { getMongoDb } from "./mongo";
import { getNotificationsConfig } from "./notifications-config";
import {
  ADMIN_FIELD_KEYS,
  CUSTOMER_FIELD_KEYS,
  DEFAULT_SETTINGS,
  type AdminFieldKey,
  type CustomerFieldKey,
  type WarrantySettings,
} from "@/types/warranty-settings";

export const SETTINGS_COLLECTION = "warranty_settings";
const SETTINGS_DOC_ID = "default";

type StoredSettings = Partial<WarrantySettings> & { _id?: string };

function normaliseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  // Permissive: just check for an @ — server already trusts the admin caller.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
  return v;
}

function normaliseRecipients(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const e = normaliseEmail(item);
    if (e && !out.includes(e)) out.push(e);
  }
  return out;
}

function normaliseCustomerFields(value: unknown): CustomerFieldKey[] {
  if (!Array.isArray(value)) return [...DEFAULT_SETTINGS.customer.fields];
  const allowed = new Set<string>(CUSTOMER_FIELD_KEYS);
  const out: CustomerFieldKey[] = [];
  for (const item of value) {
    if (typeof item === "string" && allowed.has(item) && !out.includes(item as CustomerFieldKey)) {
      out.push(item as CustomerFieldKey);
    }
  }
  return out;
}

function normaliseAdminFields(value: unknown): AdminFieldKey[] {
  if (!Array.isArray(value)) return [...DEFAULT_SETTINGS.admin.fields];
  const allowed = new Set<string>(ADMIN_FIELD_KEYS);
  const out: AdminFieldKey[] = [];
  for (const item of value) {
    if (typeof item === "string" && allowed.has(item) && !out.includes(item as AdminFieldKey)) {
      out.push(item as AdminFieldKey);
    }
  }
  return out;
}

function mergeWithDefaults(stored: StoredSettings | null): WarrantySettings {
  const fileRecipients = getNotificationsConfig().adminRecipients ?? [];
  const recipients = normaliseRecipients(stored?.adminRecipients);
  return {
    adminRecipients: recipients.length > 0 ? recipients : fileRecipients,
    customer: {
      subject:
        typeof stored?.customer?.subject === "string" && stored.customer.subject.trim()
          ? stored.customer.subject
          : DEFAULT_SETTINGS.customer.subject,
      intro:
        typeof stored?.customer?.intro === "string"
          ? stored.customer.intro
          : DEFAULT_SETTINGS.customer.intro,
      outro:
        typeof stored?.customer?.outro === "string"
          ? stored.customer.outro
          : DEFAULT_SETTINGS.customer.outro,
      fields: normaliseCustomerFields(stored?.customer?.fields),
    },
    admin: {
      subject:
        typeof stored?.admin?.subject === "string" && stored.admin.subject.trim()
          ? stored.admin.subject
          : DEFAULT_SETTINGS.admin.subject,
      intro:
        typeof stored?.admin?.intro === "string"
          ? stored.admin.intro
          : DEFAULT_SETTINGS.admin.intro,
      fields: normaliseAdminFields(stored?.admin?.fields),
    },
  };
}

export async function getWarrantySettings(): Promise<WarrantySettings> {
  const db = await getMongoDb();
  const doc = await db
    .collection<StoredSettings>(SETTINGS_COLLECTION)
    .findOne({ _id: SETTINGS_DOC_ID });
  return mergeWithDefaults(doc ?? null);
}

export async function saveWarrantySettings(
  input: WarrantySettings,
): Promise<WarrantySettings> {
  const next = mergeWithDefaults(input);
  const db = await getMongoDb();
  await db.collection<StoredSettings>(SETTINGS_COLLECTION).updateOne(
    { _id: SETTINGS_DOC_ID },
    { $set: next },
    { upsert: true },
  );
  return next;
}
