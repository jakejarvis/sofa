import { Hono } from "hono";
import { z } from "zod";

import { fetchAndMaybeCache, imageCacheEnabled } from "@sofa/core/image-cache";

const categorySchema = z.enum(["posters", "backdrops", "stills", "logos", "profiles"]);

/** TMDB file names: letters, digits, `_`/`-`, and an image extension. Rejects `?`, `%`, etc. */
const TMDB_IMAGE_FILENAME = /^[A-Za-z0-9_-]{1,100}\.(?:jpe?g|png|svg|webp)$/;

const app = new Hono();

app.get("/:category/:filename", async (c) => {
  if (!imageCacheEnabled()) {
    return c.json({ error: "Image cache disabled" }, 404);
  }

  const rawCategory = c.req.param("category");
  const rawFilename = c.req.param("filename");

  const catResult = categorySchema.safeParse(rawCategory);
  if (!catResult.success) {
    return c.json({ error: "Invalid category" }, 400);
  }
  const category = catResult.data;

  if (!TMDB_IMAGE_FILENAME.test(rawFilename)) {
    return c.json({ error: "Invalid filename" }, 400);
  }

  const tmdbPath = `/${rawFilename}`;
  const result = await fetchAndMaybeCache(tmdbPath, category);

  if (!result) {
    return c.json({ error: "Not found" }, 404);
  }

  return new Response(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

export default app;
