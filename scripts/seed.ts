/**
 * Seed script — populates a Sofa instance with realistic demo data.
 *
 * Usage:
 *   bun run db:seed                     # uses defaults
 *   bun run db:seed --email demo@sofa.tv --password demo1234 --name "Demo User"
 *
 * Requires:
 *   - TMDB_API_READ_ACCESS_TOKEN in .env (titles are fetched live from TMDB)
 *   - BETTER_AUTH_SECRET in .env
 *
 * What it creates:
 *   - A demo user account with email/password login
 *   - ~20 movies + ~6 TV shows imported from TMDB (with full metadata)
 *   - Realistic watch history spread across the last 6 months
 *   - Mixed statuses: completed, in-progress, watchlist
 *   - Star ratings on completed titles
 *   - Availability, credits, recommendations, colors enriched via TMDB
 *   - Webhook connections with sample event log entries
 *   - Cron run history entries
 *   - App settings configured
 */

import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";
import {
  appSettings,
  cronRuns,
  episodes,
  seasons,
  user,
  userEpisodeWatches,
  userMovieWatches,
  userRatings,
  userTitleStatus,
  webhookConnections,
  webhookEventLog,
} from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { importTitle } from "@/lib/services/metadata";
import { setSetting } from "@/lib/services/settings";

const log = createLogger("seed");

// ─── CLI args ───────────────────────────────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    email: { type: "string", default: "demo@sofa.watch" },
    password: { type: "string", default: "password" },
    name: { type: "string", default: "Demo User" },
  },
  strict: false,
});

const DEMO_EMAIL = args.email as string;
const DEMO_PASSWORD = args.password as string;
const DEMO_NAME = args.name as string;

// ─── Title catalog ──────────────────────────────────────────────────────────

// Movies — a curated mix of genres, decades, and popularity
const MOVIES: { tmdbId: number; name: string }[] = [
  { tmdbId: 278, name: "The Shawshank Redemption" },
  { tmdbId: 238, name: "The Godfather" },
  { tmdbId: 155, name: "The Dark Knight" },
  { tmdbId: 550, name: "Fight Club" },
  { tmdbId: 680, name: "Pulp Fiction" },
  { tmdbId: 13, name: "Forrest Gump" },
  { tmdbId: 120, name: "The Lord of the Rings: The Fellowship of the Ring" },
  { tmdbId: 603, name: "The Matrix" },
  { tmdbId: 157336, name: "Interstellar" },
  { tmdbId: 569094, name: "Spider-Man: Across the Spider-Verse" },
  { tmdbId: 27205, name: "Inception" },
  { tmdbId: 244786, name: "Whiplash" },
  { tmdbId: 872585, name: "Oppenheimer" },
  { tmdbId: 346698, name: "Barbie" },
  { tmdbId: 438631, name: "Dune" },
  { tmdbId: 496243, name: "Parasite" },
  { tmdbId: 497, name: "The Green Mile" },
  { tmdbId: 11, name: "Star Wars" },
  { tmdbId: 489, name: "Good Will Hunting" },
  { tmdbId: 1184918, name: "The Wild Robot" },
];

