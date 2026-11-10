# Tenant storefront deployment

The customer-facing storefront is served from `{slug}.nawyorders.com` and talks
to `{slug}.api.nawyorders.com`. One image serves every tenant: the first
hostname label is the tenant slug, resolved per request. There is no build-time
tenant slug and no `NEXT_PUBLIC_*` API base URL.

This document covers the VPS deployment. The platform/restaurant admin is a
different application and is not deployed here.

## What runs

| Piece | Value |
| --- | --- |
| Container | `nawyorders-tenant-web` |
| Compose file | `docker-compose.tenant-web.yml` |
| Deployment directory | `/opt/nawyorders/tenant-web` |
| Network | `genmarka_default` (Caddy's own network, external) |
| Published port | none |
| Internal port | `3000` |
| Reverse proxy | existing `genmarka-caddy-1` |
| Health check | `GET /manifest.webmanifest` inside the container |

Caddy is shared with other applications. The storefront joins Caddy's own
`genmarka_default` network and is only reachable through Caddy; the container
does not publish a host port. It does not depend on the backend's
`dev_nawy-network`, which is only a manual attachment on the live Caddy
container and would disappear if Caddy is recreated.

## Runtime environment

Copy `.env.tenant-web.example` to `.env.tenant-web` in the deployment directory.
Never commit the real file.

```dotenv
TENANT_ROOT_DOMAIN=nawyorders.com
TENANT_API_BASE_URL_TEMPLATE=https://{slug}.api.nawyorders.com
TENANT_RESERVED_SLUGS=www,api,admin,platform-api,tenant-api,app,static,assets,health,cdn,media,dashboard
```

`TENANT_API_BASE_URL_TEMPLATE` must contain `{slug}`. If it does not, the
storefront answers a configuration error instead of guessing a tenant.

The app also recognises these legacy single-tenant names for local development:
`TENANT_API_BASE_URL` / `NEXT_PUBLIC_TENANT_API_BASE_URL`. Do not set them in
this deployment; they would defeat the per-request resolution.

## DNS

Both wildcards must point at the VPS:

- `*.nawyorders.com` → `173.212.246.222`
- `*.api.nawyorders.com` → `173.212.246.222`

The API wildcard already existed. The storefront wildcard is what Caddy uses for
on-demand certificates.

## Caddy

The existing Caddyfile lives at `/opt/genmarka/Caddyfile`. Back it up before
editing, then extend the on-demand TLS ask endpoint and add the storefront block.

```bash
cp -a /opt/genmarka/Caddyfile /opt/genmarka/Caddyfile.bak.$(date +%Y%m%d%H%M%S)
```

The ask endpoint must allow both the storefront and API wildcards. Change the
expression from `.endsWith(".api.nawyorders.com")` to:

```caddyfile
@allowed expression {http.request.uri.query}.endsWith(".nawyorders.com")
```

Add the storefront block; leave the existing `*.api.nawyorders.com` block alone:

```caddyfile
*.nawyorders.com {
	tls {
		on_demand
	}

	encode zstd gzip

	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "strict-origin-when-cross-origin"
		X-Frame-Options "SAMEORIGIN"
		-Server
	}

	reverse_proxy nawyorders-tenant-web:3000 {
		header_up Host {host}
		header_up X-Forwarded-Host {host}
		header_up X-Forwarded-Proto {scheme}
	}
}
```

Validate and reload without recreating the shared proxy:

```bash
docker exec genmarka-caddy-1 caddy validate --config /etc/caddy/Caddyfile
docker exec genmarka-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

If validation fails, restore the backup before reloading. The API wildcard must
keep working throughout.

## Manual deployment

```bash
ssh root@173.212.246.222
mkdir -p /opt/nawyorders/tenant-web
# copy the repository to /opt/nawyorders/tenant-web
cd /opt/nawyorders/tenant-web
cp .env.tenant-web.example .env.tenant-web
# edit .env.tenant-web if needed
IMAGE_TAG=manual-$(date +%Y%m%d%H%M%S) bash deploy/tenant-web.sh
```

The script builds the image on the VPS, starts the container, waits for the
health check, and rolls back to the previously running image if the new one
does not become healthy.

Useful commands:

```bash
cd /opt/nawyorders/tenant-web
docker compose -f docker-compose.tenant-web.yml ps
docker logs --tail 100 nawyorders-tenant-web
docker inspect nawyorders-tenant-web --format '{{.State.Health.Status}}'
```

## Continuous deployment

`.github/workflows/deploy-production.yml` runs on every push to `production`
(including a merged pull request) and can also be started manually.

1. `verify` runs `npm ci`, `npm test` and `npm run build` on the GitHub runner.
2. `deploy` syncs the source to `/opt/nawyorders/tenant-web` without touching
   `.env.tenant-web`, then runs `deploy/tenant-web.sh` with `IMAGE_TAG` set to
   the commit SHA.

Repository secrets required:

- `VPS_HOST` — `173.212.246.222`
- `VPS_SSH_USER` — `root`
- `VPS_SSH_PASSWORD` — the VPS root password

The deploy job refuses to run if `.env.tenant-web` is missing on the VPS.

## Verification

Replace the slug with a real tenant id from the platform:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' \
  -H 'Host: el-fahm-01a1c1ed11cf79ffbe51681899bb90fd.nawyorders.com' \
  https://el-fahm-01a1c1ed11cf79ffbe51681899bb90fd.nawyorders.com/
```

Expected:

- A real tenant: `200`, and the HTML contains the tenant's branding name.
- A reserved label such as `www` or `api`: `404` with the friendly page.
- An unknown but valid slug: `404` with the friendly page, before React starts.
- `https://{slug}.api.nawyorders.com` still answers normally.

The middleware calls `GET /api/v1/branding` for document requests so it can
answer a real 404 before Next starts streaming. The same payload is forwarded to
the server render, so the page does not fetch it twice.

## Rollback

`deploy/tenant-web.sh` automatically rolls back when the new container does not
become healthy. To roll back manually, start the previous image tag:

```bash
cd /opt/nawyorders/tenant-web
IMAGE_TAG=<previous-sha> docker compose -f docker-compose.tenant-web.yml up -d
```

Caddy does not need to change for an application rollback.
