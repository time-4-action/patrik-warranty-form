<div align="center">

# Patrik Warranty Form

**Warranty registration portal for Patrik windsurfing products**

Customers submit a claim, upload proof photos, and receive a confirmation email.
Staff get an admin notification with full details and direct links to every uploaded file.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)

</div>

---

## Overview

A production-grade warranty registration form built for Patrik International. The form collects customer and product details, accepts up to four proof photos (uploaded directly to object storage), and persists every submission to both MongoDB and a Google Sheet for easy staff review.

**Key capabilities:**

- **Multi-step registration form** with address autocomplete (Mapbox) and four photo upload slots — invoice, serial number, full product shot, close-up
- **Direct-to-S3 uploads** via presigned PUT URLs — file bytes never touch the Next.js server
- **Dual persistence** — every submission is written to MongoDB and appended to a Google Sheet
- **Transactional email** — customer confirmation + BCC'd admin notification sent in parallel on successful submit
- **IP rate limiting** — MongoDB-backed sliding window with per-endpoint buckets; 429 surfaces a live-countdown modal in the UI
- **Boot-time env validation** — missing required vars crash the server at start, not on the first request
- **Health endpoint** at `GET /api/health` — pings MongoDB, verifies SMTP, asserts Sheets config; returns `200 / 503`
- **Sentry** error tracking (client + server + edge); inactive until DSN env vars are set

## Architecture

```
  Browser                    Next.js (App Router)              External Services
     │                              │                                  │
     │── POST /api/upload-url ──▶   │── generatePresignedUrl ──▶  Hetzner S3
     │◀─ { presignedUrl, url } ─── │                                  │
     │                              │                                  │
     │── PUT <presignedUrl> ──────────────────────────────────▶  Hetzner S3
     │                              │                                  │
     │── POST /api/warranty ──────▶ │── upsert ──────────────▶  MongoDB
     │                              │── append row ──────────▶  Google Sheets
     │                              │── send email ──────────▶  SMTP
     │◀─ { ok, submissionId } ──── │   ├── customer confirmation
     │                              │   └── admin notification (BCC)
     │                              │                                  │
     │── GET /warranty/:id ───────▶ │── findOne({ submissionId }) ▶  MongoDB
     │◀─ receipt page ──────────── │                                  │
```

Uploaded files are stored under a UUID-keyed path — one folder per claim:

```
uploads/warranty/<submissionId>/invoice.<ext>
uploads/warranty/<submissionId>/serial.<ext>
uploads/warranty/<submissionId>/full.<ext>
uploads/warranty/<submissionId>/closeup.<ext>
```

## Quick Start

### Prerequisites

- **Node.js** 20 LTS or newer
- **MongoDB** 7.0+
- A Hetzner (or AWS S3-compatible) object storage bucket
- A Google Cloud service account with Sheets API access
- An SMTP mailbox
- A Mapbox public token (for address autocomplete)

### Installation

```bash
git clone https://github.com/time-4-action/patrik-warranty-form.git
cd patrik-warranty-form
npm install
```

### Configuration

Copy the example env file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

