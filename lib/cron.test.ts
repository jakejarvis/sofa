import { describe, expect, mock, test } from "bun:test";

mock.module("@/lib/services/availability", () => ({
  refreshAvailability: async () => {},
}));
mock.module("@/lib/services/backup", () => ({
  createBackup: async () => ({}),
  ensureBackupDir: async () => {},
  pruneBackups: async () => {},
}));
mock.module("@/lib/services/credits", () => ({
  refreshCredits: async () => {},
}));
mock.module("@/lib/services/image-cache", () => ({
  cacheEpisodeStills: async () => {},
  cacheImagesForTitle: async () => {},
  cacheProfilePhotos: async () => {},
  cacheProviderLogos: async () => {},
  imageCacheEnabled: () => false,
}));
mock.module("@/lib/services/metadata", () => ({
  refreshRecommendations: async () => {},
  refreshTitle: async () => {},
  refreshTvChildren: async () => {},
}));
mock.module("@/lib/services/update-check", () => ({
  performUpdateCheck: async () => ({}),
}));
mock.module("@/lib/tmdb/client", () => ({
  getTvDetails: async () => ({}),
}));

import { buildBackupCron } from "./cron";

describe("buildBackupCron", () => {
  test("6h frequency", () => {
    expect(buildBackupCron("6h", "02:00")).toBe("0 */6 * * *");
  });

  test("12h frequency", () => {
    expect(buildBackupCron("12h", "02:00")).toBe("0 2,14 * * *");
  });

  test("1d frequency (default)", () => {
    expect(buildBackupCron("1d", "03:30")).toBe("30 3 * * *");
  });

  test("7d frequency with day of week", () => {
    expect(buildBackupCron("7d", "04:15", 3)).toBe("15 4 * * 3");
  });

  test("7d frequency defaults to Sunday (0)", () => {
    expect(buildBackupCron("7d", "02:00")).toBe("0 2 * * 0");
  });

  test("defaults to 1d when called with no args", () => {
    expect(buildBackupCron()).toBe("0 2 * * *");
  });

  test("handles invalid time gracefully", () => {
    const result = buildBackupCron("1d", "invalid");
    expect(result).toBe("0 2 * * *");
  });

  test("6h ignores hour from time, uses minute only", () => {
    expect(buildBackupCron("6h", "14:45")).toBe("45 */6 * * *");
  });

  test("12h wraps hour correctly", () => {
    expect(buildBackupCron("12h", "18:00")).toBe("0 18,6 * * *");
  });
});
