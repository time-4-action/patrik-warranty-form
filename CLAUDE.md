@AGENTS.md

## Project overview

Warranty registration form for Patrik windsurfing products. Built with Next.js 16 App Router + Tailwind CSS v4.

## Key files

- `src/app/warranty/_components/WarrantyForm.tsx` — the main form (client component). Handles all state, validation, file upload orchestration, and submit logic.
- `src/app/warranty/_components/UploadCard.tsx` — drag-and-drop file picker card used for the 4 upload slots.
- `src/app/api/upload-url/route.ts` — POST endpoint that generates presigned S3 PUT URLs. Called once per file on submit.
- `src/lib/s3.ts` — AWS SDK v3 S3 client configured for Hetzner Object Storage.

## File upload architecture

Uses **presigned PUT URLs** — the browser uploads directly to Hetzner S3, the Next.js server only signs the URL and never proxies file bytes.

On submit:
1. `crypto.randomUUID()` generates a `submissionId`
2. Each file slot calls `POST /api/upload-url` → gets `{ presignedUrl, publicUrl }`
3. Browser PUTs file to presigned URL
4. Public URLs collected as `uploads/warranty/<submissionId>/<slot>.<ext>`

The `submissionId` groups all 4 files for one warranty claim under the same path — easy to look up later.

## S3 config notes

- `forcePathStyle: true` — required for Hetzner, remove for AWS S3
- `requestChecksumCalculation: "when_required"` — disables CRC32 checksums that Hetzner doesn't support
- CORS rule in `cors.json` must be applied to the bucket (see README)

## TODO

- Wire form submit to a backend (email / database) — currently just `console.log`s the data and URLs
