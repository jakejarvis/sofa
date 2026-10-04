import type { Season } from "./schemas";

interface NextEpisodeInfo {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string | null;
  stillPath: string | null;
  stillThumbHash: string | null;
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
  const now = new Date();
  // Device-local calendar date; TMDB air dates are date-only.
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  let nextEpisode: NextEpisodeInfo | null = null;
  let totalEpisodes = 0;
  let watchedEpisodes = 0;

  for (const season of seasons) {
    for (const ep of season.episodes) {
      // Undated (TBA) episodes are treated as unaired.
      const aired = ep.airDate != null && ep.airDate <= today;
      if (watchedEpisodeIds.has(ep.id)) {
        if (aired) {
          totalEpisodes++;
          watchedEpisodes++;
        }
      } else if (aired) {
        totalEpisodes++;
        if (!nextEpisode) {
          nextEpisode = {
            id: ep.id,
            seasonNumber: season.seasonNumber,
            episodeNumber: ep.episodeNumber,
            name: ep.name,
            stillPath: ep.stillPath,
            stillThumbHash: ep.stillThumbHash,
          };
        }
      }
    }
  }

  return { nextEpisode, totalEpisodes, watchedEpisodes };
}
