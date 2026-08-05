# Skyview — Production Deployment (PM2, single domain)

Deploys the API (NestJS + Prisma) and the web app (Next.js) as two PM2
processes behind one nginx vhost, on one domain — the API lives at
`/api/*`, everything else goes to the web app. Postgres is a local instance
on the same VPS. See `docs/09-production-readiness.md` for the wider
checklist.

This replaces an earlier Docker/subdomain design; the `Dockerfile`s and
`docker-compose.yml` that used to live here were dropped since this VPS
runs everything the same way as the other apps on it (PM2 + nginx, no
Docker installed).

## 0. Prerequisites (all already true on this VPS)

- Node 20, pnpm, PM2, nginx, certbot installed.
- A DNS A record for the domain pointing at the VPS.
- A local Postgres instance (`127.0.0.1:5432`).

## 1. One-time privileged setup (DB, nginx, TLS)

Everything that needs root is bundled into one script — review it, then run:

```bash
sudo bash deploy/sudo-setup.sh
```

This (idempotent, safe to re-run):
1. Creates the `skyview` Postgres role + database (`deploy/db-setup.sql`).
2. Installs `deploy/nginx-tapiocataste.conf` to
   `/etc/nginx/sites-available/tapiocataste` and enables it —
   `/api/*` → `127.0.0.1:5000` (API), everything else → `127.0.0.1:3002` (web).
3. Requests a Let's Encrypt cert via `certbot --nginx` (auto-renews).

## 2. Configure environment

```bash
cp api/.env.production.example api/.env
# edit api/.env — DATABASE_URL, BETTER_AUTH_SECRET (openssl rand -base64 48),
# BETTER_AUTH_URL, BETTER_AUTH_TRUSTED_ORIGINS, SEED_ADMIN_*
```

```bash
cat > web/.env.production <<'EOF'
NEXT_PUBLIC_API_URL=https://tapiocataste.com
EOF
```

> **The #1 footgun here: both of these must be the bare origin, no `/api`
> path.** `BETTER_AUTH_URL` and `NEXT_PUBLIC_API_URL` are combined with
> better-auth's `basePath` (`/api/auth`, set in `api/src/modules/auth/auth.config.ts`)
> and with each caller's own leading `/api/...` in `web/service/*` — both
> already add the `/api` segment themselves. Set either of these to
> `https://tapiocataste.com/api` instead of `https://tapiocataste.com` and:
> the browser starts calling `/api/sign-in/email` instead of
> `/api/auth/sign-in/email` (404), **and** better-auth's server strips the
> wrong prefix off incoming requests and 404s on every one of its own
> routes too — even hit directly on `127.0.0.1:5000`, no nginx involved.
> Ask me how I know.

`NEXT_PUBLIC_API_URL` is baked in at **build time**, not read at runtime —
changing it requires a rebuild (step 4), not just a restart.

## 3. Apply migrations (one-time per release)

```bash
cd api
pnpm prisma:migrate:deploy
```

## 4. Build

```bash
cd api && pnpm install --frozen-lockfile && pnpm prisma:generate && pnpm build
cd ../web && pnpm install --frozen-lockfile && pnpm build
```

## 5. Seed the organization + first admin (one-time)

```bash
cd api
pnpm seed:org
pnpm seed:admin
```

The admin then logs in and creates branches, vendors, categories, staff, etc.
(Run `pnpm seed:full` instead if you also want the demo branches/vendors.)

## 6. Start

```bash
pm2 start ecosystem.config.js
pm2 save
```

- Web: `https://tapiocataste.com`
- API health: `https://tapiocataste.com/api/health`

## 7. Smoke-test the live deployment

```bash
cd api
SMOKE_BASE_URL=https://tapiocataste.com/api \
SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... \
pnpm smoke
```

(The smoke admin/manager credentials default to the seed values; override via
env if you changed them. The destructive payroll path stays off unless
`SMOKE_PAYROLL_RUN=1`.)

## 8. Updates / redeploys

```bash
git pull
cd api && pnpm install --frozen-lockfile && pnpm prisma:generate && pnpm build
pnpm prisma:migrate:deploy   # if schema changed
cd ../web && pnpm install --frozen-lockfile && pnpm build   # rebuild if anything changed, always if NEXT_PUBLIC_* changed
pm2 restart skyview-api skyview-web
```

## Notes

- **Ports:** API on `5000`, web on `3002` — chosen to avoid the other apps
  already running on this VPS (`inventory` on 3000/4000, `fonex` on 3001/8000).
  Both are only bound to `127.0.0.1`; nginx is the only public entry point.
- **Backups:** local Postgres — set up `pg_dump` on a cron, or move to a
  managed provider (Neon, RDS, etc.) later if you want off-box backups/PITR.
- **Rollback:** `git checkout <previous-sha>`, rebuild, `pm2 restart`.
- **Logs:** `pm2 logs skyview-api skyview-web`.
- **Secrets:** never commit `.env` / `.env.production`; both are gitignored.
- **Boot persistence:** PM2 isn't currently registered as a systemd service
  on this VPS (true for `fonex` and `inventory` too) — a reboot won't bring
  any of them back automatically. Fix once for all apps with
  `pm2 startup systemd -u deploy --hp /home/deploy` (as root) then `pm2 save`.
- **Scaling:** the API is stateless (sessions live in Postgres), so
  `instances` in `ecosystem.config.js` can go above 1 if needed.
