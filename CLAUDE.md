# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start Next.js dev server
pnpm build            # Production build
pnpm lint             # Biome lint check
pnpm format           # Biome format (auto-fix)
pnpm db:push          # Push schema changes to SQLite database
pnpm db:generate      # Generate Drizzle migration files
pnpm db:migrate       # Run Drizzle migrations
pnpm db:studio        # Open Drizzle Studio (visual DB browser)
```

## Architecture

**Sofa** is a self-hosted movie & TV tracking app (like Trakt/TVTime) built as a single Next.js 16 application with SQLite.

### Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Database**: SQLite via @libsql/client + Drizzle ORM (WAL mode, singleton via `globalThis`, async queries)
- **Auth**: Better Auth with Drizzle adapter, email/password
- **Styling**: Tailwind CSS v4, shadcn components, dark cinema theme with warm primary accents
- **Fonts**: DM Serif Display (display), DM Sans (body), Geist Mono (mono)
- **Linting**: Biome (2-space indent, organized imports, React/Next.js recommended rules)
- **External API**: TMDB (The Movie Database) with Bearer token auth

### Path alias

`@/*` maps to project root (`./`), e.g. `@/lib/db/client` → `./lib/db/client`.

### Key directories

- `lib/db/schema.ts` — Single file with all Drizzle table definitions (auth tables + app tables)
- `lib/services/` — Business logic layer (metadata, tracking, discovery, availability)
- `lib/tmdb/` — TMDB API client and TypeScript types
- `lib/auth/` — Better Auth server config (`server.ts`) and client hooks (`client.ts`)
- `lib/jobs/` — In-process background job scheduler (setInterval-based, `globalThis` singleton)
- `app/api/` — Next.js route handlers
- `app/(pages)/` — User-facing pages (dashboard, search, title detail, login, register)
- `components/` — App components + `components/ui/` for shadcn primitives

### Auth pattern

Route handlers call Better Auth directly. Every authenticated route follows this pattern:

```typescript
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
const session = await auth.api.getSession({ headers: await headers() });
if (!session)
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// use session.user.id
```

### Database schema

All app tables use UUID text primary keys generated via the `uuid` package. Better Auth tables use their own ID format. Key relationships:

- `titles` → `seasons` → `episodes` (TV hierarchy)
- `userTitleStatus` links users to titles with status (watchlist/in_progress/completed)
- `userMovieWatches` / `userEpisodeWatches` track watch history
- `userRatings` stores 1-5 star ratings
- `availabilityOffers` caches streaming provider data per title
- `titleRecommendations` stores TMDB recommendations and similar titles

### Service layer

- **metadata.ts**: `importTitle()` fetches from TMDB, inserts into DB, fire-and-forgets availability + recommendations + image caching. `refreshTvChildren()` fetches all seasons/episodes with 250ms rate limiting.
- **image-cache.ts**: Downloads and caches TMDB images to local disk. `cacheImagesForTitle()` caches poster + backdrop, `cacheEpisodeStills()` caches episode stills, `cacheProviderLogos()` caches streaming provider logos.
- **tracking.ts**: Auto-transitions — logging a movie watch sets status to `completed`; logging an episode watch sets `in_progress`; all episodes watched auto-completes the series.
- **discovery.ts**: Feed generators — continue watching (next unwatched episode per in-progress show), library titles with availability, personalized recommendations from completed/highly-rated titles.
- **availability.ts**: Caches US streaming providers from TMDB watch/providers endpoint.

### TMDB images

Only paths are stored in DB. Image URLs are resolved **server-side only** — API routes and server components call `tmdbImageUrl()` from `lib/tmdb/image.ts` before sending data to clients. Client components never import `tmdbImageUrl`; they receive ready-to-use URLs.

When `IMAGE_CACHE_ENABLED` is set (default), images are downloaded to local disk (`CACHE_DIR`, derived from `DATA_DIR/images`) and served via `app/api/images/[...path]/route.ts`. Categories: `posters` (w500), `backdrops` (w1280), `stills` (w1280), `logos` (w92). When disabled, `tmdbImageUrl()` returns direct TMDB CDN URLs using `TMDB_IMAGE_BASE_URL` (defaults to `https://image.tmdb.org/t/p`).

Core files: `lib/services/image-cache.ts` (caching logic), `lib/tmdb/image.ts` (URL construction), `app/api/images/[...path]/route.ts` (proxy route).

### Background jobs

Registered in `lib/jobs/registry.ts`, started via Next.js instrumentation hook (`instrumentation.ts`) in production. Jobs: nightly library refresh (24h), availability refresh (6h), recommendations refresh (12h), TV episodes refresh (12h), image caching (12h). All batch jobs use 300ms delay between TMDB calls.

### Environment variables

See `.env.example`: `DATA_DIR` (root for DB + cache, default `./data`), `TMDB_API_READ_ACCESS_TOKEN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. `DATABASE_URL` and `CACHE_DIR` are derived from `DATA_DIR` but can be overridden individually.

## Browser Automation

Use `agent-browser` for web automation. Run `agent-browser --help` for all commands.

Core workflow:
1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes
