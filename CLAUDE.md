# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev              # Start Next.js dev server
bun run build            # Production build
bun run lint             # Biome lint check
bun run format           # Biome format (auto-fix)
bun run db:push          # Push schema changes to SQLite database
bun run db:generate      # Generate Drizzle migration files
bun run db:migrate       # Run Drizzle migrations
bun run db:studio        # Open Drizzle Studio (visual DB browser)
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

**Sofa** is a self-hosted movie & TV tracking app (like Trakt/TVTime) built as a single Next.js 16 application with SQLite.

### Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Database**: SQLite via bun:sqlite + Drizzle ORM (WAL mode, singleton via `globalThis`, sync queries, auto-migrations on startup)
- **Auth**: Better Auth with Drizzle adapter — email/password + optional OIDC/SSO via `genericOAuth` plugin
- **Styling**: Tailwind CSS v4, shadcn components, dark cinema theme with warm primary accents
- **Fonts**: DM Serif Display (display), DM Sans (body), Geist Mono (mono)
- **State**: Jotai (client), TanStack Query (data fetching & mutations)
- **Linting**: Biome (2-space indent, organized imports, React/Next.js recommended rules)
- **External API**: TMDB (The Movie Database) with Bearer token auth

### Path alias

`@/*` maps to project root (`./`), e.g. `@/lib/db/client` → `./lib/db/client`.

### Key directories

- `lib/db/schema.ts` — Single file with all Drizzle table definitions (auth tables + app tables)
- `lib/db/migrate.ts` — Auto-migration runner (executed on startup via instrumentation)
- `lib/services/` — Business logic layer (metadata, tracking, discovery, availability, credits, person, webhooks, backup, settings, colors, update-check, system-health)
- `lib/tmdb/` — TMDB API client and TypeScript types
- `lib/auth/` — Better Auth server config (`server.ts`), client hooks (`client.ts`), cached session helper (`session.ts`)
- `lib/config.ts` — Server-side environment checks (TMDB configured, OIDC configured, etc.)
- `lib/logger.ts` — Structured logger with `LOG_LEVEL` support
- `lib/types/` — Shared TypeScript types (e.g. `title.ts`)
- `lib/cron.ts` — Background job scheduler (croner, `globalThis` singleton)
- `lib/api-client.ts` — Thin fetch wrapper (`api<T>(path, options)`) used by all client-side query/mutation functions
- `lib/query-client.ts` — Singleton `QueryClient` with default options (30s stale time)
- `lib/queries/` — TanStack Query hooks organized by domain:
  - `titles.ts` — Title detail, user info, recommendations, status/rating/watch mutations
  - `people.ts` — Person detail, resolve person mutation
  - `dashboard.ts` — Dashboard stats, continue watching, library, recommendations
  - `explore.ts` — Trending, popular, genres
  - `integrations.ts` — User integrations CRUD
  - `admin.ts` — Backups, backup schedule, registration, update check
  - `account.ts` — Avatar upload/remove, name update
- `app/api/` — REST API routes (all auth-gated, JSON responses, Zod validation)
- `app/(pages)/` — Authenticated pages (dashboard, explore, titles/[id], people/[id], settings)
- `app/(auth)/` — Auth pages (login, register, setup)
- `components/` — App components + `components/ui/` for shadcn primitives
- `components/query-provider.tsx` — `QueryClientProvider` wrapper used in root layout

### Auth pattern

Server components and layouts use the cached session helper to avoid redundant lookups:

```typescript
import { getSession } from "@/lib/auth/session";
const session = await getSession();
```

Route handlers call Better Auth directly:

```typescript
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
const session = await auth.api.getSession({ headers: await headers() });
if (!session)
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// use session.user.id
```

### Client data fetching

All client-side data fetching uses TanStack Query via hooks in `lib/queries/`. The `api()` helper in `lib/api-client.ts` wraps `fetch()` with JSON handling and error extraction.

**Pattern — query hook:**
```typescript
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api<DashboardStats>("/dashboard/stats"),
  });
}
```

