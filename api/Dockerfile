# Skyview API — NestJS + Prisma. Multi-stage build.
# Build:  docker build -t skyview-api ./api
# Run:    docker run --env-file api/.env -p 5000:5000 skyview-api

FROM node:20-alpine AS base
# Prisma needs OpenSSL on Alpine.
RUN apk add --no-cache openssl
RUN corepack enable
WORKDIR /app

# ---- deps + build ----
FROM base AS builder
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm prisma:generate
RUN pnpm build

# ---- runtime ----
FROM base AS runner
ENV NODE_ENV=production
# Full node_modules are kept so `prisma migrate deploy` and the seed scripts
# (ts-node) can run inside the container for release/one-off tasks.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json

EXPOSE 5000
# Migrations are applied as a release step (see DEPLOY.md), not on boot.
CMD ["node", "dist/main.js"]
