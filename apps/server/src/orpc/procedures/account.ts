import { mkdir, rename } from "node:fs/promises";
import path from "node:path";

import { ORPCError } from "@orpc/server";

import { AppErrorCode } from "@sofa/api/errors";
import { auth } from "@sofa/auth/server";
import { AVATAR_DIR } from "@sofa/config";
import {
  createOrUpdateIntegration,
  deleteIntegration as coreDeleteIntegration,
  listUserIntegrations,
  regenerateToken as coreRegenerateToken,
  serializeIntegration,
} from "@sofa/core/integrations";
import { getUserPlatformIdList, updateUserPlatforms } from "@sofa/core/platforms";

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

    const ext = MIME_TO_EXT[file.type] || "jpg";
    const filename = `${context.user.id}.${ext}`;
    const filePath = path.join(AVATAR_DIR, filename);
    const tmpPath = `${filePath}.tmp.${Date.now()}`;
    await Bun.write(tmpPath, file);
    await rename(tmpPath, filePath);

    const glob = new Bun.Glob(`${context.user.id}.*`);
    const existing = await Array.fromAsync(glob.scan(AVATAR_DIR));
    for (const match of existing) {
      if (match !== filename) {
        await Bun.file(path.join(AVATAR_DIR, match)).delete();
      }
    }

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

export const platforms = os.account.platforms.use(authed).handler(async ({ context }) => {
  return { platformIds: getUserPlatformIdList(context.user.id) };
});

export const updatePlatformsHandler = os.account.updatePlatforms
  .use(authed)
  .handler(async ({ input, context }) => {
    updateUserPlatforms(context.user.id, input.platformIds);
  });

// ─── Integrations ─────────────────────────────────────────────

export const integrationsList = os.account.integrations.list.use(authed).handler(({ context }) => {
  return listUserIntegrations(context.user.id);
});

export const integrationsCreate = os.account.integrations.create
  .use(authed)
  .handler(({ input, context }) => {
    return createOrUpdateIntegration(context.user.id, input.provider, input.enabled);
  });

export const integrationsDelete = os.account.integrations.delete
  .use(authed)
  .handler(({ input, context }) => {
    coreDeleteIntegration(context.user.id, input.provider);
  });

export const integrationsRegenerateToken = os.account.integrations.regenerateToken
  .use(authed)
  .handler(({ input, context }) => {
    const row = coreRegenerateToken(context.user.id, input.provider);

    if (!row) {
      throw new ORPCError("NOT_FOUND", {
        message: "Integration not found",
        data: { code: AppErrorCode.INTEGRATION_NOT_FOUND },
      });
    }

    return serializeIntegration(row);
  });
