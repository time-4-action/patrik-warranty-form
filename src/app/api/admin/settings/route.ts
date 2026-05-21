import { checkInternalAdmin } from "@/lib/admin-auth";
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

  let body: Partial<WarrantySettings> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    const saved = await saveWarrantySettings(body as WarrantySettings);
    return Response.json(saved);
  } catch (err) {
    console.error("admin settings save failed", err);
    return Response.json({ error: "save failed" }, { status: 500 });
  }
}
