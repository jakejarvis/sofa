import {
  deleteIntegrationByUserAndProvider,
  getIntegrationByToken,
  getIntegrationByUserAndProvider,
  getRecentEventsForIntegration,
  getUserIntegrations,
  insertIntegration,
  regenerateIntegrationToken,
  updateIntegrationEnabled,
} from "@sofa/db/queries/integrations";

const LIST_PROVIDERS = new Set(["sonarr", "radarr"]);

function integrationTypeFor(provider: string): "webhook" | "list" {
  return LIST_PROVIDERS.has(provider) ? "list" : "webhook";
}

function generateToken() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex");
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

export function listUserIntegrations(userId: string) {
  const userIntegrations = getUserIntegrations(userId);

  const eventsByIntegration = new Map<string, ReturnType<typeof getRecentEventsForIntegration>>();
  for (const integration of userIntegrations) {
    const events = getRecentEventsForIntegration(integration.id);
    eventsByIntegration.set(integration.id, events);
  }

  const result = userIntegrations.map((integration) => {
    const events = eventsByIntegration.get(integration.id) ?? [];
    return Object.assign(serializeIntegration(integration), {
      recentEvents: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        mediaType: e.mediaType,
        mediaTitle: e.mediaTitle,
        status: e.status,
        receivedAt: e.receivedAt.toISOString(),
      })),
    });
  });

  return { integrations: result };
}

export function createOrUpdateIntegration(userId: string, provider: string, enabled?: boolean) {
  const existing = getIntegrationByUserAndProvider(userId, provider);

  if (existing) {
    if (enabled !== undefined) {
      const row = updateIntegrationEnabled(existing.id, enabled);
      return serializeIntegration(row);
    }
    return serializeIntegration(existing);
  }

  const row = insertIntegration({
    userId,
    provider,
    type: integrationTypeFor(provider),
    token: generateToken(),
    enabled: enabled ?? true,
    createdAt: new Date(),
  });

  return serializeIntegration(row);
}

export function deleteIntegration(userId: string, provider: string): void {
  deleteIntegrationByUserAndProvider(userId, provider);
}

export function regenerateToken(userId: string, provider: string) {
  return regenerateIntegrationToken(userId, provider, generateToken());
}

export function findIntegrationByToken(token: string) {
  return getIntegrationByToken(token);
}

export { serializeIntegration };
