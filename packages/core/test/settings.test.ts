import { beforeEach, describe, expect, test } from "bun:test";
import {
  getSetting,
  getUserCount,
  isRegistrationOpen,
  setSetting,
} from "../src/settings";
import { clearAllTables, insertUser } from "./sqlite";

beforeEach(() => {
  clearAllTables();
});

// ── getSetting / setSetting ─────────────────────────────────────────

describe("getSetting / setSetting", () => {
  test("returns null for missing key", () => {
    expect(getSetting("nonexistent")).toBeNull();
  });

  test("stores and retrieves a value", () => {
    setSetting("theme", "dark");
    expect(getSetting("theme")).toBe("dark");
  });

  test("upserts: overwrites existing value", () => {
    setSetting("theme", "dark");
    setSetting("theme", "light");
    expect(getSetting("theme")).toBe("light");
  });
});

// ── getUserCount ────────────────────────────────────────────────────

describe("getUserCount", () => {
  test("returns 0 when no users", () => {
    expect(getUserCount()).toBe(0);
  });

  test("returns correct count", () => {
    insertUser("user-1");
    insertUser("user-2");
    expect(getUserCount()).toBe(2);
  });
});

// ── isRegistrationOpen ──────────────────────────────────────────────

describe("isRegistrationOpen", () => {
  test("returns true when no users exist (first-run)", () => {
    expect(isRegistrationOpen()).toBe(true);
  });

  test("returns false when users exist and setting is not set", () => {
    insertUser();
    expect(isRegistrationOpen()).toBe(false);
  });

  test("returns true when users exist and setting is 'true'", () => {
    insertUser();
    setSetting("registrationOpen", "true");
    expect(isRegistrationOpen()).toBe(true);
  });

  test("returns false when users exist and setting is 'false'", () => {
    insertUser();
    setSetting("registrationOpen", "false");
    expect(isRegistrationOpen()).toBe(false);
  });
});
