import { playwright } from "@vitest/browser-playwright";
import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium", headless: true }],
    },
  },
});
