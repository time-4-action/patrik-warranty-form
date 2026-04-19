import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  consumeSubmissionAttempt,
  getClientIp,
  UPLOAD_LIMIT,
  WINDOW_MS,
} from "@/lib/rate-limit";
import { s3, S3_BUCKET, S3_PUBLIC_BASE } from "@/lib/s3";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { submissionId, slot, filename, contentType } = await request.json();

  if (!submissionId || !slot || !filename || !contentType) {
    return Response.json(
      { error: "submissionId, slot, filename and contentType required" },
      { status: 400 },
    );
  }

  const ip = getClientIp(request.headers);
  const rl = await consumeSubmissionAttempt(`upload:${ip}`, UPLOAD_LIMIT, WINDOW_MS);
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

  const ext = filename.split(".").pop() ?? "";
  const key = `uploads/warranty/${submissionId}/${slot}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const publicUrl = `${S3_PUBLIC_BASE}/${key}`;

  return Response.json({ presignedUrl, publicUrl });
}
