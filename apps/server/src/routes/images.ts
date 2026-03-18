import path from "node:path";

import { Hono } from "hono";
import { z } from "zod";

import { fetchAndMaybeCache, imageCacheEnabled } from "@sofa/core/image-cache";

const categorySchema = z.enum(["posters", "backdrops", "stills", "logos", "profiles"]);

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

  // Sanitize filename — only allow basename to prevent path traversal
  const filename = path.basename(rawFilename);
  if (!filename || filename !== rawFilename || filename.includes("..")) {
    return c.json({ error: "Invalid filename" }, 400);
  }

  const tmdbPath = `/${filename}`;
  const result = await fetchAndMaybeCache(tmdbPath, category);

  if (!result) {
    return c.json({ error: "Not found" }, 404);
  }

  return new Response(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
    },
  });
});

export default app;
