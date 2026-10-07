# Deployment

## Dev environment (CI)

Every push to `dev` that passes `check` is deployed to
`https://warranty.dev.patrik-international.com` by `.github/workflows/deploy.yml`. The VM only pulls
images from GHCR; it never builds. Production (`main`) is still deployed by hand
(`scripts/build.bat` / `push.bat`).

### GitHub (once)

- Share the organization secrets `DEV_DEPLOY_HOST`, `DEV_DEPLOY_SSH_KEY`,
  `DEV_DEPLOY_FINGERPRINT` with this repository.
- Create the `development` environment and restrict it to the `dev` branch.
- Repository variable `NEXT_PUBLIC_MAPBOX_API_KEY` (baked into the client bundle at build time).
  Optional: `DEV_URL`, `DEPLOY_USER`.
- After the first deploy, check the GHCR package
  `ghcr.io/time-4-action/patrik-warranty-form` grants this repository's Actions write access.

### Dev VM (once, as `deploy`)

DNS and TLS: the dev domain is `warranty.dev.patrik-international.com`, which is **outside** the
`*.dev.time-4-action.com` wildcard, so it needs its own setup:

- DNS: an A record `warranty.dev` in the `patrik-international.com` zone pointing at the dev VM.
  Use DNS only (grey cloud): Cloudflare's free certificate covers only one level
  (`*.patrik-international.com`), not `warranty.dev.…`. A `*.dev` record instead makes every
  future Patrik dev app work without new DNS.
- TLS: Traefik must have a certificate for this name (the `*.dev.time-4-action.com` wildcard
  does not match). Best: a second wildcard, `*.dev.patrik-international.com`, issued the same
  way as the time-4-action one (Let's Encrypt over the Cloudflare DNS API). Otherwise, if Traefik
  has an HTTP-01/TLS-ALPN resolver, add `traefik.http.routers.warranty.tls.certresolver=<name>`
  to the compose labels.

In `/data/stack/apps/time-4-action/warranty-form`:

- `docker-compose.yml` = `deploy/docker-compose.dev.yml` (loopback port `13011`, must be free);
- `.env` from `deploy/dev.env.example`: DEV Google Sheet, `S3_KEY_PREFIX=dev/uploads/warranty`,
  working SMTP credentials and `MAIL_REDIRECT_TO` set to your own inbox. Never copy the
  production `.env`.

The deploy only swaps images: copy changes to these files to the server by hand.

### Dev Mongo

A `mongo:7.0` container next to the app, not reachable from outside. The compose file sets
`SEED_MOCK_DATA=true`, so whenever the app boots against an empty `warranty` collection it inserts
80 mock claims (`src/lib/dev-seed.ts`, run from `instrumentation.ts`). Nothing to copy or run by
hand. To reset to fresh mock data:

```sh
docker compose down && docker volume rm warranty-form_mongo-data && docker compose up -d
```
