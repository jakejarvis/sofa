# CLAUDE.md

## Commands

```bash
# Root commands (via Turborepo)
bun run dev              # Start API, Vite dev, and Expo dev servers
bun run dev:docs         # Start the fumadocs/Next.js dev server
bun run build            # Production build (both apps)
bun run lint             # Oxlint lint check
bun run format           # Oxfmt format (auto-fix)
bun run check-types      # TypeScript type check
bun run test             # Run tests
bun run generate:openapi # Regenerate OpenAPI spec + docs API pages (run after contract/schema changes)
bun run i18n:extract     # Run LingUI's string extraction
bun run i18n:compile     # Run LingUI's typescript compilation
bun run i18n:claude      # Prompt Claude Code to fill in untranslated strings

# Database commands (run from packages/db/)
cd packages/db && bun run db:push       # Push schema changes to SQLite database
cd packages/db && bun run db:generate   # Generate Drizzle migration files
cd packages/db && bun run db:migrate    # Run Drizzle migrations
cd packages/db && bun run db:studio     # Open Drizzle Studio (visual DB browser)
```

**Use Bun, not Node.js** — `bun <file>`, `bun test`, `bun install`, `bun run <script>`, `bunx <pkg>`. Bun auto-loads `.env`.

## CRITICAL: Pre-commit checks

Before declaring a task is complete, all four commands MUST pass with zero errors or warnings:

```bash
bun run lint
bun run format:check
bun run check-types
bun test
```

## Architecture

**Sofa** is a self-hosted movie & TV tracking app built as a Turborepo monorepo.

```
couch-potato/
├── apps/
│   ├── native/        # @sofa/native — Expo 55 React Native app (Expo Router, UniWind)
│   ├── public-api/    # @sofa/public-api — Hono microservice on Vercel (version check, telemetry)
│   ├── server/        # @sofa/server — Hono API server (oRPC, auth, cron, webhooks)
│   └── web/           # @sofa/web — Vite SPA (TanStack Router, TanStack Query)
├── docs/              # sofa-docs — Fumadocs (Next.js) documentation site + OpenAPI reference
├── packages/
│   ├── api/           # @sofa/api — oRPC contract + Zod schemas (shared, JIT)
│   ├── auth/          # @sofa/auth — Better Auth server config (JIT)
│   ├── config/        # @sofa/config — Path constants + TMDB URLs from env (JIT)
│   ├── core/          # @sofa/core — Business logic services (JIT, DB-agnostic)
│   ├── db/            # @sofa/db — Drizzle schema, client, queries, migrations (JIT)
│   ├── logger/        # @sofa/logger — Pino-based structured logging (JIT)
│   └── tmdb/          # @sofa/tmdb — TMDB API client + image URL helper (JIT)
├── .oxlintrc.json
├── .oxfmtrc.json
├── Dockerfile
├── package.json
└── turbo.json
```

All shared packages are JIT (raw TypeScript exports, no build step).

### Apps

- **`@sofa/server`** — Hono API server. Hosts oRPC procedures, Better Auth, webhook/image/backup routes, and cron jobs. Runs DB migrations on startup. Dev: port 3001. Prod: serves SPA static files too, port 3000.
- **`@sofa/web`** — Vite SPA with TanStack Router (file-based routing). No SSR, no DB. All data via oRPC. Vite dev server proxies `/api/*` and `/rpc/*` to the API server.
- **`@sofa/native`** — Expo Router app with 4-tab layout (Home, Explore, Search, Settings). UniWind for styling, `@better-auth/expo` with SecureStore for auth, oRPC client for API calls. Dark-only cinema theme matching web.
- **`@sofa/public-api`** — Minimal Hono microservice deployed on Vercel. Endpoints: `GET /v1/version` (latest release from GitHub), `POST /v1/telemetry` (forwards instance stats to PostHog), and OAuth device-code proxy for Trakt/Simkl imports (`/v1/import/:provider/device-code`, `/v1/import/:provider/poll`). Dev: port 3002.
- **`sofa-docs`** — Fumadocs site (Next.js) with landing page, Markdown docs, and auto-generated OpenAPI API reference. Content lives in `docs/content/docs/`. API docs are generated from `docs/openapi.json` via `fumadocs-openapi`.

### Stack

- **Frontend**: Vite 7 SPA, React 19, TanStack Router (file-based), Tailwind CSS v4, shadcn, Jotai
- **Mobile**: Expo 55, Expo Router, UniWind (Tailwind for RN), `@tabler/icons-react-native`
- **API**: Hono on Bun, oRPC (contract-first) with `@orpc/tanstack-query`
- **Database**: SQLite via `bun:sqlite` + Drizzle ORM (WAL mode, sync queries, auto-migrations)
- **Auth**: Better Auth with Drizzle adapter — email/password + optional OIDC/SSO
- **Monorepo**: Turborepo with Bun workspaces
- **Docs**: Fumadocs (Next.js), fumadocs-openapi for API reference
- **Linting**: Oxlint + Oxfmt (2-space indent, organized imports, Tailwind class sorting)
- **External API**: TMDB (The Movie Database)
- **Translation**: LingUI + Crowdin

### Package imports

Path aliases: `@/*` maps to `src/` in both `apps/web/` and `apps/native/`.

Cross-package imports:

