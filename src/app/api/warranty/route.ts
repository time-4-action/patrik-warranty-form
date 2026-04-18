import { appendWarrantyRow } from "@/lib/google-sheets";
import type { WarrantyPayload } from "@/types/warranty";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: WarrantyPayload | undefined;
  try {
    payload = (await request.json()) as WarrantyPayload;

    if (
      !payload?.submissionId ||
      !payload?.email ||
      !payload?.fileUrls?.invoice ||
      !payload?.fileUrls?.serial ||
      !payload?.fileUrls?.full ||
      !payload?.fileUrls?.closeup
    ) {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }

    const submittedAt = new Date().toISOString();
    await appendWarrantyRow(payload, submittedAt);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("warranty sheet append failed", {
      submissionId: payload?.submissionId,
      fileUrls: payload?.fileUrls,
      err,
    });
    return Response.json({ error: "Sheet write failed" }, { status: 500 });
  }
}
