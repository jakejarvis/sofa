import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import {
  fetchAndMaybeCache,
  type ImageCategory,
  imageCacheEnabled,
} from "@/lib/services/image-cache";

const VALID_CATEGORIES = new Set<ImageCategory>([
  "posters",
  "backdrops",
  "stills",
  "logos",
  "profiles",
]);

const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = await params;

  if (!imageCacheEnabled()) {
    return NextResponse.json(
      { error: "Image cache disabled" },
      { status: 404 },
    );
  }

  if (segments.path.length !== 2) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const [category, rawFilename] = segments.path;

  if (!VALID_CATEGORIES.has(category as ImageCategory)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  // Sanitize filename — only allow basename to prevent path traversal
  const filename = path.basename(rawFilename);
  if (!filename || filename !== rawFilename || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const tmdbPath = `/${filename}`;
  const result = await fetchAndMaybeCache(tmdbPath, category as ImageCategory);

  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": IMMUTABLE_CACHE,
    },
  });
}
