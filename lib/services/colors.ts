import path from "node:path";
import { eq } from "drizzle-orm";
import { Vibrant } from "node-vibrant/node";
import { db } from "@/lib/db/client";
import { titles } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import {
  downloadAndCacheImage,
  getLocalImagePath,
  imageCacheEnabled,
  isImageCached,
} from "@/lib/services/image-cache";

const log = createLogger("colors");

export interface ColorPalette {
  vibrant: string | null;
  darkVibrant: string | null;
  lightVibrant: string | null;
  muted: string | null;
  darkMuted: string | null;
  lightMuted: string | null;
}

export async function extractAndStoreColors(
  titleId: string,
  posterPath: string | null,
): Promise<ColorPalette | null> {
  if (!posterPath) return null;

  // Use local cached image, downloading first if needed
  let source: string;
  const filename = path.basename(posterPath);
  if (imageCacheEnabled()) {
    if (!(await isImageCached("posters", filename))) {
      await downloadAndCacheImage(posterPath, "posters");
    }
    source = getLocalImagePath("posters", filename);
  } else {
    const baseUrl =
      process.env.TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p";
    source = `${baseUrl}/w300${posterPath}`;
  }

  try {
    log.debug(
      `Extracting colors for title ${titleId} from ${imageCacheEnabled() ? "cache" : "remote"}`,
    );
    const palette = await Vibrant.from(source).getPalette();

    const colors: ColorPalette = {
      vibrant: palette.Vibrant?.hex ?? null,
      darkVibrant: palette.DarkVibrant?.hex ?? null,
      lightVibrant: palette.LightVibrant?.hex ?? null,
      muted: palette.Muted?.hex ?? null,
      darkMuted: palette.DarkMuted?.hex ?? null,
      lightMuted: palette.LightMuted?.hex ?? null,
    };

    db.update(titles)
      .set({ colorPalette: JSON.stringify(colors) })
      .where(eq(titles.id, titleId))
      .run();

    log.debug(
      `Extracted colors for title ${titleId}: colors=${JSON.stringify(colors)}`,
    );
    return colors;
  } catch (err) {
    log.error(`Failed to extract colors for title ${titleId}:`, err);
    return null;
  }
}

export function parseColorPalette(raw: string | null): ColorPalette | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ColorPalette;
  } catch {
    return null;
  }
}
