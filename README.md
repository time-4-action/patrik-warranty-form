# Patrik Warranty Form

Warranty registration portal for [Patrik](https://www.patrik-windsurf.com) windsurfing products — customers submit a claim, upload proof photos, and receive a confirmation email. Staff get an admin notification with full details and direct links to every uploaded file.

**Stack:** Next.js 16 · React 19 · Tailwind CSS v4 · MongoDB · Google Sheets · Hetzner Object Storage · Nodemailer · Sentry

---

## Features

- **Multi-step warranty form** with address autocomplete (Mapbox) and four photo upload slots (invoice, serial number, full product, close-up)
- **Direct-to-S3 uploads** via presigned PUT URLs — file bytes never touch the Next.js server
- **Dual persistence** — every submission is written to MongoDB and appended to a Google Sheet
- **Transactional email** — customer confirmation + BCC'd admin notification sent in parallel on submit
- **IP rate limiting** — Mongo-backed sliding window with per-endpoint buckets (`warranty:*`, `upload:*`); 429 surfaces a live-countdown modal in the UI
- **Boot-time env validation** — missing required vars crash the server at start, not on the first user request
- **Health endpoint** at `GET /api/health` — pings Mongo, verifies SMTP, asserts Sheets config; returns `200 / 503`
- **Sentry** error tracking (client + server + edge); inactive until DSN env vars are set

---

## Getting Started

### Prerequisites

- Node.js 20+
- A running MongoDB instance
- A Hetzner (or AWS S3-compatible) bucket
- A Google Cloud service account with Sheets API access
- An SMTP mailbox

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in every value (see [Environment Variables](#environment-variables) below).

### 3. Apply the S3 CORS rule

The bucket must allow `PUT` from your domain. A ready-made rule is committed at `cors.json`:

```bash
aws s3api put-bucket-cors \
  --bucket patrik-assets \
  --cors-configuration file://cors.json \
  --endpoint-url https://fsn1.your-objectstorage.com
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000/warranty](http://localhost:3000/warranty).

---

## Environment Variables

Copy `.env.local.example` to `.env.local`. All variables marked **required** must be set before the server will start.

### Mapbox

| Variable | Required | Description |
|---|:---:|---|
| `NEXT_PUBLIC_MAPBOX_API_KEY` | ✓ | Public token for address autocomplete |

### Hetzner Object Storage (S3-compatible)

| Variable | Required | Description |
|---|:---:|---|
| `S3_ENDPOINT` | ✓ | e.g. `https://fsn1.your-objectstorage.com` |
| `S3_REGION` | ✓ | e.g. `fsn1` |
| `S3_BUCKET` | ✓ | Bucket name |
| `S3_PUBLIC_BASE` | ✓ | Public base URL, e.g. `https://patrik-assets.fsn1.your-objectstorage.com` |
| `S3_ACCESS_KEY_ID` | ✓ | Hetzner access key |
| `S3_SECRET_ACCESS_KEY` | ✓ | Hetzner secret key |

> **Migrating to AWS S3?** Remove `S3_ENDPOINT`, and remove `forcePathStyle: true` and `requestChecksumCalculation`/`responseChecksumValidation` from `src/lib/s3.ts`.

### MongoDB

| Variable | Required | Description |
|---|:---:|---|
| `MONGODB_URI` | ✓ | Full connection string, e.g. `mongodb://user:pass@host:27017/patrik` |

### Google Sheets

Create a GCP service account, enable the Sheets API, share your target sheet with the service account email (Editor), and download the JSON key.

| Variable | Required | Description |
|---|:---:|---|
| `GOOGLE_SA_CLIENT_EMAIL` | ✓ | Service account email |
| `GOOGLE_SA_PRIVATE_KEY` | ✓ | Private key from the JSON key file (keep `\n` escapes) |
| `GOOGLE_SHEET_ID` | ✓ | Sheet ID from the URL |
| `GOOGLE_SHEET_TAB` | ✓ | Tab name, e.g. `Submissions` |
| `BASE_URL` | ✓ | Deployment URL — used for the receipt-page link in the sheet |

### SMTP

| Variable | Required | Description |
|---|:---:|---|
| `SMTP_HOST` | ✓ | SMTP server hostname |
| `SMTP_PORT` | ✓ | `465` (implicit TLS) or `587` (STARTTLS) — `secure` is derived automatically |
| `SMTP_USER` | ✓ | SMTP username |
| `SMTP_PASSWORD` | ✓ | SMTP password or app password |
| `SMTP_FROM` | ✓ | Sender, e.g. `"Patrik Warranty <noreply@patrik-windsurf.com>"` |

Admin recipients (staff who receive the notification email) are configured in `config/notifications.json` — not via env vars. Edit that file and redeploy to change the list.

### Sentry (optional)

Leave all Sentry vars unset to keep error tracking inactive locally.

| Variable | Description |
|---|---|
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | DSN for server-side / client-side reporting |
| `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Tag to distinguish prod from staging |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Build-time only — source map upload |

---

## Architecture

### File upload flow

Files are uploaded **directly from the browser to Hetzner Object Storage** using presigned PUT URLs. The Next.js server only signs URLs and never proxies file bytes.

```
Browser                      Next.js API              Hetzner S3
  │                              │                         │
  │── POST /api/upload-url ──▶   │                         │
  │   { submissionId, slot,      │── generatePresignedUrl ▶│
  │     filename, contentType }  │◀─ presignedUrl ─────────│
  │◀── { presignedUrl,           │                         │
  │      publicUrl } ───────────│                         │
  │                              │                         │
  │── PUT <presignedUrl> ──────────────────────────────▶  │
  │   (file bytes)               │                         │
  │◀── 200 ──────────────────────────────────────────────│
```

All files for one claim are stored under the same `submissionId` folder:

```
uploads/warranty/<submissionId>/invoice.<ext>
uploads/warranty/<submissionId>/serial.<ext>
uploads/warranty/<submissionId>/full.<ext>
uploads/warranty/<submissionId>/closeup.<ext>
```

### Rate limiting

`/api/warranty` and `/api/upload-url` are both gated by a Mongo-backed sliding-window limiter keyed on caller IP (`cf-connecting-ip` → `x-real-ip` → `x-forwarded-for`). Each endpoint has an independent bucket so upload traffic can't consume the submission budget.

| Endpoint | Default limit |
|---|---|
| `POST /api/warranty` | 5 submissions per rolling hour |
| `POST /api/upload-url` | 40 presigned URLs per rolling hour (5 × 4 slots × 2 for retry headroom) |

A 429 response includes `{ error: "rate-limited", limit, retryAfterSeconds }` plus a `Retry-After` header. The UI catches this and shows a live-countdown `RateLimitModal`. A TTL index on `rate_limits.updatedAt` auto-prunes idle IPs.

To tune limits, edit `SUBMISSION_LIMIT`, `UPLOAD_LIMIT`, and `WINDOW_MS` in `src/lib/rate-limit.ts`.

### Email notifications

On successful submission, two emails are sent in parallel (`Promise.allSettled`):

1. **Customer confirmation** — thank-you, short claim ID, product details, link to the receipt page.
2. **Admin notification** — full submission details and direct S3 links to every uploaded file. Delivered via **BCC** so admins never see each other's addresses. `Reply-To` is the customer's email so hitting reply goes back to them.

Email failures are logged and captured in Sentry but **do not fail the submission** — data is already persisted in Mongo and Sheets. Triggering a 500 at that point would cause duplicate submissions on retry.

---

## Health Check

```
GET /api/health
```

Returns `200 { status: "ok", checks }` or `503 { status: "degraded", checks }`. Checks performed:

- **Mongo** — `db.command({ ping: 1 })`
- **SMTP** — `verifyTransport()` (real SMTP `NOOP`)
- **Google Sheets** — asserts all four Sheets env vars are set

Use this endpoint with any uptime monitoring service.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── health/         Health check endpoint
│   │   ├── upload-url/     Presigned S3 URL generator
│   │   └── warranty/       Submission handler (Mongo + Sheets + email)
│   ├── warranty/
│   │   ├── _components/    WarrantyForm, UploadCard, RateLimitModal, …
│   │   └── [submissionId]/ Receipt page
│   └── privacy/            EU GPSR / data-deletion policy page
├── lib/
│   ├── emails/             Inline-styled HTML email templates
│   ├── env.ts              Boot-time env validation
│   ├── mail.ts             Nodemailer transport (lazy init)
│   ├── mongo.ts            MongoDB client
│   ├── notifications-config.ts  Admin recipients loader
│   ├── rate-limit.ts       Sliding-window rate limiter
│   └── s3.ts               AWS SDK v3 S3 client (Hetzner config)
config/
└── notifications.json      Admin recipient list (edit + redeploy to change)
```

---

## License

Private — all rights reserved by [Patrik International](https://www.patrik-windsurf.com).
