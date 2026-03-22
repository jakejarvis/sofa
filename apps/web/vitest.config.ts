import { playwright } from "@vitest/browser-playwright";
import { defineProject, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineProject({
    test: {
      include: ["src/**/*.test.{ts,tsx}"],
      browser: {
        enabled: true,
        provider: playwright(),
        instances: [{ browser: "chromium", headless: true }],
      },
    },
  }),
);
