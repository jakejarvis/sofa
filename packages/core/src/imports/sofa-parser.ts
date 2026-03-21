import { SofaExportSchema } from "@sofa/api/schemas";
import { createLogger } from "@sofa/logger";

import type { NormalizedImport, ParseResult } from "./parsers";
import { countUnresolved } from "./parsers";

const log = createLogger("imports");

export function parseSofaExport(data: unknown): ParseResult {
  const warnings: string[] = [];

  const parsed = SofaExportSchema.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return {
      data: { source: "sofa", movies: [], episodes: [], watchlist: [], ratings: [] },
      warnings: [`Invalid Sofa export file: ${issues.join("; ")}`],
      diagnostics: { unresolved: 0, unsupported: 0 },
    };
  }

  const exported = parsed.data;

  const normalized: NormalizedImport = {
    source: "sofa",
    movies: exported.movieWatches.map((m) => ({
      tmdbId: m.tmdbId,
      title: m.title,
      year: m.year,
      watchedAt: m.watchedAt,
    })),
    episodes: exported.episodeWatches.map((e) => ({
      showTmdbId: e.showTmdbId,
      showTitle: e.showTitle,
      year: e.showYear,
      seasonNumber: e.seasonNumber,
      episodeNumber: e.episodeNumber,
      watchedAt: e.watchedAt,
    })),
    watchlist: exported.library.map((l) => ({
      tmdbId: l.tmdbId,
      title: l.title,
      year: l.year,
      type: l.type,
      status: l.status,
      addedAt: l.addedAt,
    })),
    ratings: exported.ratings.map((r) => ({
      tmdbId: r.tmdbId,
      title: r.title,
      year: r.year,
      type: r.type,
      rating: r.rating,
      ratedAt: r.ratedAt,
    })),
  };

  log.info(
    `Parsed Sofa export: ${normalized.movies.length} movies, ${normalized.episodes.length} episodes, ${normalized.watchlist.length} library, ${normalized.ratings.length} ratings`,
  );

  return {
    data: normalized,
    warnings,
    diagnostics: { unresolved: countUnresolved(normalized), unsupported: 0 },
  };
}
