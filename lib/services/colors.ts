import path from "node:path";
import { eq } from "drizzle-orm";
import { Vibrant } from "node-vibrant/node";
import { db } from "@/lib/db/client";
import { titles } from "@/lib/db/schema";
import {
  getLocalImagePath,
  imageCacheEnabled,
  isImageCached,
} from "@/lib/services/image-cache";
import { tmdbImageUrl } from "@/lib/tmdb/image";

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

  // Prefer local file when image cache is active
  let source: string;
  const filename = path.basename(posterPath);
  if (imageCacheEnabled() && isImageCached("posters", filename)) {
    source = getLocalImagePath("posters", filename);
  } else {
    const url = tmdbImageUrl(posterPath, "w300");
    if (!url) return null;
    source = url;
  }

  try {
    const palette = await Vibrant.from(source).getPalette();

    const colors: ColorPalette = {
      vibrant: palette.Vibrant?.hex ?? null,
      darkVibrant: palette.DarkVibrant?.hex ?? null,
      lightVibrant: palette.LightVibrant?.hex ?? null,
      muted: palette.Muted?.hex ?? null,
      darkMuted: palette.DarkMuted?.hex ?? null,
      lightMuted: palette.LightMuted?.hex ?? null,
    };

    await db
      .update(titles)
      .set({ colorPalette: JSON.stringify(colors) })
      .where(eq(titles.id, titleId))
      .run();

    return colors;
  } catch (err) {
    console.error(`Failed to extract colors for title ${titleId}:`, err);
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
