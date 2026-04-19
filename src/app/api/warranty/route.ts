import * as Sentry from "@sentry/nextjs";
import { buildAdminNotification } from "@/lib/emails/admin-notification";
import { buildUserConfirmation } from "@/lib/emails/user-confirmation";
import { appendWarrantyRow } from "@/lib/google-sheets";
import { sendMail } from "@/lib/mail";
import { getNotificationsConfig } from "@/lib/notifications-config";
import { consumeSubmissionAttempt, getClientIp } from "@/lib/rate-limit";
import { insertWarrantyDoc } from "@/lib/warranty-mongo";
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

    const ip = getClientIp(request.headers);
    const rl = await consumeSubmissionAttempt(`warranty:${ip}`);
    if (!rl.allowed) {
      return Response.json(
        {
          error: "rate-limited",
          limit: rl.limit,
          retryAfterSeconds: rl.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSeconds) },
        },
      );
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

    await sendNotificationEmails(payload, submittedAt);

    return Response.json({ ok: true, submissionId: payload.submissionId });
  } catch (err) {
    console.error("warranty submission failed", {
      submissionId: payload?.submissionId,
      fileUrls: payload?.fileUrls,
      err,
    });
    return Response.json({ error: "Submission failed" }, { status: 500 });
  }
}

async function sendNotificationEmails(
  payload: WarrantyPayload,
  submittedAt: string,
): Promise<void> {
  const userEmail = buildUserConfirmation(payload, submittedAt);
  const adminEmail = buildAdminNotification(payload, submittedAt);
  const { adminRecipients } = getNotificationsConfig();

  const [userResult, adminResult] = await Promise.allSettled([
    sendMail({
      to: payload.email,
      subject: userEmail.subject,
      html: userEmail.html,
      text: userEmail.text,
    }),
    sendMail({
      to: process.env.SMTP_FROM!,
      bcc: adminRecipients,
      subject: adminEmail.subject,
      html: adminEmail.html,
      text: adminEmail.text,
      replyTo: payload.email,
    }),
  ]);

  if (userResult.status === "rejected") {
    console.error("warranty user email failed", {
      submissionId: payload.submissionId,
      err: userResult.reason,
    });
    Sentry.captureException(userResult.reason, {
      tags: { kind: "warranty-user-email" },
      extra: { submissionId: payload.submissionId },
    });
  }
  if (adminResult.status === "rejected") {
    console.error("warranty admin email failed", {
      submissionId: payload.submissionId,
      err: adminResult.reason,
    });
    Sentry.captureException(adminResult.reason, {
      tags: { kind: "warranty-admin-email" },
      extra: { submissionId: payload.submissionId },
    });
  }
}
