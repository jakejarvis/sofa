import { mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getSession } from "@/lib/auth/session";
import { AVATAR_DIR } from "@/lib/constants";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file)
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_AVATAR_SIZE)
    return NextResponse.json(
      { error: "File too large (max 2MB)" },
      { status: 413 },
    );
  if (!ALLOWED_AVATAR_TYPES.has(file.type))
    return NextResponse.json(
      { error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." },
      { status: 400 },
    );

  await mkdir(AVATAR_DIR, { recursive: true });

  // Remove any existing avatar for this user
  const glob = new Bun.Glob(`${session.user.id}.*`);
  const existing = await Array.fromAsync(glob.scan(AVATAR_DIR));
  for (const match of existing) {
    await Bun.file(path.join(AVATAR_DIR, match)).delete();
  }

  // Write new avatar (atomic: temp file + rename)
  const ext = MIME_TO_EXT[file.type] || "jpg";
  const filename = `${session.user.id}.${ext}`;
  const filePath = path.join(AVATAR_DIR, filename);
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  await Bun.write(tmpPath, file);
  await rename(tmpPath, filePath);

  // Update user via Better Auth
  const imageUrl = `/api/avatars/${session.user.id}?v=${Date.now()}`;
  await auth.api.updateUser({
    body: { image: imageUrl },
    headers: await headers(),
  });

  return NextResponse.json({ imageUrl });
}

export async function DELETE() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Remove file from disk
  const glob = new Bun.Glob(`${session.user.id}.*`);
  const matches = await Array.fromAsync(glob.scan(AVATAR_DIR));
  for (const match of matches) {
    await Bun.file(path.join(AVATAR_DIR, match)).delete();
  }

  // Clear user via Better Auth
  await auth.api.updateUser({
    body: { image: "" },
    headers: await headers(),
  });

  return new NextResponse(null, { status: 204 });
}
