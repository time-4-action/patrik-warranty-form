# Patrik Warranty Form

Next.js 16 warranty registration form for Patrik windsurfing products.

## Getting Started

Copy env vars and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000/warranty](http://localhost:3000/warranty).

## File Uploads (Hetzner S3)

Files are uploaded directly from the browser to Hetzner Object Storage using **presigned PUT URLs** — credentials never leave the server.

### Flow

1. On form submit, a `submissionId` (UUID) is generated in the browser
2. For each file, the browser calls `POST /api/upload-url` with `{ submissionId, slot, filename, contentType }`
3. The API route generates a presigned PUT URL (valid 5 min) and returns it alongside the permanent public URL
4. The browser PUTs the file directly to Hetzner
5. All public URLs are collected and sent with the rest of the form data to the backend

### Storage structure

```
uploads/warranty/<submissionId>/invoice.<ext>
uploads/warranty/<submissionId>/serial.<ext>
uploads/warranty/<submissionId>/full.<ext>
uploads/warranty/<submissionId>/closeup.<ext>
```

All files for one claim share the same `submissionId` folder, making it easy to locate them in Google Drive or any file browser.

### Environment variables

| Variable | Description |
|---|---|
| `S3_ENDPOINT` | `https://fsn1.your-objectstorage.com` |
| `S3_REGION` | `fsn1` |
| `S3_BUCKET` | `patrik-assets` |
| `S3_PUBLIC_BASE` | `https://patrik-assets.fsn1.your-objectstorage.com` |
| `S3_ACCESS_KEY_ID` | Hetzner access key |
| `S3_SECRET_ACCESS_KEY` | Hetzner secret key |

### Migrating to AWS S3

1. Remove `S3_ENDPOINT` from env
2. Remove `forcePathStyle: true` and `requestChecksumCalculation`/`responseChecksumValidation` from `src/lib/s3.ts`
3. Set `S3_REGION` to e.g. `eu-central-1`

### CORS

The Hetzner bucket needs a CORS rule allowing `PUT` from your domain. Apply with:

```bash
aws s3api put-bucket-cors --bucket patrik-assets --cors-configuration file://cors.json --endpoint-url https://fsn1.your-objectstorage.com
```

`cors.json` is committed to the repo root.

## Abuse protection (rate limiting)

`/api/warranty` and `/api/upload-url` are IP-rate-limited via a Mongo-backed sliding window. The caller's IP is resolved from `cf-connecting-ip` → `x-real-ip` → `x-forwarded-for`, and each endpoint has its own bucket:

- **Warranty submissions** — `SUBMISSION_LIMIT` (default 5) per rolling hour.
- **Presigned upload URLs** — `SUBMISSION_LIMIT × 4 × 2` (default 40) per rolling hour, so 4 slots per submission fit with retry headroom.

When the limit is hit the endpoint returns `429 { error: "rate-limited", limit, retryAfterSeconds }` plus a `Retry-After` header. The frontend catches 429 from either endpoint and surfaces `RateLimitModal`, which live-counts the remaining time. A TTL index on the `rate_limits` collection auto-prunes idle IPs.

To tune the limits, edit `SUBMISSION_LIMIT` / `UPLOAD_LIMIT` / `WINDOW_MS` in `src/lib/rate-limit.ts`.

## Email notifications

On successful submission the server sends two transactional emails via SMTP (nodemailer):

- **Customer confirmation** to the email from the form — thank-you, claim number, link to the receipt page.
- **Admin notification** to everyone listed in `config/notifications.json → adminRecipients`, delivered via BCC so admins never see each other's addresses. `Reply-To` is the customer, so hitting reply goes back to them.

Failures are logged + captured in Sentry but **do not fail the submission** (data is already persisted in Mongo + Sheets). The SMTP transport is verified by `GET /api/health` on every poll.

To change admin recipients, edit `config/notifications.json` and redeploy.

### Environment variables

| Variable | Description |
|---|---|
| `SMTP_HOST` | SMTP server hostname (e.g. `smtp.your-host.com`) |
| `SMTP_PORT` | `465` for SSL (implicit TLS) or `587` for STARTTLS — `secure` is derived automatically |
| `SMTP_USER` | SMTP username (usually the mailbox address) |
| `SMTP_PASSWORD` | SMTP password / app password |
| `SMTP_FROM` | Sender, e.g. `"Patrik Warranty <noreply@patrik-windsurf.com>"` |
