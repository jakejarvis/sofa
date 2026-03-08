import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";

const DATA_DIR = process.env.DATA_DIR || "./data";
const AVATAR_DIR = path.join(DATA_DIR, "avatars");

const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;

  // Sanitize userId to prevent path traversal
  const safeUserId = path.basename(userId);
  if (!safeUserId || safeUserId !== userId || safeUserId.includes("..")) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  // Find the avatar file (could be .jpg, .png, .webp, .gif)
  const glob = new Bun.Glob(`${safeUserId}.*`);
  const matches = await Array.fromAsync(glob.scan(AVATAR_DIR));
  if (matches.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const file = Bun.file(path.join(AVATAR_DIR, matches[0]));
  if (!(await file.exists())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Cache for 1 year (cache-busted via ?v= query param)
  return new NextResponse(await file.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": file.type,
      "Cache-Control": IMMUTABLE_CACHE,
    },
  });
}
