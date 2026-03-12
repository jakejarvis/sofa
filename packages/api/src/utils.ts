import type { Season } from "./schemas";

interface NextEpisodeInfo {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string | null;
  stillPath: string | null;
}

export interface NextEpisodeResult {
  nextEpisode: NextEpisodeInfo | null;
  totalEpisodes: number;
  watchedEpisodes: number;
}

/**
 * Compute the next unwatched aired episode from seasons + watch history.
 * Mirrors the server-side logic in `getContinueWatchingFeed`.
 */
export function getNextEpisode(
  seasons: Season[],
  watchedEpisodeIds: Set<string>,
): NextEpisodeResult {
  const today = new Date().toISOString().slice(0, 10);
  let nextEpisode: NextEpisodeInfo | null = null;
  let totalEpisodes = 0;
  let watchedEpisodes = 0;

  for (const season of seasons) {
    for (const ep of season.episodes) {
      totalEpisodes++;
      if (watchedEpisodeIds.has(ep.id)) {
        watchedEpisodes++;
      } else if (!nextEpisode) {
        // Skip episodes not yet aired
        if (ep.airDate && ep.airDate > today) continue;
        nextEpisode = {
          id: ep.id,
          seasonNumber: season.seasonNumber,
          episodeNumber: ep.episodeNumber,
          name: ep.name,
          stillPath: ep.stillPath,
        };
      }
    }
  }

  return { nextEpisode, totalEpisodes, watchedEpisodes };
}
