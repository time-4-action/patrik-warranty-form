import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, S3_BUCKET, S3_PUBLIC_BASE } from "@/lib/s3";
import { verifySessionToken } from "@/lib/turnstile";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = verifySessionToken(request.headers.get("x-session-token"));
  if (!session.ok) {
    return Response.json({ error: "Bot check required" }, { status: 401 });
  }

  const { submissionId, slot, filename, contentType } = await request.json();

  if (!submissionId || !slot || !filename || !contentType) {
    return Response.json({ error: "submissionId, slot, filename and contentType required" }, { status: 400 });
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
