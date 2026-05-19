# syntax=docker/dockerfile:1.7
# Chinichi OS — production image
# Multi-stage build → final image ~150MB on alpine, ~250MB on debian-slim.
#
# Build:    docker build -t chinichi-os:latest .
# Run:      docker run -p 3000:3000 --env-file .env chinichi-os:latest

# ───── Stage 1: deps (full install with prisma generate) ─────
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# OpenSSL needed by Prisma at runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma

# postinstall runs `prisma generate` (see package.json)
RUN npm ci --no-audit --no-fund

# ───── Stage 2: builder ─────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ───── Stage 3: runner ─────
FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl tini ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user
RUN groupadd -r app && useradd -r -g app -d /app -s /sbin/nologin app

# Next standalone output already includes a minimal node_modules subset
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
# Prisma client + schema (needed at runtime by @prisma/client)
COPY --from=builder --chown=app:app /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=app:app /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=app:app /app/prisma ./prisma

USER app
EXPOSE 3000

# tini gives clean shutdown on SIGTERM (important behind Nginx / ECS)
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
