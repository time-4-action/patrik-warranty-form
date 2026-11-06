# Deployment

`.github/workflows/deploy.yml` deploys from `main` only. There is no dev server any more
(switched off 2026-11-06): pull requests go straight into `main`, and merging one deploys
production.

1. **Pull request**: `check` runs `npm run lint` and a Docker build that is not pushed.
2. **Push to `main`** (a merged PR): `image` builds `ghcr.io/time-4-action/patrik-warranty-form:<sha>`,
   `deploy` rolls production (t4a) onto it **by digest**, and `verify` requires the public
   `/api/health` to report `status: ok` and `version: <sha>`. Only then is the image tagged `:latest`.

The deploy rolls back to the previously running image unless the container comes up healthy on
`127.0.0.1:4000/api/health` and reports `APP_VERSION` = the image's source commit. The server
only pulls; it never builds.

| Branch | Environment | Image | Server dir | Health port | Public URL |
|---|---|---|---|---|---|
| `main` | `production` | built: `:<sha>` → `:latest` | `/srv/patrik-warranty` (t4a) | `127.0.0.1:4000` | https://patrik-international.com |

The image is environment-neutral. `NEXT_PUBLIC_MAPBOX_API_KEY` (repository variable) is the only
build-time value; everything else (secrets, `GA_MEASUREMENT_ID`, ...) lives in the server's `.env`
and is read at runtime.

`/api/health` reports `version` (the commit the running image was built from), so
`curl https://patrik-international.com/api/health` tells you what production runs.

To roll production back by hand, on the server:
`export APP_IMAGE=ghcr.io/time-4-action/patrik-warranty-form:<sha> && docker compose up -d`
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
