# Production Roadmap

What's done, what's deferred, and why each deferred item matters.

## Done

- **Cloudflare Turnstile** gates `/api/upload-url` and `/api/warranty`. Session token is bound to a single `submissionId` so it can't be replayed across submissions.
- **Env validation at boot** via `src/instrumentation.ts` → `assertServerEnv()` (`src/lib/env.ts`). A missing var fails the server start, not the first user.
- **Sentry** error tracking wired for client (`sentry.client.config.ts`), server (`sentry.server.config.ts`), edge (`sentry.edge.config.ts`), and route handlers (via `instrumentation.ts → onRequestError`). Inactive until `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` are set.
- **Health check** at `GET /api/health` — pings Mongo, asserts Sheets and Turnstile env vars are set. Returns 200 / 503.
- **Privacy / GPSR page** at `/privacy` — covers EU representative info (Creaglobe GmbH), GPSR / REACH / RoHS compliance statement, safety + maintenance instructions, and the data-deletion procedure (email `web@patrikinternational.com`). Linked from the consent checkbox in `WarrantyForm.tsx` and from the bottom of `/warranty`. Deletion is handled manually by Patrik staff against Mongo + the Hetzner bucket — acceptable at current claim volume; revisit if claim volume grows.

## Design decisions (intentionally not done)

- **Public Hetzner file URLs** *(was item #3)*: `uploads/warranty/<submissionId>/<slot>.<ext>` is publicly readable by anyone with the URL. Path is unguessable (UUID v4 `submissionId`) but not access-controlled. Patrik staff and internal tools depend on direct-link reads from the bucket; signed-URL gating would break them. Accepted trade-off — the unguessable path is the access control.

## Deferred

Each item has a one-line problem, a one-line fix, and the reason it's not blocking.

### Critical — schedule before broader launch

- **Notification on new submission** *(item #1)*
  - Problem: staff have to poll the Google Sheet to see new claims.
  - Fix: in `src/app/api/warranty/route.ts`, after the dual-write succeeds, send an email (Resend) or post to a Slack webhook with the submission summary + receipt URL.
  - Deferred because: needs a decision on email-vs-Slack and a sender domain / webhook URL.

### Operations

- **CI** *(item #7)*
  - Problem: a TypeScript error or broken build can ship.
  - Fix: add `.github/workflows/ci.yml` running `npm ci && npm run build && npx tsc --noEmit` on PRs.

- **Mongo `submissionId` index** *(item #9)*
  - Problem: `findOne({ submissionId })` on the receipt page is a full collection scan.
  - Fix: one-time `db.warranty.createIndex({ submissionId: 1 }, { unique: true })`. Or call `createIndex` from `src/lib/mongo.ts` on first use.

- **CORS allowlist on protected endpoints** *(item #10)*
  - Problem: `/api/upload-url` and `/api/warranty` are origin-agnostic — only the session token gates them.
  - Fix: in `next.config.ts`, add a `headers()` block returning `Access-Control-Allow-Origin` only for the production origin(s).

- **Server-side file validation** *(item #11)*
  - Problem: recent commit allows uploads of any size and type. With a public bucket, a session-token-holder could host arbitrary files at the patrikinternational domain.
  - Fix: in `src/app/api/upload-url/route.ts`, validate `contentType` against an allowlist (`image/*`, `application/pdf`) and enforce a max size (~25 MB). Real S3-side enforcement requires a presigned POST policy instead of presigned PUT.

- **Security headers (CSP etc.)** *(item #12)*
  - Problem: no Content-Security-Policy, HSTS, X-Frame-Options.
  - Fix: `next.config.ts → headers()` returning a CSP allowlist for Mapbox + Cloudflare Turnstile + Google Sheets domains, plus `Strict-Transport-Security` and `X-Frame-Options: DENY`.

### Nice to have

- **Confirmation email to user** *(item #13)*: today the success modal is the only place the `submissionId` is shown. If the user closes it, the receipt URL is lost.
- **Mongo backup** *(item #14)*: the instance is a single Hetzner VM. No replication, no nightly dump. Add `mongodump` to a cron, target an off-host bucket.
- **Playwright happy-path test** *(item #15)*: covers form submit end-to-end. Lets you refactor the 900-line `WarrantyForm.tsx` confidently.
