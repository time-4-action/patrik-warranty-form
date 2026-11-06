# Deployment

`.github/workflows/deploy.yml` builds the image **once** and promotes that same image:

1. **Pull request** — `check`: `npm run lint` + a Docker build that is not pushed.
2. **Push to `dev`** — `image` builds `ghcr.io/time-4-action/patrik-warranty-form:<sha>` (the
   only build), `deploy` rolls the dev VM onto it **by digest**, `verify` requires the public
   `/api/health` to report `status: ok` and `version: <sha>`. Only then is the image tagged
   `:<sha>-verified` and `:dev`.
3. **Push to `main`** (the `dev` → `main` merge) — **no build**. `image` takes main's git tree,
   finds the dev commit with the identical tree and a `:<sha>-verified` image, and production
   gets that exact digest. After `verify` it is tagged `:latest`. If main's code never went
   through dev (e.g. a direct push), there is no verified image and the run fails before
   touching production.

Both deploys roll back to the previously running image unless the container comes up healthy on
`127.0.0.1:<port>/api/health` and reports `APP_VERSION` = the image's source commit. The servers
only pull; they never build.

| Branch | Environment | Image | Server dir | Health port | Public URL |
|---|---|---|---|---|---|
| `dev` | `development` | built: `:<sha>` → `:<sha>-verified`, `:dev` | `/data/stack/apps/patrik-international/warranty` (dev VM) | `127.0.0.1:13011` | https://warranty.dev.patrik-international.com |
| `main` | `production` | promoted digest → `:latest` | `/srv/patrik-warranty` (t4a) | `127.0.0.1:4000` | https://patrik-international.com |

The image is environment-neutral. `NEXT_PUBLIC_MAPBOX_API_KEY` (repository variable) is the only
build-time value and is the same everywhere; anything that differs per environment — secrets,
`GA_MEASUREMENT_ID`, `MAIL_REDIRECT_TO`, … — lives in the server's `.env` and is read at runtime.
Don't add environment-specific `NEXT_PUBLIC_*` build args: that breaks build-once.

`/api/health` reports `version` (the commit the running image was built from), so
`curl https://patrik-international.com/api/health` tells you what production runs.

To roll production back by hand, on the server:
`export APP_IMAGE=ghcr.io/time-4-action/patrik-warranty-form:<sha>-verified && docker compose up -d`
(`docker login ghcr.io` first: the package is private), or re-run that commit's workflow.

## Production (t4a)

