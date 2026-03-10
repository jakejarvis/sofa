# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Root commands (via Turborepo)
bun run dev              # Start API server + Vite dev server
bun run build            # Production build (both apps)
bun run lint             # Biome lint check
bun run format           # Biome format (auto-fix)
bun run check-types      # TypeScript type check
bun run test             # Run tests

# Database commands (run from packages/db/)
cd packages/db && bun run db:push       # Push schema changes to SQLite database
cd packages/db && bun run db:generate   # Generate Drizzle migration files
cd packages/db && bun run db:migrate    # Run Drizzle migrations
cd packages/db && bun run db:studio     # Open Drizzle Studio (visual DB browser)
```

IMPORTANT: Default to using Bun instead of Node.js:

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

For more information, read the Bun API docs in node_modules/bun-types/docs/**.mdx.

## Pre-commit checks

Before committing, all three of these must pass with zero warnings or errors:

```bash
bun run lint
bun run check-types
bun run test
```

## Architecture

**Sofa** is a self-hosted movie & TV tracking app (like Trakt/TVTime) built as a Turborepo monorepo with a standalone Hono API server, a Vite + TanStack Router SPA frontend, and shared packages.

### Monorepo structure

```
couch-potato/
├── apps/
│   ├── server/        # @sofa/server — Hono API server (oRPC, auth, cron, webhooks)
│   └── web/           # @sofa/web — Vite SPA (TanStack Router, TanStack Query)
├── packages/
│   ├── api/           # @sofa/api — oRPC contract + Zod schemas (shared)
│   ├── auth/          # @sofa/auth — Better Auth server config
│   ├── core/          # @sofa/core — Business logic services
│   ├── db/            # @sofa/db — Database client, schema, migrations, constants, logger
│   └── tmdb/          # @sofa/tmdb — TMDB API client + image URL helper
├── turbo.json         # Turborepo task configuration
├── biome.json         # Shared Biome config
├── Dockerfile         # Multi-stage Docker build (turbo prune, single process)
└── package.json       # Root workspace config
```

- **`@sofa/server`** (`apps/server/`) — Hono API server. Hosts oRPC procedures, Better Auth, webhook/image/backup routes, and cron jobs. Runs DB migrations on startup. In production, also serves the SPA static files on port 3000. In dev, runs on port 3001.
- **`@sofa/web`** (`apps/web/`) — Vite SPA with TanStack Router (file-based routing). No SSR, no DB access, no services. All data fetched via oRPC client calls. Vite dev server proxies `/api/*` and `/rpc/*` to the API server.
- **`@sofa/api`** (`packages/api/`) — JIT package with the oRPC contract and Zod schemas. No build step.
- **`@sofa/db`** (`packages/db/`) — Database layer: Drizzle schema, client, migrations, constants, logger.
- **`@sofa/tmdb`** (`packages/tmdb/`) — TMDB API client (openapi-fetch) and image URL construction.
- **`@sofa/core`** (`packages/core/`) — All business logic services (metadata, tracking, discovery, etc.).
- **`@sofa/auth`** (`packages/auth/`) — Better Auth server config + environment checks.

All shared packages are JIT (raw TypeScript exports, no build step). Consumers transpile via their own bundlers.

### Stack

- **Frontend**: Vite 7 SPA, React 19, TypeScript, TanStack Router (file-based routing)
- **API Server**: Hono (standalone Bun server)
- **Monorepo**: Turborepo with Bun workspaces
- **Database**: SQLite via bun:sqlite + Drizzle ORM (WAL mode, singleton via `globalThis`, sync queries, auto-migrations on startup)
- **Auth**: Better Auth with Drizzle adapter — email/password + optional OIDC/SSO via `genericOAuth` plugin
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite`), shadcn components, dark cinema theme with warm primary accents
- **Fonts**: DM Serif Display (display), DM Sans (body), Geist Mono (mono) — self-hosted via `@fontsource`
- **API**: oRPC (contract-first, type-safe RPC) with `@orpc/tanstack-query` for TanStack Query integration
- **State**: Jotai (client), TanStack Query (data fetching & mutations via oRPC)
- **Linting**: Biome (2-space indent, organized imports, React recommended rules)
- **External API**: TMDB (The Movie Database) with Bearer token auth

### Package imports

Within `apps/web/`, `@/*` maps to `apps/web/src/`, e.g. `@/components/nav-bar` → `apps/web/src/components/nav-bar`.

Cross-package imports use the package name:
- `@sofa/api/contract`, `@sofa/api/schemas` — Contract and types
- `@sofa/db/client`, `@sofa/db/schema`, `@sofa/db/constants`, `@sofa/db/logger` — Database layer
- `@sofa/tmdb/client`, `@sofa/tmdb/image` — TMDB client
- `@sofa/core/metadata`, `@sofa/core/tracking`, etc. — Business logic
- `@sofa/auth/server`, `@sofa/auth/config` — Auth config

### Key directories

**API server** (`apps/server/src/`):
- `index.ts` — Hono app entry point, startup, CORS, route mounting, graceful shutdown
- `cron.ts` — Background job scheduler (croner)
- `orpc/` — oRPC server layer (context, middleware, router, handler, procedures/)
- `routes/` — Non-RPC Hono routes (auth, images, avatars, backups, webhooks, lists, health)

**Web app** (`apps/web/src/`):
- `main.tsx` — React root: creates router + renders `<RouterProvider />`
- `routes/` — TanStack Router file-based routes (auto-generates `routeTree.gen.ts`)
  - `__root.tsx` — Root layout (providers, head meta, global error/not-found)
  - `_app.tsx` — Authenticated layout (auth guard via `beforeLoad`, navbar, shell)
  - `_app/dashboard.tsx`, `_app/explore.tsx`, `_app/settings.tsx`, `_app/titles.$id.tsx`, `_app/people.$id.tsx`
  - `_auth.tsx` — Auth layout (centering wrapper)
  - `_auth/login.tsx`, `_auth/register.tsx`
  - `index.tsx`, `setup.tsx`
- `components/` — App components + `components/ui/` for shadcn primitives
- `lib/orpc/client.ts` — oRPC client (always same-origin via Vite proxy or Hono static serving)
- `lib/orpc/tanstack.ts` — `orpc` utils for TanStack Query
- `lib/auth/client.ts` — Better Auth client hooks
- `lib/theme.ts` — Color theme CSS properties from title palettes
- `styles/globals.css` — Tailwind + font imports

**Shared packages**:
- `packages/api/src/contract.ts` — Full oRPC API contract definition (~30 procedures)
- `packages/api/src/schemas.ts` — Shared Zod schemas and inferred TypeScript types
- `packages/db/src/schema.ts` — All Drizzle table definitions
- `packages/db/drizzle/` — Migration files
- `packages/core/src/` — All service files (metadata, tracking, discovery, availability, credits, person, webhooks, backup, settings, colors, update-check, system-health, lists, image-cache)
- `packages/core/test/` — Service tests with in-memory SQLite

### Auth pattern

**Web app** — Route `beforeLoad` guards check session via Better Auth client SDK:

```typescript
// In route file (e.g. _app.tsx)
beforeLoad: async () => {
  const { data: session } = await authClient.getSession();
  if (!session) throw redirect({ to: "/login" });
  return { session };
},
```

Session is available to child routes via `Route.useRouteContext()`.

**API server** — oRPC procedures use auth middleware that calls Better Auth:

```typescript
// apps/server/src/orpc/middleware.ts
export const authed = base.middleware(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });
  if (!session) throw new ORPCError("UNAUTHORIZED");
  return next({ context: { user: session.user, session: session.session } });
});
```

### oRPC API layer

All API procedures use oRPC with a contract-first approach. The contract is defined in `packages/api/src/contract.ts`, procedures implement it in `apps/server/src/orpc/procedures/`, and the client consumes it with full type safety.

**Pattern — importing types from the shared package:**
```typescript
import type { ResolvedTitle, Season } from "@sofa/api/schemas";
import { contract } from "@sofa/api/contract";
```

**Pattern — query in component:**
```typescript
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc/client";

const { data } = useQuery(orpc.dashboard.stats.queryOptions());
```

**Pattern — mutation:**
```typescript
import { client } from "@/lib/orpc/client";

await client.titles.updateStatus({ id: titleId, status: "in_progress" });
```

**Pattern — route loader with TanStack Query prefetch:**
```typescript
export const Route = createFileRoute("/_app/titles/$id")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(
      orpc.titles.detail.queryOptions({ input: { id: params.id } }),
    );
  },
  component: TitlePage,
});
```

**Page patterns:**
- **Route loaders** (titles, people): `beforeLoad`/`loader` prefetch data into TanStack Query cache via `queryClient.ensureQueryData()`. Components read via `useQuery()`/`useSuspenseQuery()`.
- **Full client-side** (dashboard, explore, settings): Components fetch all data via `orpc.*.queryOptions()` with skeleton loading states.
- **Error/loading states**: Routes use `pendingComponent`, `errorComponent`, `notFoundComponent`.

### Non-RPC routes (API server)

Hono route handlers in `apps/server/src/routes/`:
- `/images/:category/:filename` — Image proxy/cache serving
- `/api/auth/*` — Better Auth catch-all
- `/api/avatars/:userId` — Avatar file serving
- `/api/backup/:filename` — Backup file download
- `/api/webhooks/:token` — Plex/Jellyfin/Emby webhooks
- `/api/lists/:token` — External list feeds (Sonarr/Radarr)
- `/api/health` — Simple health check (no auth)

In dev, Vite proxies these to the API server. In production, Hono serves both API and SPA — the browser only sees port 3000.

### Database schema

All app tables use UUIDv7 text primary keys generated via `Bun.randomUUIDv7()`. Better Auth tables use their own ID format. Key relationships:

- `titles` → `seasons` → `episodes` (TV hierarchy)
- `persons` + `titleCast` (cast/crew linked to titles)
- `userTitleStatus` links users to titles with status (watchlist/in_progress/completed)
- `userMovieWatches` / `userEpisodeWatches` track watch history (source: manual/import/plex/jellyfin/emby)
- `userRatings` stores 1-5 star ratings
- `availabilityOffers` caches streaming provider data per title
- `titleRecommendations` stores TMDB recommendations and similar titles
- `webhookConnections` / `webhookEventLog` — Plex/Jellyfin/Emby webhook integrations
- `cronRuns` — Background job execution history
- `appSettings` — Key-value store for runtime app configuration

### Service layer (`packages/core/src/`)

- **metadata.ts**: `importTitle()` fetches from TMDB, inserts into DB, fire-and-forgets availability + recommendations + credits + image caching. `refreshTvChildren()` fetches all seasons/episodes with 250ms rate limiting.
- **image-cache.ts**: Downloads and caches TMDB images to local disk.
- **tracking.ts**: Auto-transitions — logging a movie watch sets status to `completed`; logging an episode watch sets `in_progress`; all episodes watched auto-completes the series.
- **discovery.ts**: Feed generators — continue watching, library with availability, personalized recommendations.
- **availability.ts**: Caches US streaming providers from TMDB watch/providers endpoint.
- **credits.ts**: Fetches and caches cast/crew data from TMDB.
- **person.ts**: Person detail and filmography lookups.
- **webhooks.ts**: Processes incoming Plex/Jellyfin/Emby webhook events.
- **backup.ts**: Database backup/restore with configurable scheduled backups.
- **settings.ts**: Runtime app settings via `appSettings` table.
- **colors.ts**: Extracts dominant color palettes from title posters via node-vibrant.
- **update-check.ts**: Checks for new Sofa releases.
- **system-health.ts**: System health diagnostics.

### TMDB images

Only paths are stored in DB. Image URLs are resolved by the API server — `tmdbImageUrl()` from `@sofa/tmdb/image` is called before sending data to clients. Client components receive ready-to-use URLs.

When `IMAGE_CACHE_ENABLED` is set (default), images are downloaded to local disk and served via `/images/:category/:filename`. When disabled, `tmdbImageUrl()` returns direct TMDB CDN URLs.

### Background jobs

Defined in `apps/server/src/cron.ts` using croner, started when the API server boots. Jobs (all use `protect: true` to prevent overlapping runs, 300ms delay between TMDB calls):
- `nightlyRefreshLibrary` (`0 3 * * *`) — refreshes stale library titles (7d) and non-library titles (30d)
- `refreshAvailability` (`0 */6 * * *`) — streaming provider data
- `refreshRecommendations` (`0 */12 * * *`)
- `refreshTvChildren` (`30 */12 * * *`) — episodes for returning/in-production TV shows
- `cacheImages` (`0 1,13 * * *`) — posters, backdrops, stills, logos, profile photos
- `refreshCredits` (`0 2 * * *`) — cast/crew data for library titles
- `scheduledBackup` (configurable via settings) — database backups with retention pruning
- `updateCheck` (`0 */6 * * *`) — checks for new Sofa releases

### Environment variables

`DATA_DIR` (root for DB + cache, default `./data`), `TMDB_API_READ_ACCESS_TOKEN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. `DATABASE_URL` and `CACHE_DIR` are derived from `DATA_DIR` but can be overridden individually.

Optional: `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_ISSUER_URL`, `OIDC_PROVIDER_NAME`, `OIDC_AUTO_REGISTER`, `DISABLE_PASSWORD_LOGIN` (OIDC/SSO support). `LOG_LEVEL` (error/warn/info/debug, default: info). `IMAGE_CACHE_ENABLED` (default: true).

### Docker deployment

Single container, single process. Hono serves both the API and the Vite-built SPA static files on port 3000. API routes (`/rpc/*`, `/api/*`) are mounted first; unmatched routes fall back to `index.html` for SPA routing.

## Browser Automation

Use `agent-browser` for web automation. Run `agent-browser --help` for all commands.

Core workflow:
1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes

When encountering auth, use `demo@sofa.watch` for the username/email and `password` for the password.