See [Environment Variables](#environment-variables) below for the full reference.

### Apply the S3 CORS rule

The bucket must allow `PUT` from your domain. A ready-made rule is committed at `cors.json`:

```bash
aws s3api put-bucket-cors \
  --bucket patrik-assets \
  --cors-configuration file://cors.json \
  --endpoint-url https://fsn1.your-objectstorage.com
```

### Run

```bash
# Development
npm run dev

# Production build
npm run build && npm start
```

Open [http://localhost:3000/warranty](http://localhost:3000/warranty).

## Environment Variables

Copy `.env.local.example` to `.env.local`. All variables marked **required** must be set or the server will refuse to start.

### Mapbox

| Variable | Required | Description |
|---|:---:|---|
| `NEXT_PUBLIC_MAPBOX_API_KEY` | ✓ | Public token for address autocomplete |

### Hetzner Object Storage

| Variable | Required | Description |
|---|:---:|---|
| `S3_ENDPOINT` | ✓ | e.g. `https://fsn1.your-objectstorage.com` |
| `S3_REGION` | ✓ | e.g. `fsn1` |
| `S3_BUCKET` | ✓ | Bucket name |
| `S3_PUBLIC_BASE` | ✓ | Public base URL, e.g. `https://patrik-assets.fsn1.your-objectstorage.com` |
| `S3_ACCESS_KEY_ID` | ✓ | Hetzner access key |
| `S3_SECRET_ACCESS_KEY` | ✓ | Hetzner secret key |

> **Migrating to AWS S3?** Remove `S3_ENDPOINT` and drop `forcePathStyle: true` + `requestChecksumCalculation` from `src/lib/s3.ts`.

### MongoDB

| Variable | Required | Description |
|---|:---:|---|
| `MONGODB_URI` | ✓ | Full connection string |

### Google Sheets

Create a GCP service account, enable the Sheets API, share the target sheet with the service account email (Editor), and download the JSON key.

| Variable | Required | Description |
|---|:---:|---|
| `GOOGLE_SA_CLIENT_EMAIL` | ✓ | Service account email |
| `GOOGLE_SA_PRIVATE_KEY` | ✓ | Private key from the JSON key (keep `\n` escapes) |
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
| `SMTP_FROM` | ✓ | Sender display name + address, e.g. `"Patrik Warranty <noreply@patrik-windsurf.com>"` |

Admin recipients (staff who receive the notification email) are configured in `config/notifications.json` — not via env vars. Edit that file and redeploy to change the list.

### Sentry *(optional)*

Leave all Sentry vars unset to disable error tracking.

| Variable | Description |
|---|---|
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | DSN for server-side / client-side reporting |
| `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Tag to distinguish prod from staging |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Build-time only — source map upload |

## Rate Limiting

`/api/warranty` and `/api/upload-url` are both gated by a MongoDB-backed sliding-window limiter keyed on caller IP (`cf-connecting-ip` → `x-real-ip` → `x-forwarded-for`). Each endpoint has an independent bucket so upload traffic can't consume the submission budget.

| Endpoint | Default limit |
|---|---|
| `POST /api/warranty` | 5 submissions per rolling hour |
| `POST /api/upload-url` | 40 presigned URLs per rolling hour |

A 429 response includes `{ error: "rate-limited", limit, retryAfterSeconds }` plus a `Retry-After` header. The UI catches this from either endpoint and shows a live-countdown modal. A TTL index on `rate_limits.updatedAt` auto-prunes idle IPs.

To tune limits, edit `SUBMISSION_LIMIT`, `UPLOAD_LIMIT`, and `WINDOW_MS` in `src/lib/rate-limit.ts`.

## Health Check

```
GET /api/health
```

Returns `200 { status: "ok", checks }` or `503 { status: "degraded", checks }`.

| Check | Method |
|---|---|
| MongoDB | `db.command({ ping: 1 })` |
| SMTP | `verifyTransport()` (real SMTP `NOOP`) |
| Google Sheets | asserts all four Sheets env vars are set |

## Project Structure

```
patrik-warranty-form/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/            Health check endpoint
│   │   │   ├── upload-url/        Presigned S3 URL generator
│   │   │   └── warranty/          Submission handler (MongoDB + Sheets + email)
│   │   ├── warranty/
│   │   │   ├── _components/       WarrantyForm, UploadCard, RateLimitModal, …
│   │   │   └── [submissionId]/    Receipt page
│   │   └── privacy/               EU GPSR / data-deletion policy page
│   ├── lib/
│   │   ├── emails/                Inline-styled HTML email templates
│   │   ├── env.ts                 Boot-time env validation
│   │   ├── mail.ts                Nodemailer transport (lazy init)
│   │   ├── mongo.ts               MongoDB client
│   │   ├── notifications-config.ts  Admin recipients loader
│   │   ├── rate-limit.ts          Sliding-window rate limiter
│   │   └── s3.ts                  AWS SDK v3 S3 client (Hetzner config)
│   └── instrumentation.ts         Boot validation + Sentry wiring
├── config/
│   └── notifications.json         Admin recipient list (edit + redeploy to change)
├── cors.json                      S3 CORS rule — apply once with aws s3api
└── .env.local.example             Environment variable template
```

---

<div align="center">
  <sub>Built by <a href="https://etiam.si">etiam.si</a> for <a href="https://www.patrik-windsurf.com">Patrik International</a></sub>
</div>
