import path from "node:path";

import sharp from "sharp";
import { rgbaToThumbHash } from "thumbhash";

import {
  updateEpisodeStillThumbHash,
  updatePersonProfileThumbHash,
  updateSeasonPosterThumbHash,
  updateTitleBackdropThumbHash,
  updateTitlePosterThumbHash,
} from "@sofa/db/queries/thumbhash";
import { createLogger } from "@sofa/logger";
import type { ImageCategory } from "@sofa/tmdb/image";

import { loadImageBuffer } from "./image-cache";

const log = createLogger("thumbhash");

/**
 * Generate a ThumbHash string from an image path.
 * Returns a base64-encoded ThumbHash, or null on failure.
 */
export async function generateThumbHash(
  imagePath: string,
  category: ImageCategory,
  sourceBuffer?: Buffer | null,
): Promise<string | null> {
  const filename = path.basename(imagePath);
  const source =
    sourceBuffer === undefined ? await loadImageBuffer(imagePath, category) : sourceBuffer;
  if (!source) return null;

  try {
    const { data, info } = await sharp(source)
      .resize(100, 100, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const hash = rgbaToThumbHash(info.width, info.height, data);
    return Buffer.from(hash).toString("base64");
  } catch (err) {
    log.error(`Failed to generate thumbhash for ${category}/${filename}:`, err);
    return null;
  }
}

export async function generateTitlePosterThumbHash(
  titleId: string,
  posterPath: string | null,
  sourceBuffer?: Buffer | null,
): Promise<string | null> {
  const hash = posterPath ? await generateThumbHash(posterPath, "posters", sourceBuffer) : null;
  updateTitlePosterThumbHash(titleId, hash);
  return hash;
}

export async function generateTitleBackdropThumbHash(
  titleId: string,
  backdropPath: string | null,
): Promise<string | null> {
  const hash = backdropPath ? await generateThumbHash(backdropPath, "backdrops") : null;
  updateTitleBackdropThumbHash(titleId, hash);
  return hash;
}

export async function generateSeasonThumbHash(
  seasonId: string,
  posterPath: string | null,
): Promise<string | null> {
  const hash = posterPath ? await generateThumbHash(posterPath, "posters") : null;
  updateSeasonPosterThumbHash(seasonId, hash);
  return hash;
}

export async function generateEpisodeThumbHash(
  episodeId: string,
  stillPath: string | null,
): Promise<string | null> {
  const hash = stillPath ? await generateThumbHash(stillPath, "stills") : null;
  updateEpisodeStillThumbHash(episodeId, hash);
  return hash;
}

export async function generatePersonThumbHash(
  personId: string,
  profilePath: string | null,
): Promise<string | null> {
  const hash = profilePath ? await generateThumbHash(profilePath, "profiles") : null;
  updatePersonProfileThumbHash(personId, hash);
  return hash;
}
