import { beforeEach, describe, expect, test } from "vitest";

import { clearAllTables, insertUser } from "@sofa/test/db";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T/;

import {
  createOrUpdateIntegration,
  deleteIntegration,
  findIntegrationByToken,
  listUserIntegrations,
  regenerateToken,
} from "../src/integrations";

beforeEach(() => {
  clearAllTables();
  insertUser("user-1");
});

describe("createOrUpdateIntegration", () => {
  test("creates a new webhook integration", () => {
    const result = createOrUpdateIntegration("user-1", "plex");
    expect(result.provider).toBe("plex");
    expect(result.type).toBe("webhook");
    expect(result.enabled).toBe(true);
    expect(result.token).toHaveLength(64); // 32 bytes hex
  });

  test("creates a list integration for sonarr", () => {
    const result = createOrUpdateIntegration("user-1", "sonarr");
    expect(result.type).toBe("list");
  });

  test("creates a list integration for radarr", () => {
    const result = createOrUpdateIntegration("user-1", "radarr");
    expect(result.type).toBe("list");
  });

  test("returns existing integration without duplicating", () => {
    const first = createOrUpdateIntegration("user-1", "plex");
    const second = createOrUpdateIntegration("user-1", "plex");
    expect(second.id).toBe(first.id);
    expect(second.token).toBe(first.token);
  });

  test("updates enabled state on existing integration", () => {
    createOrUpdateIntegration("user-1", "plex", true);
    const updated = createOrUpdateIntegration("user-1", "plex", false);
    expect(updated.enabled).toBe(false);
  });

  test("creates with enabled=false when specified", () => {
    const result = createOrUpdateIntegration("user-1", "jellyfin", false);
    expect(result.enabled).toBe(false);
  });

  test("has no username filter by default", () => {
    const result = createOrUpdateIntegration("user-1", "plex");
    expect(result.serverUsername).toBeNull();
  });

  test("saves a trimmed media server username", () => {
    const result = createOrUpdateIntegration("user-1", "plex", undefined, "  christian  ");
    expect(result.serverUsername).toBe("christian");
  });

  test("updates and clears the username without touching enabled", () => {
    createOrUpdateIntegration("user-1", "jellyfin", false);
    const updated = createOrUpdateIntegration("user-1", "jellyfin", undefined, "ana");
    expect(updated.serverUsername).toBe("ana");
    expect(updated.enabled).toBe(false);

    const cleared = createOrUpdateIntegration("user-1", "jellyfin", undefined, "   ");
    expect(cleared.serverUsername).toBeNull();
  });

  test("keeps the username when only enabled changes", () => {
    createOrUpdateIntegration("user-1", "emby", true, "ana");
    const updated = createOrUpdateIntegration("user-1", "emby", false);
    expect(updated.serverUsername).toBe("ana");
  });

  test("ignores a username for list integrations", () => {
    const result = createOrUpdateIntegration("user-1", "sonarr", undefined, "ana");
    expect(result.serverUsername).toBeNull();
  });
});

describe("listUserIntegrations", () => {
  test("returns empty list for user with no integrations", () => {
    const result = listUserIntegrations("user-1");
    expect(result.integrations).toHaveLength(0);
  });

  test("returns all integrations for user", () => {
    createOrUpdateIntegration("user-1", "plex");
    createOrUpdateIntegration("user-1", "jellyfin");

    const result = listUserIntegrations("user-1");
    expect(result.integrations).toHaveLength(2);
    const providers = result.integrations.map((i) => i.provider).sort();
    expect(providers).toEqual(["jellyfin", "plex"]);
  });

  test("does not return other users integrations", () => {
    insertUser("user-2");
    createOrUpdateIntegration("user-1", "plex");
    createOrUpdateIntegration("user-2", "jellyfin");

    const result = listUserIntegrations("user-1");
    expect(result.integrations).toHaveLength(1);
    expect(result.integrations[0].provider).toBe("plex");
  });

  test("serializes dates as ISO strings", () => {
    createOrUpdateIntegration("user-1", "plex");
    const result = listUserIntegrations("user-1");
    expect(result.integrations[0].createdAt).toMatch(ISO_DATE_RE);
  });
});

describe("deleteIntegration", () => {
  test("removes an integration", () => {
    createOrUpdateIntegration("user-1", "plex");
    deleteIntegration("user-1", "plex");

    const result = listUserIntegrations("user-1");
    expect(result.integrations).toHaveLength(0);
  });

  test("does not throw for nonexistent integration", () => {
    expect(() => deleteIntegration("user-1", "nonexistent")).not.toThrow();
  });
});

describe("findIntegrationByToken", () => {
  test("finds integration by token", () => {
    const created = createOrUpdateIntegration("user-1", "plex");
    const found = findIntegrationByToken(created.token);
    expect(found?.id).toBe(created.id);
  });

  test("returns undefined for invalid token", () => {
    expect(findIntegrationByToken("nonexistent")).toBeUndefined();
  });
});

describe("regenerateToken", () => {
  test("generates a new token for existing integration", () => {
    const created = createOrUpdateIntegration("user-1", "plex");
    const result = regenerateToken("user-1", "plex");
    expect(result?.token).not.toBe(created.token);
    expect(result?.token).toHaveLength(64);
  });
});
