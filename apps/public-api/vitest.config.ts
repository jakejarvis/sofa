import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
