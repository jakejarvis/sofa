import { ORPCError } from "@orpc/server";

import { AppErrorCode } from "@sofa/api/errors";
import {
  createOrUpdateIntegration,
  deleteIntegration as coreDeleteIntegration,
  listUserIntegrations,
  regenerateToken as coreRegenerateToken,
  serializeIntegration,
} from "@sofa/core/integrations";

import { os } from "../context";
import { authed } from "../middleware";

export const list = os.integrations.list.use(authed).handler(({ context }) => {
  return listUserIntegrations(context.user.id);
});

export const create = os.integrations.create.use(authed).handler(({ input, context }) => {
  return createOrUpdateIntegration(context.user.id, input.provider, input.enabled);
});

export const deleteIntegration = os.integrations.delete
  .use(authed)
  .handler(({ input, context }) => {
    coreDeleteIntegration(context.user.id, input.provider);
  });

export const regenerateToken = os.integrations.regenerateToken
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
