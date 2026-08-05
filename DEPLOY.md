# Skyview — Production Deployment (Docker)

Deploys the API (NestJS + Prisma) and the web app (Next.js standalone) as two
containers, against a managed PostgreSQL (Neon recommended). See
`docs/09-production-readiness.md` for the wider checklist.

## 0. Prerequisites

- A host with Docker + Docker Compose.
- A production PostgreSQL database (Neon) and its connection string.
- Two DNS records pointing at the host, ideally **subdomains of one domain**:
  - `app.skyview.example.com` → web (port 3000)
  - `api.skyview.example.com` → API (port 5000)
- TLS in front of both (a reverse proxy like Caddy/Nginx/Traefik, or the
  platform's built-in TLS). Cookies are `Secure` in production.

> **Cookie note:** the session cookie is `SameSite=Strict`. That works when web
> and API share a registrable domain (the `app.`/`api.` subdomains above). If
> you must use two *unrelated* domains, change the cookie to
> `sameSite: "none"` in `api/src/modules/auth/auth.config.ts` (and keep
> `Secure`) — otherwise the browser won't send the session cross-site.

## 1. Configure environment

```bash
cp api/.env.production.example api/.env
# edit api/.env:
#   DATABASE_URL            → Neon POOLED url
#   BETTER_AUTH_SECRET      → openssl rand -base64 48
#   BETTER_AUTH_URL         → https://api.skyview.example.com
#   BETTER_AUTH_TRUSTED_ORIGINS → https://app.skyview.example.com
#   SEED_ADMIN_*            → real first-admin credentials
```

The web app's API URL is baked at build time. Export it for compose:

```bash
export NEXT_PUBLIC_API_URL=https://api.skyview.example.com
```

## 2. Build the images

```bash
docker compose build
```

## 3. Apply migrations (one-time per release)

Run against the prod DB. If the pooled URL rejects DDL, temporarily point
`DATABASE_URL` at Neon's **direct** URL for this step.

```bash
docker compose run --rm api pnpm prisma:migrate:deploy
```

## 4. Seed the organization + first admin (one-time)

```bash
docker compose run --rm api pnpm seed:org
docker compose run --rm api pnpm seed:admin
```

The admin then logs in and creates branches, vendors, categories, staff, etc.
(Run `pnpm seed:full` instead if you also want the demo branches/vendors.)

## 5. Start

```bash
docker compose up -d
```

- Web: `https://app.skyview.example.com`
- API health: `https://api.skyview.example.com/api/health`

## 6. Smoke-test the live deployment

From a machine with the repo:

```bash
cd api
SMOKE_BASE_URL=https://api.skyview.example.com \
SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... \
pnpm smoke
```

(The smoke admin/manager credentials default to the seed values; override via
env if you changed them. The destructive payroll path stays off unless
`SMOKE_PAYROLL_RUN=1`.)

## 7. Updates / redeploys

```bash
git pull
docker compose build
docker compose run --rm api pnpm prisma:migrate:deploy   # if schema changed
docker compose up -d
```

## Notes

- **Backups:** enable Neon PITR/backups.
- **Rollback:** keep the previous image tag; `docker compose up -d` with it.
- **Logs:** `docker compose logs -f api web`.
- **Secrets:** never commit `.env`; inject via your host's secret manager if
  available.
- **Scaling:** the API is stateless (sessions live in Postgres), so it can run
  multiple replicas behind the proxy.
