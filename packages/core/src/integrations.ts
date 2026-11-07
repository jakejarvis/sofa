import {
  deleteIntegrationByUserAndProvider,
  getIntegrationByToken,
  getIntegrationByUserAndProvider,
  getRecentEventsForIntegrations,
  getUserIntegrations,
  insertIntegration,
  regenerateIntegrationToken,
  updateIntegrationSettings,
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
  serverUsername: string | null;
}) {
  return {
    ...row,
    serverUsername: row.serverUsername ?? null,
    lastEventAt: row.lastEventAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function listUserIntegrations(userId: string) {
  const userIntegrations = getUserIntegrations(userId);

  const integrationIds = userIntegrations.map((i) => i.id);
  const eventsByIntegration = getRecentEventsForIntegrations(integrationIds);

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

/** Trim a media server username; blank means "no filter". */
export function normalizeServerUsername(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function createOrUpdateIntegration(
  userId: string,
  provider: string,
  enabled?: boolean,
  serverUsername?: string | null,
) {
  const existing = getIntegrationByUserAndProvider(userId, provider);
  // The username filter only applies to webhook (media server) integrations.
  const acceptsUsername = integrationTypeFor(provider) === "webhook";

  if (existing) {
    const changes: { enabled?: boolean; serverUsername?: string | null } = {};
    if (enabled !== undefined) changes.enabled = enabled;
    if (serverUsername !== undefined && acceptsUsername) {
      changes.serverUsername = normalizeServerUsername(serverUsername);
    }
    if (Object.keys(changes).length > 0) {
      const row = updateIntegrationSettings(existing.id, changes);
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
    serverUsername: acceptsUsername ? normalizeServerUsername(serverUsername) : null,
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