- `@sofa/api/contract`, `@sofa/api/schemas` — Contract and Zod types
- `@sofa/db/queries/*` — Query layer (e.g., `@sofa/db/queries/tracking`, `@sofa/db/queries/metadata`)
- `@sofa/db/client`, `@sofa/db/schema`, `@sofa/db/migrate`, `@sofa/db/test-utils`
- `@sofa/tmdb/client`, `@sofa/tmdb/image`
- `@sofa/core/metadata`, `@sofa/core/tracking`, `@sofa/core/imports`, etc.
- `@sofa/auth/server`, `@sofa/auth/config`
- `@sofa/config` — Path constants (`DATA_DIR`, `DATABASE_URL`, `CACHE_DIR`, `BACKUP_DIR`, `AVATAR_DIR`) and TMDB URLs
- `@sofa/logger` — `createLogger(name)` for structured logging

### Key patterns

**Layered architecture** — Strict separation: `apps/server/ → @sofa/core/* → @sofa/db/queries/* → @sofa/db/client`. Server procedures/routes call core services for all business logic. Core services call query functions for all DB access. Core must **never** import `@sofa/db/client` directly. Type-only imports from `@sofa/db/schema` are allowed in core (for `$inferInsert`/`$inferSelect`), but runtime imports are not.

**Query layer** — All Drizzle ORM queries live in `packages/db/src/queries/`, organized by domain (tracking, metadata, discovery, etc.). Plain exported functions, transactions hidden as implementation details. Wildcard export: `"./queries/*": "./src/queries/*.ts"`.

**oRPC queries** use `orpc.*.queryOptions()` with TanStack Query. **Mutations** use `client.*()` directly. **Route loaders** prefetch via `queryClient.ensureQueryData()`.

**Auth guards** — Web routes use `beforeLoad` + `authClient.getSession()`. API procedures use auth middleware that calls `auth.api.getSession()`.

**TMDB images** — Only paths stored in DB. The API server resolves full URLs via `tmdbImageUrl()`. When `IMAGE_CACHE_ENABLED` (default), images are downloaded to disk and served via `/images/:category/:filename`.

**Database IDs** — All app tables use UUIDv7 text PKs via `Bun.randomUUIDv7()`.

**i18n (LingUI)** — All user-facing strings are wrapped with LingUI macros. The `@sofa/i18n` shared package holds the i18n singleton, locale metadata, and `Intl`-based format utilities. Config lives at the repo root (`lingui.config.ts`). PO catalogs and compiled TS files live in `packages/i18n/src/po/`. Crowdin syncs via `crowdin.yml` with `languages_mapping` to map regional codes (es-ES→es, pt-PT→pt).

- **JSX text** → `<Trans>` from `@lingui/react/macro`
- **Strings in hooks/components** → `const { t } = useLingui()` from `@lingui/react/macro`, then `` t`string` ``
- **Strings outside React** (plain modules) → `import { msg } from "@lingui/core/macro"` + `import { i18n } from "@sofa/i18n"`, then `` i18n._(msg`string`) ``
- **Pluralization** → `import { plural } from "@lingui/core/macro"`, use inside `t`: `` t`${plural(count, { one: "# item", other: "# items" })}` ``
- **DO NOT use** `t(i18n)` — it's deprecated in v5 and removed in v6. Use `i18n._(msg`...`)` instead.
- **Date/number formatting** → use `formatDate`, `formatRelativeTime`, `formatNumber`, `formatBytes` from `@sofa/i18n/format` (Intl-based, locale-aware). Never use `date-fns` in app code.
- **Native Intl polyfills** → `@formatjs/intl-*` polyfills loaded in `apps/native/src/lib/intl-polyfills.ts` (strict dependency order, with locale data for all 6 languages).
- **Error messages** → Server throws `ORPCError` with `data: { code: AppErrorCode.XXX }`. Clients map codes to localized strings via per-app `error-messages.ts`. Never display `error.message` to users.
- After adding/changing strings, run `bun run i18n:extract` then `bun run i18n:compile`.

### Environment variables

Required: `TMDB_API_READ_ACCESS_TOKEN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

Optional:

- `DATA_DIR` — Root for DB + cache (default `./data`). `DATABASE_URL` and `CACHE_DIR` derived from it but overridable.
- `TMDB_API_BASE_URL`, `TMDB_IMAGE_BASE_URL` — Override TMDB endpoints.
- `PUBLIC_API_URL` — Base URL for centralized public API (default: `https://public-api.sofa.watch`). Used for update checks and OAuth import proxy.
- `IMAGE_CACHE_ENABLED` — Default `true`. Set `false` for direct TMDB CDN URLs.
- `LOG_LEVEL` — `error`/`warn`/`info`/`debug` (default: `info`).
- OIDC: `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_ISSUER_URL`, `OIDC_PROVIDER_NAME`, `OIDC_AUTO_REGISTER`, `DISABLE_PASSWORD_LOGIN`.

### Testing

Tests live in `packages/core/test/`. `preload.ts` mocks `@sofa/db/client` with in-memory SQLite. Never mock a service module with stubs — `bun`'s `mock.module` persists across test files.

### Docker

Single container, single process. Hono serves API + SPA on port 3000. API routes (`/rpc/*`, `/api/*`) mounted first; unmatched routes fall back to `index.html`.

## Browser Automation

Use `agent-browser` for web automation (`agent-browser --help` for all commands). Auth credentials: `demo@sofa.watch` / `password`.
