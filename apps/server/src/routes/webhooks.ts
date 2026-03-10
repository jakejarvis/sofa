import type { WebhookEvent } from "@sofa/core/webhooks";
import {
  parseEmbyPayload,
  parseJellyfinPayload,
  parsePlexPayload,
  processWebhook,
} from "@sofa/core/webhooks";
import { db } from "@sofa/db/client";
import { createLogger } from "@sofa/db/logger";
import { integrations } from "@sofa/db/schema";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

const log = createLogger("webhooks");

const app = new Hono();

app.post("/:token", async (c) => {
  const token = c.req.param("token");

  // Look up connection by token — this IS the auth
  const connection = db
    .select()
    .from(integrations)
    .where(eq(integrations.token, token))
    .get();

  if (!connection || !connection.enabled) {
    // Always return 200 to avoid retry storms from media servers
    return c.json({ ok: true });
  }

  // Only webhook-type integrations are handled here
  if (connection.type !== "webhook") {
    return c.json({ ok: true });
  }

  const provider = connection.provider as "plex" | "jellyfin" | "emby";

  try {
    let event: WebhookEvent | null;
    if (provider === "plex") {
      const formData = await c.req.raw.formData();
      event = parsePlexPayload(formData as unknown as FormData);
    } else if (provider === "emby") {
      const body = await c.req.json();
      event = parseEmbyPayload(body);
    } else {
      const body = await c.req.json();
      event = parseJellyfinPayload(body);
    }

    if (!event) {
      // Not a relevant event type — silently ignore
      return c.json({ ok: true });
    }

    await processWebhook(connection.id, connection.userId, provider, event);
  } catch (err) {
    // Swallow errors — never return non-200 to media servers
    log.debug("Webhook processing failed:", err);
  }

  return c.json({ ok: true });
});

export default app;