**Pattern — mutation hook with optimistic update:**
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars) => api(`/titles/${vars.titleId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: vars.status }),
    }),
    onSettled: (_d, _e, vars) => {
      queryClient.invalidateQueries({ queryKey: ["title-user-info", vars.titleId] });
    },
  });
}
```

**Page patterns:**
- **Thin server shell** (titles, people): Server component fetches initial data via service layer, passes as `initialData` prop to client component that uses TanStack Query for refetching/mutations. Fast first paint + client interactivity.
- **Full client-side** (dashboard, explore, settings): Server component handles auth only; client components fetch all data via TanStack Query hooks with skeleton loading states.

### API routes

All API routes live under `app/api/` and follow consistent patterns:
- Auth via `getSession()` from `@/lib/auth/session`
- Admin routes check `session.user.role === "admin"`
- Request validation with Zod (`schema.safeParse(await req.json())`)
- Error responses: `{ error: "Human-readable message" }` with appropriate HTTP status
- Image URLs resolved server-side via `tmdbImageUrl()` before returning to clients

Key route groups:
- `/api/titles/[id]/` — Title detail, user info, status, rating, watch, recommendations
- `/api/episodes/[id]/watch` — Episode watch/unwatch
- `/api/seasons/[id]/watch` — Season watch/unwatch
- `/api/people/[id]` — Person detail
- `/api/dashboard/` — Stats, continue watching, library, recommendations
- `/api/explore/` — Trending, popular, genres
- `/api/integrations/` — Webhook integration CRUD
- `/api/admin/` — Backups, registration, update check, job triggers
- `/api/account/` — Avatar, name
- `/api/discover`, `/api/search`, `/api/stats`, `/api/status` — Discovery, search, stats, health

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

### Service layer

- **metadata.ts**: `importTitle()` fetches from TMDB, inserts into DB, fire-and-forgets availability + recommendations + credits + image caching. `refreshTvChildren()` fetches all seasons/episodes with 250ms rate limiting.
- **image-cache.ts**: Downloads and caches TMDB images to local disk. `cacheImagesForTitle()` caches poster + backdrop, `cacheEpisodeStills()` caches episode stills, `cacheProviderLogos()` caches streaming provider logos, `cacheProfilePhotos()` caches person profile images.
- **tracking.ts**: Auto-transitions — logging a movie watch sets status to `completed`; logging an episode watch sets `in_progress`; all episodes watched auto-completes the series.
- **discovery.ts**: Feed generators — continue watching (next unwatched episode per in-progress show), library titles with availability, personalized recommendations from completed/highly-rated titles.
- **availability.ts**: Caches US streaming providers from TMDB watch/providers endpoint.
- **credits.ts**: Fetches and caches cast/crew data from TMDB, links persons to titles via `titleCast`.
- **person.ts**: Person detail and filmography lookups.
- **webhooks.ts**: Processes incoming Plex/Jellyfin/Emby webhook events to auto-log watches.
- **backup.ts**: Database backup/restore with configurable scheduled backups and retention pruning.
- **settings.ts**: Runtime app settings (registration open/closed, backup config, etc.) via `appSettings` table.
- **colors.ts**: Extracts dominant color palettes from title posters via node-vibrant.
- **update-check.ts**: Checks for new Sofa releases.
- **system-health.ts**: System health diagnostics.

### TMDB images

Only paths are stored in DB. Image URLs are resolved **server-side only** — API routes and server components call `tmdbImageUrl()` from `lib/tmdb/image.ts` before sending data to clients. Client components never import `tmdbImageUrl`; they receive ready-to-use URLs.

When `IMAGE_CACHE_ENABLED` is set (default), images are downloaded to local disk (`CACHE_DIR`, derived from `DATA_DIR/images`) and served via `app/api/images/[...path]/route.ts`. Categories: `posters` (w500), `backdrops` (w1280), `stills` (w1280), `logos` (w92), `profiles` (w185). When disabled, `tmdbImageUrl()` returns direct TMDB CDN URLs using `TMDB_IMAGE_BASE_URL` (defaults to `https://image.tmdb.org/t/p`).

Core files: `lib/services/image-cache.ts` (caching logic), `lib/tmdb/image.ts` (URL construction), `app/api/images/[...path]/route.ts` (proxy route).

### Background jobs

Defined in `lib/cron.ts` using croner cron expressions, started via Next.js instrumentation hook (`instrumentation.ts`) when `NEXT_RUNTIME === "nodejs"`. The instrumentation hook also runs DB migrations on startup and registers graceful shutdown handlers.

Jobs (all use `protect: true` to prevent overlapping runs, 300ms delay between TMDB calls):
- `nightlyRefreshLibrary` (`0 3 * * *`) — refreshes stale library titles (7d) and non-library titles (30d)
- `refreshAvailability` (`0 */6 * * *`) — streaming provider data
- `refreshRecommendations` (`0 */12 * * *`)
- `refreshTvChildren` (`30 */12 * * *`) — episodes for returning/in-production TV shows
- `cacheImages` (`0 1,13 * * *`) — posters, backdrops, stills, logos, profile photos
- `refreshCredits` (`0 2 * * *`) — cast/crew data for library titles
- `scheduledBackup` (configurable via settings) — database backups with retention pruning
- `updateCheck` (`0 */6 * * *`) — checks for new Sofa releases

### Environment variables

See `.env.example`: `DATA_DIR` (root for DB + cache, default `./data`), `TMDB_API_READ_ACCESS_TOKEN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. `DATABASE_URL` and `CACHE_DIR` are derived from `DATA_DIR` but can be overridden individually.

Optional: `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_ISSUER_URL`, `OIDC_PROVIDER_NAME`, `OIDC_AUTO_REGISTER`, `DISABLE_PASSWORD_LOGIN` (OIDC/SSO support). `LOG_LEVEL` (error/warn/info/debug, default: info). `IMAGE_CACHE_ENABLED` (default: true).

## Browser Automation

Use `agent-browser` for web automation. Run `agent-browser --help` for all commands.

Core workflow:
1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes

When encountering auth, use `demo@sofa.watch` for the username/email and `password` for the password.
