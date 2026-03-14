import { db } from "@sofa/db/client";
import { eq } from "@sofa/db/helpers";
import { titles } from "@sofa/db/schema";
import { createLogger } from "@sofa/logger";
import { Vibrant } from "node-vibrant/node";
import { loadImageBuffer } from "./image-cache";

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
  sourceBuffer?: Buffer | null,
): Promise<ColorPalette | null> {
  if (!posterPath) {
    db.update(titles)
      .set({ colorPalette: null })
      .where(eq(titles.id, titleId))
      .run();
    return null;
  }

  const source =
    sourceBuffer === undefined
      ? await loadImageBuffer(posterPath, "posters")
      : sourceBuffer;
  if (!source) return null;

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
