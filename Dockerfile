# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG GIT_COMMIT_SHA
ENV NODE_ENV=production
ENV GIT_COMMIT_SHA=${GIT_COMMIT_SHA}
RUN pnpm build

# --- Runner ---
FROM node:24-alpine AS runner
RUN apk add --no-cache tini
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DATA_DIR=/data

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && mkdir -p /data \
    && chown -R nextjs:nodejs /data

COPY --from=builder --link --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --link --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --link --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --link --chown=nextjs:nodejs /app/drizzle ./drizzle

USER nextjs
EXPOSE 3000
VOLUME /data

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO /dev/null http://localhost:3000/api/health

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