t4a: Hetzner Cloud in Helsinki, `77.42.42.60`, Traefik in front (`servers/t4a/README.md` in
[t4a-infra](https://github.com/time-4-action/t4a-infra)). Everything the form uses is in Helsinki:

| What | Where |
|---|---|
| The form | `/srv/patrik-warranty` (`docker-compose.yml` = `deploy/docker-compose.t4a.yml`, `.env`), owned by `deploy` |
| Data | database `patrik-warranty` in t4a's shared Postgres 18 (`/srv/postgres`, nightly + point-in-time backups), plus the Google Sheet |
| Uploads | Hetzner Object Storage `hel1`, bucket `t4a`; served as `assets.patrik-international.com` and the old `/warranty/wp-content/uploads/arforms/userfiles/` links through `/srv/edge/dynamic/patrik-assets.yml` |
| TLS | Cloudflare origin certificate in `/srv/edge/certs/patrik-international.com/` |
| DNS | Cloudflare zone `patrik-international.com`: `@` and `assets` A `77.42.42.60` (proxied), `www` CNAME `@` |

The `production` environment points CI at t4a. Its values win over the organization secrets of
the same name, so other repos sharing `PROD_DEPLOY_*` are not affected:

| On the `production` environment | Value |
|---|---|
| secret `PROD_DEPLOY_HOST` | `77.42.42.60` |
| secret `PROD_DEPLOY_SSH_KEY` | the private key `github-actions@patrik-warranty-form-t4a` (its public half is in `/home/deploy/.ssh/authorized_keys` on t4a) |
| secret `PROD_DEPLOY_FINGERPRINT` | t4a's **ECDSA** host key, `SHA256:2wkXWs0QETKFiXKXbxbJRASeNd9I6zigPKVQGBtwfTk` (`ssh-keygen -lf /etc/ssh/ssh_host_ecdsa_key.pub`; the deploy action checks the ECDSA key, so the ED25519 fingerprint fails with "host key fingerprint mismatch") |
| variable `DEPLOY_DIR` | `/srv/patrik-warranty` |

`.env` holds the production secrets (`DATABASE_URL` from `sh /srv/postgres/new-app-db.sh`, S3,
SMTP, Sheets, Sentry, `GA_MEASUREMENT_ID`, `INTERNAL_ADMIN_TOKEN`, `INTERNAL_READ_TOKEN`, …).
`INTERNAL_READ_TOKEN` is the read-only token for the T4A agent (it calls
`http://patrik-warranty-form:3000/api/admin/...` over the `edge` network): generate it with
`openssl rand -hex 32`, set the same value in t4a-agent's env, then `docker compose up -d` here to
recreate the container. It only opens the GET claim routes and `/api/admin/stats`. Never set `MAIL_REDIRECT_TO`, `S3_KEY_PREFIX` or
`SEED_MOCK_DATA` here. The production compose file is copied to the server by hand; a copy with a
fixed `image:` tag ignores `APP_IMAGE`, and every deploy would fail its `APP_VERSION` check.

History: until 2026-11-03 production ran on t2 (nginx, MongoDB). It moved to t4a that day, and
on 2026-11-04 from MongoDB to Postgres (a one-off copy at boot: 109 claims, 3 notes, 3 audit
entries, 1 settings document). Both MongoDB copies and everything of the form on t2 were then
removed. The steps are in this file's git history and in t4a-infra `servers/t2/warranty-cutover.md`.

## Dev environment (setup, once)

### GitHub

- Share the organization secrets `DEV_DEPLOY_HOST`, `DEV_DEPLOY_SSH_KEY`,
  `DEV_DEPLOY_FINGERPRINT` with this repository.
- Create the `development` environment and restrict it to the `dev` branch.
- Repository variable `NEXT_PUBLIC_MAPBOX_API_KEY` (baked into the client bundle at build time).
  Optional: `DEV_URL`, `DEPLOY_USER`.
- After the first deploy, check the GHCR package
  `ghcr.io/time-4-action/patrik-warranty-form` grants this repository's Actions write access.

### Dev VM (as `deploy`)

DNS and TLS: the dev domain is `warranty.dev.patrik-international.com`, which is **outside** the
`*.dev.time-4-action.com` wildcard, so it needs its own setup:

- DNS: an A record `warranty.dev` in the `patrik-international.com` zone pointing at the dev VM.
  Use DNS only (grey cloud): Cloudflare's free certificate covers only one level
  (`*.patrik-international.com`), not `warranty.dev.…`. A `*.dev` record instead makes every
  future Patrik dev app work without new DNS.
- TLS: Traefik (`/data/stack/infra/traefik/docker-compose.yml`) pins its certificates at the
  `websecure` entrypoint, so the `*.dev.time-4-action.com` wildcard alone would be served for
  this name. Add a second wildcard next to `domains[0]`, then `docker compose up -d` there:

  ```yaml
  - --entrypoints.websecure.http.tls.domains[1].main=dev.patrik-international.com
  - --entrypoints.websecure.http.tls.domains[1].sans=*.dev.patrik-international.com
  ```

  The `le` resolver uses the Cloudflare DNS challenge, so its API token (Traefik `.env`) must
  have DNS edit rights on the `patrik-international.com` zone too.

In `/data/stack/apps/patrik-international/warranty`:

- `docker-compose.yml` = `deploy/docker-compose.dev.yml` (loopback port `13011`, must be free);
- `.env` from `deploy/dev.env.example`: DEV Google Sheet, `S3_KEY_PREFIX=dev/uploads/warranty`,
  working SMTP credentials and `MAIL_REDIRECT_TO` set to your own inbox. Never copy the
  production `.env`.

Every dev deploy installs `deploy/docker-compose.dev.yml` from the commit it deploys as the
server's `docker-compose.yml` (the old one is kept as `docker-compose.yml.prev` and comes back if
the deploy rolls back). Change the dev compose in the repo, never on the server. `.env` stays a
hand-managed file.

### Dev Postgres

A `postgres:18-alpine` container next to the app, not reachable from outside. The app creates its
tables at boot (`src/lib/db.ts`). The compose file sets `SEED_MOCK_DATA=true`, so whenever the app
boots against an empty `warranty` table it inserts 80 mock claims (`src/lib/dev-seed.ts`, run from
`instrumentation.ts`). Nothing to copy or run by hand. To reset to fresh mock data:

```sh
docker compose down -v && docker compose up -d
```
