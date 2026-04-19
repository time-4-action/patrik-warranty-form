import { verifyTransport } from "@/lib/mail";
import { getMongoDb } from "@/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckResult = { ok: true } | { ok: false; error: string };

async function checkMongo(): Promise<CheckResult> {
  try {
    const db = await getMongoDb();
    await db.command({ ping: 1 });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function checkSheetsConfig(): CheckResult {
  const required = [
    "GOOGLE_SA_CLIENT_EMAIL",
    "GOOGLE_SA_PRIVATE_KEY",
    "GOOGLE_SHEET_ID",
    "GOOGLE_SHEET_TAB",
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    return { ok: false, error: `missing env: ${missing.join(", ")}` };
  }
  return { ok: true };
}

async function checkSmtp(): Promise<CheckResult> {
  try {
    await verifyTransport();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET() {
  const checks = {
    mongo: await checkMongo(),
    sheets: checkSheetsConfig(),
    smtp: await checkSmtp(),
  };
  const allOk = Object.values(checks).every((c) => c.ok);
  return Response.json(
    { status: allOk ? "ok" : "degraded", checks },
    { status: allOk ? 200 : 503 },
  );
}