// TV Shows — mix of completed series & currently airing
const TV_SHOWS: { tmdbId: number; name: string }[] = [
  { tmdbId: 1396, name: "Breaking Bad" },
  { tmdbId: 1399, name: "Game of Thrones" },
  { tmdbId: 66732, name: "Stranger Things" },
  { tmdbId: 94997, name: "House of the Dragon" },
  { tmdbId: 60574, name: "Peaky Blinders" },
  { tmdbId: 100088, name: "The Last of Us" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function seed() {
  log.info("Starting seed...");

  // 1. Run migrations to ensure schema is ready
  runMigrations();

  // 2. Create demo user via Better Auth API
  log.info(`Creating demo user: ${DEMO_EMAIL}`);

  const existingUser = db
    .select()
    .from(user)
    .where(eq(user.email, DEMO_EMAIL))
    .get();

  if (existingUser) {
    log.warn(
      `User ${DEMO_EMAIL} already exists (${existingUser.id}). Using existing user.`,
    );
    await seedForUser(existingUser.id);
    return;
  }

  // Ensure registration is open so signUpEmail succeeds
  await setSetting("registrationOpen", "true");

  const result = await auth.api.signUpEmail({
    body: {
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    },
  });

  if (!result?.user) {
    throw new Error("Failed to create user via Better Auth signUpEmail");
  }

  const userId = result.user.id;
  log.info(`User created: ${userId} (role: ${result.user.role})`);
  await seedForUser(userId);
}

async function seedForUser(userId: string) {
  // 3. Import all titles from TMDB
  log.info("Importing movies from TMDB...");
  const movieTitles: { id: string; tmdbId: number; name: string }[] = [];
  for (const movie of MOVIES) {
    try {
      log.info(`  Importing movie: ${movie.name} (TMDB ${movie.tmdbId})`);
      const title = await importTitle(movie.tmdbId, "movie");
      if (title) {
        movieTitles.push({
          id: title.id,
          tmdbId: movie.tmdbId,
          name: movie.name,
        });
      }
      // Small delay to respect TMDB rate limits
      await delay(300);
    } catch (err) {
      log.error(`  Failed to import ${movie.name}:`, err);
    }
  }

  log.info("Importing TV shows from TMDB...");
  const tvTitles: { id: string; tmdbId: number; name: string }[] = [];
  for (const show of TV_SHOWS) {
    try {
      log.info(`  Importing TV show: ${show.name} (TMDB ${show.tmdbId})`);
      const title = await importTitle(show.tmdbId, "tv");
      if (title) {
        tvTitles.push({ id: title.id, tmdbId: show.tmdbId, name: show.name });
      }
      await delay(300);
    } catch (err) {
      log.error(`  Failed to import ${show.name}:`, err);
    }
  }

  // Wait for all background enrichment tasks to settle
  log.info("Waiting for enrichment tasks to complete...");
  await delay(10_000);

  // 4. Create watch history and statuses
  log.info("Creating watch history...");

  // -- Completed movies (watched, rated) --
  const completedMovies = movieTitles.slice(0, 12);
  for (let i = 0; i < completedMovies.length; i++) {
    const movie = completedMovies[i];
    const watchedAt = daysAgo(randomBetween(7, 170));

    db.insert(userMovieWatches)
      .values({
        userId,
        titleId: movie.id,
        watchedAt,
        source: i < 10 ? "manual" : "plex",
      })
      .run();

    db.insert(userTitleStatus)
      .values({
        userId,
        titleId: movie.id,
        status: "completed",
        addedAt: new Date(watchedAt.getTime() - 86400000), // added day before watch
        updatedAt: watchedAt,
      })
      .onConflictDoNothing()
      .run();

    // Rate most completed movies (mix of 3-5 stars)
    const rating = i < 4 ? 5 : i < 8 ? 4 : 3;
    db.insert(userRatings)
      .values({
        userId,
        titleId: movie.id,
        ratingStars: rating,
        ratedAt: watchedAt,
      })
      .onConflictDoNothing()
      .run();

    log.info(`  Completed + rated: ${movie.name} (${rating} stars)`);
  }

  // Some movies watched multiple times (rewatches)
  for (const movie of completedMovies.slice(0, 3)) {
    db.insert(userMovieWatches)
      .values({
        userId,
        titleId: movie.id,
        watchedAt: daysAgo(randomBetween(1, 30)),
        source: "manual",
      })
      .run();
    log.info(`  Rewatch: ${movie.name}`);
  }

  // -- Watchlist movies (added but not watched) --
  const watchlistMovies = movieTitles.slice(12, 17);
  for (const movie of watchlistMovies) {
    db.insert(userTitleStatus)
      .values({
        userId,
        titleId: movie.id,
        status: "watchlist",
        addedAt: daysAgo(randomBetween(1, 60)),
        updatedAt: daysAgo(randomBetween(0, 5)),
      })
      .onConflictDoNothing()
      .run();
    log.info(`  Watchlisted: ${movie.name}`);
  }

  // -- Remaining movies: not tracked (visible in search/explore only) --
  for (const movie of movieTitles.slice(17)) {
    log.info(`  Untracked (discover-only): ${movie.name}`);
  }

  // 5. TV show tracking
  log.info("Creating TV watch history...");

  // Breaking Bad — fully completed
  const breakingBad = tvTitles.find((t) => t.tmdbId === 1396);
  if (breakingBad) {
    const allEps = getEpisodesForTitle(breakingBad.id);
    const watchedAt = daysAgo(90);
    for (const ep of allEps) {
      db.insert(userEpisodeWatches)
        .values({ userId, episodeId: ep.id, watchedAt, source: "manual" })
        .onConflictDoNothing()
        .run();
    }
    db.insert(userTitleStatus)
      .values({
        userId,
        titleId: breakingBad.id,
        status: "completed",
        addedAt: daysAgo(180),
        updatedAt: watchedAt,
      })
      .onConflictDoNothing()
      .run();
    db.insert(userRatings)
      .values({
        userId,
        titleId: breakingBad.id,
        ratingStars: 5,
        ratedAt: watchedAt,
      })
      .onConflictDoNothing()
      .run();
    log.info(`  Completed: Breaking Bad (${allEps.length} episodes, 5 stars)`);
  }

  // Game of Thrones — fully completed with lower rating
  const got = tvTitles.find((t) => t.tmdbId === 1399);
  if (got) {
    const allEps = getEpisodesForTitle(got.id);
    const watchedAt = daysAgo(120);
    for (const ep of allEps) {
      db.insert(userEpisodeWatches)
        .values({ userId, episodeId: ep.id, watchedAt, source: "manual" })
        .onConflictDoNothing()
        .run();
    }
    db.insert(userTitleStatus)
      .values({
        userId,
        titleId: got.id,
        status: "completed",
        addedAt: daysAgo(180),
        updatedAt: watchedAt,
      })
      .onConflictDoNothing()
      .run();
    db.insert(userRatings)
      .values({
        userId,
        titleId: got.id,
        ratingStars: 3,
        ratedAt: watchedAt,
      })
      .onConflictDoNothing()
      .run();
    log.info(
      `  Completed: Game of Thrones (${allEps.length} episodes, 3 stars)`,
    );
  }

  // Stranger Things — in progress (watched first 2 seasons)
  const strangerThings = tvTitles.find((t) => t.tmdbId === 66732);
  if (strangerThings) {
    const seasonRows = db
      .select()
      .from(seasons)
      .where(eq(seasons.titleId, strangerThings.id))
      .orderBy(seasons.seasonNumber)
      .all();

    let watchedCount = 0;
    for (const season of seasonRows.slice(0, 2)) {
      const eps = db
        .select()
        .from(episodes)
        .where(eq(episodes.seasonId, season.id))
        .all();
      for (const ep of eps) {
        db.insert(userEpisodeWatches)
          .values({
            userId,
            episodeId: ep.id,
            watchedAt: daysAgo(randomBetween(14, 45)),
            source: "manual",
          })
          .onConflictDoNothing()
          .run();
        watchedCount++;
      }
    }
    db.insert(userTitleStatus)
      .values({
        userId,
        titleId: strangerThings.id,
        status: "in_progress",
        addedAt: daysAgo(60),
        updatedAt: daysAgo(14),
      })
      .onConflictDoNothing()
      .run();
    log.info(
      `  In progress: Stranger Things (${watchedCount} episodes watched)`,
    );
  }

  // House of the Dragon — in progress (watched season 1 only)
  const hotd = tvTitles.find((t) => t.tmdbId === 94997);
  if (hotd) {
    const seasonRows = db
      .select()
      .from(seasons)
      .where(eq(seasons.titleId, hotd.id))
      .orderBy(seasons.seasonNumber)
      .all();

    let watchedCount = 0;
    if (seasonRows.length > 0) {
      const eps = db
        .select()
        .from(episodes)
        .where(eq(episodes.seasonId, seasonRows[0].id))
        .all();
      for (const ep of eps) {
        db.insert(userEpisodeWatches)
          .values({
            userId,
            episodeId: ep.id,
            watchedAt: daysAgo(randomBetween(30, 60)),
            source: "jellyfin",
          })
          .onConflictDoNothing()
          .run();
        watchedCount++;
      }
    }
    db.insert(userTitleStatus)
      .values({
        userId,
        titleId: hotd.id,
        status: "in_progress",
        addedAt: daysAgo(75),
        updatedAt: daysAgo(30),
      })
      .onConflictDoNothing()
      .run();
    log.info(
      `  In progress: House of the Dragon (${watchedCount} episodes watched)`,
    );
  }

  // Peaky Blinders — on watchlist
  const peaky = tvTitles.find((t) => t.tmdbId === 60574);
  if (peaky) {
    db.insert(userTitleStatus)
      .values({
        userId,
        titleId: peaky.id,
        status: "watchlist",
        addedAt: daysAgo(20),
        updatedAt: daysAgo(20),
      })
      .onConflictDoNothing()
      .run();
    log.info("  Watchlisted: Peaky Blinders");
  }

  // The Last of Us — in progress (watched first 3 episodes)
  const tlou = tvTitles.find((t) => t.tmdbId === 100088);
  if (tlou) {
    const seasonRows = db
      .select()
      .from(seasons)
      .where(eq(seasons.titleId, tlou.id))
      .orderBy(seasons.seasonNumber)
      .all();

    let watchedCount = 0;
    if (seasonRows.length > 0) {
      const eps = db
        .select()
        .from(episodes)
        .where(eq(episodes.seasonId, seasonRows[0].id))
        .orderBy(episodes.episodeNumber)
        .all();
      for (const ep of eps.slice(0, 3)) {
        db.insert(userEpisodeWatches)
          .values({
            userId,
            episodeId: ep.id,
            watchedAt: daysAgo(randomBetween(2, 10)),
            source: "manual",
          })
          .onConflictDoNothing()
          .run();
        watchedCount++;
      }
    }
    db.insert(userTitleStatus)
      .values({
        userId,
        titleId: tlou.id,
        status: "in_progress",
        addedAt: daysAgo(15),
        updatedAt: daysAgo(2),
      })
      .onConflictDoNothing()
      .run();
    log.info(
      `  In progress: The Last of Us (${watchedCount} episodes watched)`,
    );
  }

  // 6. Webhook connections
  log.info("Creating webhook connections...");
  const plexWebhookId = Bun.randomUUIDv7();
  const jellyfinWebhookId = Bun.randomUUIDv7();

  db.insert(webhookConnections)
    .values([
      {
        id: plexWebhookId,
        userId,
        provider: "plex",
        token: `plex_${Bun.randomUUIDv7().replace(/-/g, "").slice(0, 32)}`,
        enabled: true,
        createdAt: daysAgo(90),
        lastEventAt: daysAgo(1),
      },
      {
        id: jellyfinWebhookId,
        userId,
        provider: "jellyfin",
        token: `jf_${Bun.randomUUIDv7().replace(/-/g, "").slice(0, 32)}`,
        enabled: true,
        createdAt: daysAgo(45),
        lastEventAt: daysAgo(3),
      },
    ])
    .onConflictDoNothing()
    .run();

  // Sample webhook event log
  const webhookEvents = [
    {
      connectionId: plexWebhookId,
      eventType: "media.scrobble",
      mediaType: "movie",
      mediaTitle: "The Shawshank Redemption",
      status: "success" as const,
      receivedAt: daysAgo(5),
    },
    {
      connectionId: plexWebhookId,
      eventType: "media.scrobble",
      mediaType: "movie",
      mediaTitle: "Fight Club",
      status: "success" as const,
      receivedAt: daysAgo(10),
    },
    {
      connectionId: plexWebhookId,
      eventType: "media.play",
      mediaType: "movie",
      mediaTitle: "Unknown Movie",
      status: "ignored" as const,
      receivedAt: daysAgo(12),
    },
    {
      connectionId: jellyfinWebhookId,
      eventType: "PlaybackStop",
      mediaType: "episode",
      mediaTitle: "House of the Dragon S01E05",
      status: "success" as const,
      receivedAt: daysAgo(30),
    },
    {
      connectionId: jellyfinWebhookId,
      eventType: "PlaybackStop",
      mediaType: "episode",
      mediaTitle: "House of the Dragon S01E06",
      status: "error" as const,
      errorMessage: "Could not match title in database",
      receivedAt: daysAgo(29),
    },
  ];

  for (const event of webhookEvents) {
    db.insert(webhookEventLog).values(event).run();
  }
  log.info(`  Created 2 webhook connections + ${webhookEvents.length} events`);

  // 7. Cron run history
  log.info("Creating cron run history...");
  const cronJobs = [
    "nightlyRefreshLibrary",
    "refreshAvailability",
    "refreshRecommendations",
    "refreshTvChildren",
    "cacheImages",
    "refreshCredits",
    "updateCheck",
  ];

  for (const jobName of cronJobs) {
    // Create 3-5 historical runs per job
    const runCount = randomBetween(3, 5);
    for (let i = 0; i < runCount; i++) {
      const startedAt = daysAgo(i * 2 + randomBetween(0, 1));
      const durationMs = randomBetween(500, 30000);
      const finishedAt = new Date(startedAt.getTime() + durationMs);
      const isError = Math.random() < 0.05; // 5% error rate

      db.insert(cronRuns)
        .values({
          jobName,
          status: isError ? "error" : "success",
          startedAt,
          finishedAt,
          durationMs,
          errorMessage: isError ? "TMDB API rate limit exceeded" : null,
        })
        .run();
    }
  }
  log.info("  Created cron run history");

  // 8. App settings
  log.info("Configuring app settings...");
  const settings: [string, string][] = [
    ["registrationOpen", "false"],
    ["backupEnabled", "true"],
    ["backupSchedule", "0 4 * * *"],
    ["backupRetentionDays", "30"],
  ];
  for (const [key, value] of settings) {
    db.insert(appSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: appSettings.key, set: { value } })
      .run();
  }
  log.info("  App settings configured");

  // Done!
  const movieCount = movieTitles.length;
  const tvCount = tvTitles.length;

  log.info("─────────────────────────────────────────────────");
  log.info("Seed complete!");
  log.info(`  User:     ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  log.info(`  Movies:   ${movieCount} imported`);
  log.info(`  TV Shows: ${tvCount} imported`);
  log.info(`  Library:  completed, in-progress, and watchlist items`);
  log.info(`  Extras:   ratings, webhooks, cron history, app settings`);
  log.info("─────────────────────────────────────────────────");
}

function getEpisodesForTitle(titleId: string) {
  const seasonRows = db
    .select()
    .from(seasons)
    .where(eq(seasons.titleId, titleId))
    .all();

  const allEps: { id: string }[] = [];
  for (const season of seasonRows) {
    const eps = db
      .select()
      .from(episodes)
      .where(eq(episodes.seasonId, season.id))
      .all();
    allEps.push(...eps);
  }
  return allEps;
}

// ─── Run ────────────────────────────────────────────────────────────────────

seed().catch((err) => {
  log.error("Seed failed:", err);
  process.exit(1);
});
