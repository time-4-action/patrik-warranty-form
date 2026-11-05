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

## Production on t4a (moving from t2)

Production moves from t2 (`/data/stack/apps/patrik-international/warranty`, nginx) to t4a
(Hetzner, `/srv/patrik-warranty`, Traefik; see `servers/t4a/README.md` in
[t4a-infra](https://github.com/time-4-action/t4a-infra)). Mongo moves with it: the `patrik`
database is in t4a's Mongo, reached as `mongo:27017` with this app's own user.

The workflow is the same for both servers. What picks t4a is set on the `production` environment
only, so `t4a-admin` and the other repos sharing the `PROD_DEPLOY_*` organization secrets are not
affected (environment secrets win over organization secrets of the same name):

| On the `production` environment | Value |
|---|---|
| secret `PROD_DEPLOY_HOST` | `77.42.42.60` |
| secret `PROD_DEPLOY_SSH_KEY` | the private key `github-actions@patrik-warranty-form` (its public half is in `/home/deploy/.ssh/authorized_keys` on t4a) |
| secret `PROD_DEPLOY_FINGERPRINT` | t4a's **ECDSA** host key, `SHA256:2wkXWs0QETKFiXKXbxbJRASeNd9I6zigPKVQGBtwfTk` (`ssh-keygen -lf /etc/ssh/ssh_host_ecdsa_key.pub`; the deploy action checks the ECDSA key, so the ED25519 fingerprint fails with "host key fingerprint mismatch")  |
| variable `DEPLOY_DIR` | `/srv/patrik-warranty` |

Set them at the cutover, not before: from then on every production deploy goes to t4a, and the
`verify` job checks the public URL, so DNS must point at t4a too. To go back to t2, delete the
four; the organization secrets and the default directory apply again.

Server, in `/srv/patrik-warranty` (owned by `deploy`):

- `docker-compose.yml` = `deploy/docker-compose.t4a.yml`: Traefik labels for `patrik-international.com`
  and `www`, networks `edge` and `mongo`, loopback port `4000` for CI's health check.
- `.env`: the production `.env` from t2 with `MONGODB_URI` replaced by the one
  `sh /srv/mongo/new-app-mongo.sh patrik-warranty patrik` printed.
- In t4a-infra: the `patrik-international.com` Cloudflare origin certificate in `/srv/edge/certs/`
  and `/srv/edge/dynamic/patrik-assets.yml` (the old upload links and `assets.patrik-international.com`
  to the `t4a` bucket in hel1; before November 2026 `patrik-assets` in fsn1).

Cutover, with no claim lost (a few minutes of a "back soon" page):

1. `/maintenance down patrik-international.com www.patrik-international.com assets.patrik-international.com Moving to a new server`.
   t4a's Traefik answers with the down page; t2 still serves until DNS moves.
2. Cloudflare: point the A records of `patrik-international.com`, `www` and `assets` at `77.42.42.60` (proxied).
   From then on no request reaches t2.
3. Copy the `patrik` database from t2 once more (`--drop`; `servers/t4a/README.md`, "MongoDB").
4. Set the four values above on the `production` environment.
5. `/maintenance end`, then check https://patrik-international.com/api/health reports `status: ok`.
6. Stop the container on t2 (keep its folder and `.env` for a few weeks).

## MongoDB to Postgres (on t4a)

Do this after the move to t4a is done and green; images with the Postgres change cannot run on
t2. The app stores everything in t4a's shared Postgres 18 (one database and role per app, nightly
and point-in-time backups; `servers/t4a/README.md` in t4a-infra, "Postgres"). It creates its
tables at boot, and while `MIGRATE_FROM_MONGODB_URI` is set and the `warranty` table is empty it
copies claims, notes, the audit log and the email settings from MongoDB in one transaction
(`src/lib/migrate-from-mongo.ts`). No maintenance page is needed: the deploy stops the old
container before the new one starts, and the new one copies before it serves, so no claim lands
in MongoDB after the copy.

Dev needs nothing by hand: the dev deploy installs the new `deploy/docker-compose.dev.yml` (with
its own Postgres) itself. The old `mongo-data` volume stays on the dev VM until someone removes
it (`docker volume rm patrik-warranty-dev_mongo-data`).

Production, before promoting `dev` to `main`:

1. `ssh t4a sh /srv/postgres/new-app-db.sh patrik-warranty` prints a `DATABASE_URL`.
2. In `/srv/patrik-warranty/.env`, add that `DATABASE_URL` and
   `MIGRATE_FROM_MONGODB_URI=<the value of MONGODB_URI>`. Keep `MONGODB_URI` for now: the running
   image still needs it if it restarts, and it is the way back.
3. Copy `deploy/docker-compose.t4a.yml` to `/srv/patrik-warranty/docker-compose.yml` (it adds the
   `db` network). CI picks it up on the next deploy.

Cutover:

4. Merge the `dev` → `main` PR. CI deploys as usual and checks `/api/health`, whose checks now
   list `postgres` instead of `mongo`.
5. Check the copy: `docker compose logs patrik-warranty-form | grep mongo-copy` shows the MongoDB
   and Postgres counts, which must match. Open a few claims in t4a-admin.
6. Remove `MIGRATE_FROM_MONGODB_URI` and `MONGODB_URI` from `.env`, and the `mongo` network from
   the server's `docker-compose.yml`, then `docker compose up -d`. While the variable stays, every
   boot logs `[mongo-copy] skipped`; it never copies again once Postgres holds claims.
7. Leave the `patrik` database in t4a's MongoDB untouched for a few weeks, then drop it.
   Afterwards, remove `src/lib/migrate-from-mongo.ts` and the `mongodb` dependency.

Way back (before step 6): deploy the previous image
(`APP_IMAGE=ghcr.io/time-4-action/patrik-warranty-form:<previous sha>-verified docker compose up -d`)
and it runs against MongoDB again. Claims submitted on Postgres in between are then only in
Postgres and the Google Sheet.

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
