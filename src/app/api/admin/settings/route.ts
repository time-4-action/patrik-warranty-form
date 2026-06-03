import { checkInternalAdmin } from "@/lib/admin-auth";
import { diffSettingsFields, extractAuditEnvelope } from "@/lib/audit-diff";
import { recordAuditEntry } from "@/lib/warranty-audit";
import {
  getWarrantySettings,
  saveWarrantySettings,
} from "@/lib/warranty-settings";
import type { WarrantySettings } from "@/types/warranty-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = checkInternalAdmin(request);
  if (denied) return denied;
  try {
    const settings = await getWarrantySettings();
    return Response.json(settings);
  } catch (err) {
    console.error("admin settings get failed", err);
    return Response.json({ error: "fetch failed" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const denied = checkInternalAdmin(request);
  if (denied) return denied;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  // Strip the audit envelope before persisting — it must never land in the
  // settings document. Absent → behave exactly as before (no auditing).
  const audit = extractAuditEnvelope(body);

  try {
    // Load the before-state for the diff only when auditing is requested.
    const before = audit ? await getWarrantySettings() : null;
    const saved = await saveWarrantySettings(body as WarrantySettings);
    // Record after the save lands; best-effort, never fails the request.
    if (audit) {
      const changes = before ? diffSettingsFields(before, saved) : [];
      await recordAuditEntry("settings", "settings", audit, changes);
    }
    return Response.json(saved);
  } catch (err) {
    console.error("admin settings save failed", err);
    return Response.json({ error: "save failed" }, { status: 500 });
  }
}
