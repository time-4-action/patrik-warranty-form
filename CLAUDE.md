@AGENTS.md

## Project overview

Warranty registration form for Patrik windsurfing products. Built with Next.js 16 App Router + Tailwind CSS v4.

## Key files

- `src/app/warranty/_components/WarrantyForm.tsx` — the main form (client component). Handles all state, validation, file upload orchestration, and submit logic.
- `src/app/warranty/_components/UploadCard.tsx` — drag-and-drop file picker card used for the 4 upload slots.
- `src/app/warranty/_components/RateLimitModal.tsx` — branded modal shown when `/api/warranty` or `/api/upload-url` return 429. Live-counts the retry time and explains why the limit exists.
- `src/app/api/upload-url/route.ts` — POST endpoint that generates presigned S3 PUT URLs. Called once per file on submit. IP rate-limited via `consumeSubmissionAttempt`.
- `src/app/api/warranty/route.ts` — POST endpoint that persists the warranty submission to Google Sheets + MongoDB. IP rate-limited via `consumeSubmissionAttempt`.
- `src/lib/rate-limit.ts` — Mongo-backed sliding-window rate limiter. Exports `consumeSubmissionAttempt`, `getClientIp`, and the `SUBMISSION_LIMIT` / `UPLOAD_LIMIT` / `WINDOW_MS` constants.
- `src/lib/s3.ts` — AWS SDK v3 S3 client configured for Hetzner Object Storage.
- `src/lib/mail.ts` — server-only nodemailer transport (lazy-initialised from `SMTP_*` env vars). Exports `sendMail` and `verifyTransport`.
- `src/lib/notifications-config.ts` — loads `config/notifications.json` and asserts `adminRecipients` is non-empty at boot.
- `src/lib/emails/user-confirmation.ts` / `src/lib/emails/admin-notification.ts` — build `{ subject, html, text }` for the two transactional emails sent on submission. Inline-styled HTML only, no external assets.
- `config/notifications.json` — admin recipients list (edit + redeploy to change). Deliberately minimal — only the one knob that needs to vary without code change.

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

## Abuse protection (rate limiting)

`/api/warranty` and `/api/upload-url` are both gated by a Mongo-backed sliding-window rate limiter keyed on the caller's IP (`cf-connecting-ip` → `x-real-ip` → `x-forwarded-for`). Keys are namespaced per endpoint (`warranty:<ip>`, `upload:<ip>`) so upload activity doesn't consume the submission budget and vice-versa.

Limits (see `src/lib/rate-limit.ts`):

- `SUBMISSION_LIMIT` — 5 successful `/api/warranty` attempts per rolling hour.
- `UPLOAD_LIMIT` — `SUBMISSION_LIMIT × 4 × 2` presigned URLs per rolling hour (4 slots per submission + headroom for retries).

Both endpoints return `429 { error: "rate-limited", limit, retryAfterSeconds }` with a matching `Retry-After` header when blocked. The frontend maps 429 from either endpoint into `RateLimitModal`, which live-counts the retry time.

A TTL index on `updatedAt` auto-expires idle IPs after `2 × WINDOW_MS`, so the `rate_limits` collection stays small without a cron job.

## Email notifications

On successful submission, `/api/warranty` sends two transactional emails in parallel (`Promise.allSettled`) via SMTP (nodemailer):

1. **Customer confirmation** → `payload.email`. Thank-you, short claim id, product + serial, submission time, link to `${BASE_URL}/warranty/<submissionId>`.
2. **Admin notification** → everyone in `config/notifications.json → adminRecipients`, delivered via **BCC** so admins never see each other's addresses. `to` is set to `SMTP_FROM` (needed because some SMTP servers / spam filters reject mail with no visible `To:`). `replyTo` is set to the customer's email so hitting reply goes back to the customer.

Failure handling is **fire-and-forget** — if SMTP is down or credentials are wrong, errors are logged via `console.error` + `Sentry.captureException`, and the endpoint still returns `{ ok: true, submissionId }`. The submission is already persisted in Mongo + Sheets; failing the request would produce duplicate submissions and an inconsistent state.

Transport setup lives in `src/lib/mail.ts` (lazy — first `sendMail`/`verifyTransport` call creates the transporter; `secure: true` is derived automatically when `SMTP_PORT === 465`). Templates are plain inline-styled HTML plus a plain-text fallback — no templating lib, no external images/fonts, safe across Gmail / Outlook / Apple Mail. User-supplied values are HTML-escaped via `src/lib/emails/_html.ts` before being interpolated.

`/api/health` actively calls `verifyTransport()` (real SMTP `NOOP`), matching the Mongo ping style — not just env-var presence.

Env vars: `SMTP_HOST`, `SMTP_PORT` (465 = SSL, 587 = STARTTLS), `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` (e.g. `"Patrik Warranty <noreply@patrik-windsurf.com>"`). All required at boot.

## Git workflow

`main` is protected — **no direct pushes**. All changes must go through a PR and require **at least 1 approval** before merging. Always branch off `main`, open a PR, and get it reviewed.

## Production infrastructure

- **Boot-time env validation** — `src/instrumentation.ts` runs `assertServerEnv()` from `src/lib/env.ts` and `assertNotificationsConfig()` from `src/lib/notifications-config.ts` when the Node runtime starts. A missing required env var or an empty `adminRecipients` array throws and the server fails to start, instead of crashing on the first user request.
- **`GET /api/health`** — pings Mongo, verifies the SMTP transport, asserts presence of Sheets env vars. Returns `200 { status: "ok", checks }` or `503 { status: "degraded", checks }`. Use it for uptime monitoring.
- **Sentry** — `sentry.{client,server,edge}.config.ts` plus `instrumentation.ts → onRequestError`. All `init()` calls are gated on `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` — leave them unset locally and Sentry stays inactive. `next.config.ts` is wrapped in `withSentryConfig` for source-map upload (needs `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` at build time only).
- **Roadmap** — `docs/PRODUCTION.md` tracks deferred production items (CI, indexes, CSP, Mongo backup, etc.) with a one-line problem/fix/reason for each.
