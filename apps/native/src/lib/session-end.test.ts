import { describe, expect, test } from "vitest";

import { consumeSessionEndReason, markSessionEnding } from "@/lib/session-end";

describe("session end reason", () => {
  test("defaults to null (session ended without the user asking)", () => {
    expect(consumeSessionEndReason()).toBeNull();
  });

  test("returns the marked reason once, then null", () => {
    markSessionEnding("sign-out");
    expect(consumeSessionEndReason()).toBe("sign-out");
    expect(consumeSessionEndReason()).toBeNull();
  });

  test("keeps the server-change reason distinct", () => {
    markSessionEnding("server-change");
    expect(consumeSessionEndReason()).toBe("server-change");
    expect(consumeSessionEndReason()).toBeNull();
  });
});
