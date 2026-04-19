@AGENTS.md

## Project overview

Warranty registration form for Patrik windsurfing products. Built with Next.js 16 App Router + Tailwind CSS v4.

## Key files

- `src/app/warranty/_components/WarrantyForm.tsx` — the main form (client component). Handles all state, validation, file upload orchestration, and submit logic.
- `src/app/warranty/_components/UploadCard.tsx` — drag-and-drop file picker card used for the 4 upload slots.
- `src/app/warranty/_components/TurnstileWidget.tsx` — Cloudflare Turnstile widget wrapper. Loads the script once at module level and exposes `render` / `reset` via a forwarded ref.
- `src/app/api/upload-url/route.ts` — POST endpoint that generates presigned S3 PUT URLs. Called once per file on submit. Requires a valid `x-session-token` header.
- `src/app/api/warranty/route.ts` — POST endpoint that persists the warranty submission to Google Sheets + MongoDB. Requires a valid `x-session-token` header.
- `src/app/api/turnstile-session/route.ts` — POST endpoint that verifies a Turnstile token via Cloudflare siteverify and returns a short-lived HMAC-signed session token.
- `src/lib/turnstile.ts` — server-only helpers: `verifyTurnstileToken`, `issueSessionToken`, `verifySessionToken` (HMAC-SHA256, no JWT lib).
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

## Bot protection (Cloudflare Turnstile)

Both `/api/upload-url` and `/api/warranty` are gated by an `x-session-token` header. One Turnstile token can only be verified once with Cloudflare, but a single submission needs 5 protected calls (4 uploads + 1 warranty POST), so we exchange the Turnstile token up front for a server-issued session token that's reused.

On submit:

1. Browser generates `submissionId` and solves Turnstile → gets `turnstileToken`.
2. Browser POSTs `{ turnstileToken, submissionId }` to `/api/turnstile-session` → server calls Cloudflare siteverify and returns `{ sessionToken, expiresAt }`. Token format: `<submissionId>.<exp>.<nonce>.<base64url(HMAC-SHA256)>`, ~30 min TTL.
3. Browser sends `sessionToken` in `x-session-token` on every `/api/upload-url` call and the final `/api/warranty` POST. Both endpoints recompute the HMAC against the request's own `submissionId` and reject missing/expired/tampered/cross-submission tokens with 401.

The `submissionId` binding means a single solved Turnstile yields a token usable for exactly one warranty (the 4 uploads + 1 POST that share that id) — it can't be replayed against a different submission.

Env vars: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public), `TURNSTILE_SECRET_KEY` (server), `TURNSTILE_SESSION_SECRET` (server, HMAC key — generate with `openssl rand -base64 32`).

## Production infrastructure

- **Boot-time env validation** — `src/instrumentation.ts` runs `assertServerEnv()` from `src/lib/env.ts` when the Node runtime starts. A missing required var throws and the server fails to start, instead of crashing on the first user request.
- **`GET /api/health`** — pings Mongo and asserts presence of Sheets + Turnstile env vars. Returns `200 { status: "ok", checks }` or `503 { status: "degraded", checks }`. Use it for uptime monitoring.
- **Sentry** — `sentry.{client,server,edge}.config.ts` plus `instrumentation.ts → onRequestError`. All `init()` calls are gated on `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` — leave them unset locally and Sentry stays inactive. `next.config.ts` is wrapped in `withSentryConfig` for source-map upload (needs `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` at build time only).
- **Roadmap** — `docs/PRODUCTION.md` tracks deferred production items (notifications, GDPR, private bucket, CI, indexes, CSP, etc.) with a one-line problem/fix/reason for each.
