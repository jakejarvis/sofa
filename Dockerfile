# syntax=docker/dockerfile:1
FROM oven/bun:1-alpine AS base

# --- Prune workspace for Docker layer caching ---
FROM base AS prepare
WORKDIR /app
RUN bun add -g turbo@^2
COPY . .
RUN turbo prune @sofa/web @sofa/server --docker

# --- Install dependencies (cached by package.json + lockfile only) ---
FROM base AS deps
WORKDIR /app
COPY --from=prepare /app/out/json/ .
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --no-save --frozen-lockfile

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/ .
COPY --from=prepare /app/out/full/ .

ARG APP_VERSION
ARG GIT_COMMIT_SHA
ENV NODE_ENV=production
ENV APP_VERSION=${APP_VERSION}
ENV GIT_COMMIT_SHA=${GIT_COMMIT_SHA}
ENV NEXT_TELEMETRY_DISABLED=1

RUN bunx turbo run build --filter=@sofa/web --filter=@sofa/server

# --- Production runner ---
FROM base AS runner
WORKDIR /app

ARG APP_VERSION
ARG GIT_COMMIT_SHA
ENV NODE_ENV=production
ENV PORT=3000
ENV API_PORT=3001
ENV HOSTNAME=0.0.0.0
ENV DATA_DIR=/data
ENV INTERNAL_API_URL=http://localhost:3001
ENV APP_VERSION=${APP_VERSION}
ENV GIT_COMMIT_SHA=${GIT_COMMIT_SHA}
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone output preserves monorepo structure
COPY --from=builder --chown=bun:bun /app/apps/web/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=bun:bun /app/apps/web/public ./apps/web/public

# API server source + DB migrations
COPY --from=builder --chown=bun:bun /app/apps/server/ ./apps/server/
COPY --from=builder --chown=bun:bun /app/packages/db/drizzle ./packages/db/drizzle

COPY entrypoint.sh .
RUN mkdir -p /data && chown bun:bun /data

USER bun
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD ["bun", "-e", "fetch('http://localhost:3001/api/health').then(r => process.exit(+!r.ok)).catch(() => process.exit(1))"]

CMD ["sh", "entrypoint.sh"]
