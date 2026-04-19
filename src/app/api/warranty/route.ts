import { appendWarrantyRow } from "@/lib/google-sheets";
import { verifySessionToken } from "@/lib/turnstile";
import { insertWarrantyDoc } from "@/lib/warranty-mongo";
import type { WarrantyPayload } from "@/types/warranty";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: WarrantyPayload | undefined;
  try {
    const session = verifySessionToken(request.headers.get("x-session-token"));
    if (!session.ok) {
      return Response.json({ error: "Bot check required" }, { status: 401 });
    }

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

    const [sheetResult, mongoResult] = await Promise.allSettled([
      appendWarrantyRow(payload, submittedAt),
      insertWarrantyDoc(payload, submittedAt),
    ]);

    if (sheetResult.status === "rejected") {
      console.error("warranty sheet append failed", {
        submissionId: payload.submissionId,
        fileUrls: payload.fileUrls,
        err: sheetResult.reason,
      });
    }
    if (mongoResult.status === "rejected") {
      console.error("warranty mongo insert failed", {
        submissionId: payload.submissionId,
        fileUrls: payload.fileUrls,
        err: mongoResult.reason,
      });
    }

    if (
      sheetResult.status === "rejected" ||
      mongoResult.status === "rejected"
    ) {
      return Response.json({ error: "Persistence failed" }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("warranty submission failed", {
      submissionId: payload?.submissionId,
      fileUrls: payload?.fileUrls,
      err,
    });
    return Response.json({ error: "Submission failed" }, { status: 500 });
  }
}
