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

/** A 2D point on a sparkline. */
export interface SparklinePoint {
  x: number;
  y: number;
}

/**
 * Fritsch-Carlson monotone cubic interpolation.
 * Produces smooth SVG paths that never overshoot between data points.
 */
export function computeMonotonePath(
  points: SparklinePoint[],
  height: number,
): { strokePath: string; areaPath: string } | null {
  const n = points.length;
  if (n < 2) return null;

  // Step 1: compute secants between adjacent points
  const deltas: number[] = [];
  for (let k = 0; k < n - 1; k++) {
    const dx = points[k + 1].x - points[k].x;
    deltas[k] = dx === 0 ? 0 : (points[k + 1].y - points[k].y) / dx;
  }

  // Step 2: compute initial tangent slopes
  const tangents: number[] = Array.from({ length: n });
  tangents[0] = deltas[0];
  tangents[n - 1] = deltas[n - 2];
  for (let k = 1; k < n - 1; k++) {
    if (Math.sign(deltas[k - 1]) !== Math.sign(deltas[k])) {
      tangents[k] = 0;
    } else {
      tangents[k] = (deltas[k - 1] + deltas[k]) / 2;
    }
  }

  // Step 3: Fritsch-Carlson monotonicity fix
  for (let k = 0; k < n - 1; k++) {
    if (deltas[k] === 0) {
      tangents[k] = 0;
      tangents[k + 1] = 0;
    } else {
      const alpha = tangents[k] / deltas[k];
      const beta = tangents[k + 1] / deltas[k];
      const s = alpha * alpha + beta * beta;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        tangents[k] = tau * alpha * deltas[k];
        tangents[k + 1] = tau * beta * deltas[k];
      }
    }
  }

  // Step 4: build SVG path with cubic Bezier segments
  let strokePath = `M${points[0].x},${points[0].y}`;
  for (let k = 0; k < n - 1; k++) {
    const dx = points[k + 1].x - points[k].x;
    const cp1x = points[k].x + dx / 3;
    const cp1y = points[k].y + (tangents[k] * dx) / 3;
    const cp2x = points[k + 1].x - dx / 3;
    const cp2y = points[k + 1].y - (tangents[k + 1] * dx) / 3;
    strokePath += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${points[k + 1].x},${points[k + 1].y}`;
  }

  // Close the area path along the bottom edge
  const areaPath = `${strokePath} L${points[n - 1].x},${height} L${points[0].x},${height} Z`;

  return { strokePath, areaPath };
}

/** WCAG relative luminance (0–1) of a `#rrggbb` hex color. */
export function hexToRelativeLuminance(hex: string): number {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
