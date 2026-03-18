import { mkdir, rename } from "node:fs/promises";
import path from "node:path";

import { auth } from "@sofa/auth/server";
import { AVATAR_DIR } from "@sofa/config";

import { os } from "../context";
import { authed } from "../middleware";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const updateName = os.account.updateName.use(authed).handler(async ({ input, context }) => {
  await auth.api.updateUser({
    body: { name: input.name },
    headers: context.headers,
  });
});

export const uploadAvatar = os.account.uploadAvatar
  .use(authed)
  .handler(async ({ input: file, context }) => {
    await mkdir(AVATAR_DIR, { recursive: true });

    // Write new avatar first (atomic: temp file + rename)
    const ext = MIME_TO_EXT[file.type] || "jpg";
    const filename = `${context.user.id}.${ext}`;
    const filePath = path.join(AVATAR_DIR, filename);
    const tmpPath = `${filePath}.tmp.${Date.now()}`;
    await Bun.write(tmpPath, file);
    await rename(tmpPath, filePath);

    // Remove any previous avatar with a different extension
    const glob = new Bun.Glob(`${context.user.id}.*`);
    const existing = await Array.fromAsync(glob.scan(AVATAR_DIR));
    for (const match of existing) {
      if (match !== filename) {
        await Bun.file(path.join(AVATAR_DIR, match)).delete();
      }
    }

    // Update user via Better Auth
    const imageUrl = `/api/avatars/${context.user.id}?v=${Date.now()}`;
    await auth.api.updateUser({
      body: { image: imageUrl },
      headers: context.headers,
    });

    return { imageUrl };
  });

export const removeAvatar = os.account.removeAvatar.use(authed).handler(async ({ context }) => {
  const glob = new Bun.Glob(`${context.user.id}.*`);
  const matches = await Array.fromAsync(glob.scan(AVATAR_DIR));
  for (const match of matches) {
    await Bun.file(path.join(AVATAR_DIR, match)).delete();
  }
  await auth.api.updateUser({
    body: { image: "" },
    headers: context.headers,
  });
});
