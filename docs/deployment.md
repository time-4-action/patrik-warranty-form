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
| `main` | `production` | promoted digest → `:latest` | `/data/stack/apps/patrik-international/warranty` (prod VM) | `127.0.0.1:4000` | https://patrik-international.com |

The image is environment-neutral. `NEXT_PUBLIC_MAPBOX_API_KEY` (repository variable) is the only
build-time value and is the same everywhere; anything that differs per environment — secrets,
`GA_MEASUREMENT_ID`, `MAIL_REDIRECT_TO`, … — lives in the server's `.env` and is read at runtime.
Don't add environment-specific `NEXT_PUBLIC_*` build args: that breaks build-once.

`/api/health` reports `version` (the commit the running image was built from), so
`curl https://patrik-international.com/api/health` tells you what production runs.

To roll production back by hand, on the server:
`export APP_IMAGE=ghcr.io/time-4-action/patrik-warranty-form:<sha>-verified && docker compose up -d`
(`docker login ghcr.io` first if the package is private), or re-run that commit's workflow.

## Production (setup, once)

GitHub:

- Share the organization secrets `PROD_DEPLOY_HOST`, `PROD_DEPLOY_SSH_KEY`,
  `PROD_DEPLOY_FINGERPRINT` with this repository (the same ones t4a-admin uses, if the warranty
  form runs on that VM).
- Create the `production` environment and restrict it to the `main` branch.
- Optional: required reviewer on the `production` environment (deploys wait for an approval),
  repository variable `PRODUCTION_URL`.

Server, in `/data/stack/apps/patrik-international/warranty` (owned by `deploy`, which must be in
the `docker` group):

- `docker-compose.yml` = `deploy/docker-compose.yml`. Same container name, port (4000) and
  `.env` as the hand-deployed setup, so nginx needs no change. A copy with a fixed `image:` tag
  ignores `APP_IMAGE`, and every deploy would fail its `APP_VERSION` check and roll back.
- `.env`: the production secrets, plus `GA_MEASUREMENT_ID` (runtime since build-once). Never set `MAIL_REDIRECT_TO`,
  `S3_KEY_PREFIX` or `SEED_MOCK_DATA` here.

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

The deploy only swaps images: copy changes to these files to the server by hand.

### Dev Mongo

A `mongo:7.0` container next to the app, not reachable from outside. The compose file sets
`SEED_MOCK_DATA=true`, so whenever the app boots against an empty `warranty` collection it inserts
80 mock claims (`src/lib/dev-seed.ts`, run from `instrumentation.ts`). Nothing to copy or run by
hand. To reset to fresh mock data:

```sh
docker compose down -v && docker compose up -d
```
