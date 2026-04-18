import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "fsn1",
  forcePathStyle: true, // required for Hetzner; remove when switching to AWS
  requestChecksumCalculation: "WHEN_REQUIRED", // Hetzner doesn't support CRC32 checksums
  responseChecksumValidation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

export const S3_BUCKET = process.env.S3_BUCKET!;
export const S3_PUBLIC_BASE = process.env.S3_PUBLIC_BASE!;
