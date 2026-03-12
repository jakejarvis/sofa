import { ORPCError } from "@orpc/server";
import { db } from "@sofa/db/client";
import { and, desc, eq } from "@sofa/db/helpers";
import { integrationEvents, integrations } from "@sofa/db/schema";
import { os } from "../context";
import { authed } from "../middleware";

const LIST_PROVIDERS = new Set(["sonarr", "radarr"]);

function integrationTypeFor(provider: string): "webhook" | "list" {
  return LIST_PROVIDERS.has(provider) ? "list" : "webhook";
}

function generateToken() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
    "hex",
  );
}

function serializeIntegration(row: {
  id: string;
  provider: string;
  type: "webhook" | "list";
  token: string;
  enabled: boolean;
  lastEventAt: Date | null;
  createdAt: Date;
}) {
  return {
    ...row,
    lastEventAt: row.lastEventAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export const list = os.integrations.list.use(authed).handler(({ context }) => {
  const userIntegrations = db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, context.user.id))
    .all();

  const eventsByIntegration = new Map<
    string,
    (typeof integrationEvents.$inferSelect)[]
  >();
  for (const integration of userIntegrations) {
    const events = db
      .select()
      .from(integrationEvents)
      .where(eq(integrationEvents.integrationId, integration.id))
      .orderBy(desc(integrationEvents.receivedAt))
      .limit(10)
      .all();
    eventsByIntegration.set(integration.id, events);
  }

  const result = userIntegrations.map((integration) => {
    const events = eventsByIntegration.get(integration.id) ?? [];
    return {
      ...serializeIntegration(integration),
      recentEvents: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        mediaType: e.mediaType,
        mediaTitle: e.mediaTitle,
        status: e.status,
        receivedAt: e.receivedAt.toISOString(),
      })),
    };
  });

  return { integrations: result };
});

export const create = os.integrations.create
  .use(authed)
  .handler(({ input, context }) => {
    const existing = db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, context.user.id),
          eq(integrations.provider, input.provider),
        ),
      )
      .get();

    if (existing) {
      if (input.enabled !== undefined) {
        const row = db
          .update(integrations)
          .set({ enabled: input.enabled })
          .where(eq(integrations.id, existing.id))
          .returning()
          .get();
        return serializeIntegration(row);
      }
      return serializeIntegration(existing);
    }

    const row = db
      .insert(integrations)
      .values({
        userId: context.user.id,
        provider: input.provider,
        type: integrationTypeFor(input.provider),
        token: generateToken(),
        enabled: input.enabled ?? true,
        createdAt: new Date(),
      })
      .returning()
      .get();

    return serializeIntegration(row);
  });

export const deleteIntegration = os.integrations.delete
  .use(authed)
  .handler(({ input, context }) => {
    db.delete(integrations)
      .where(
        and(
          eq(integrations.userId, context.user.id),
          eq(integrations.provider, input.provider),
        ),
      )
      .run();
  });

export const regenerateToken = os.integrations.regenerateToken
  .use(authed)
  .handler(({ input, context }) => {
    const row = db
      .update(integrations)
      .set({ token: generateToken() })
      .where(
        and(
          eq(integrations.userId, context.user.id),
          eq(integrations.provider, input.provider),
        ),
      )
      .returning()
      .get();

    if (!row) {
      throw new ORPCError("NOT_FOUND", { message: "Integration not found" });
    }

    return serializeIntegration(row);
  });
