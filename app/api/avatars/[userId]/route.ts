import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AVATAR_DIR } from "@/lib/constants";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    },
  });
}
