import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*", "apps/*"],
    coverage: {
      enabled: true,
      provider: "v8",
      exclude: ["**/node_modules/**", "**/*.json"],
    },
  },
});
