import { beforeEach, describe, expect, test } from "bun:test";

import { user } from "@sofa/db/schema";
import { clearAllTables, eq, insertUser, testDb } from "@sofa/db/test-utils";

import {
  claimInitialAdmin,
  getSetting,
  getUserCount,
  isRegistrationOpen,
  setSetting,
} from "../src/settings";

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

describe("claimInitialAdmin", () => {
  test("promotes the earliest user to admin and closes registration", () => {
    insertUser("user-1");
    insertUser("user-2");

    expect(claimInitialAdmin("user-2")).toBe(false);
    expect(claimInitialAdmin("user-1")).toBe(true);
    expect(claimInitialAdmin("user-1")).toBe(false);

    const firstUser = testDb.select().from(user).where(eq(user.id, "user-1")).get();
    const secondUser = testDb.select().from(user).where(eq(user.id, "user-2")).get();

    expect(firstUser?.role).toBe("admin");
    expect(secondUser?.role).toBe("user");
    expect(getSetting("registrationOpen")).toBe("false");
  });
});
