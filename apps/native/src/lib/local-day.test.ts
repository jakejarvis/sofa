import { describe, expect, test } from "vitest";

import { msUntilNextLocalMidnight } from "./local-day";

describe("msUntilNextLocalMidnight", () => {
  test("counts down to one second past local midnight", () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 0, 5, 23, 59, 0))).toBe(61_000);
  });
});
