import { beforeEach, describe, expect, test } from "vitest";

import { clearAllTables, insertUser, testDb } from "@sofa/test/db";

import { deleteExpiredSessions, deleteExpiredVerifications } from "../src/queries/auth-cleanup";
import { session, verification } from "../src/schema";

const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  clearAllTables();
});

describe("deleteExpiredSessions", () => {
  test("deletes only expired sessions", () => {
    insertUser("u1");
    const now = new Date();
    testDb
      .insert(session)
      .values([
        {
          id: "s-old",
          userId: "u1",
          token: "tok-old",
          expiresAt: new Date(Date.now() - HOUR),
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "s-new",
          userId: "u1",
          token: "tok-new",
          expiresAt: new Date(Date.now() + HOUR),
          createdAt: now,
          updatedAt: now,
        },
      ])
      .run();

    expect(deleteExpiredSessions()).toBe(1);
    expect(
      testDb
        .select()
        .from(session)
        .all()
        .map((s) => s.id),
    ).toEqual(["s-new"]);
  });
});

describe("deleteExpiredVerifications", () => {
  test("deletes only expired verifications", () => {
    const now = new Date();
    testDb
      .insert(verification)
      .values([
        {
          id: "v-old",
          identifier: "a@example.com",
          value: "x",
          expiresAt: new Date(Date.now() - HOUR),
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "v-new",
          identifier: "b@example.com",
          value: "y",
          expiresAt: new Date(Date.now() + HOUR),
          createdAt: now,
          updatedAt: now,
        },
      ])
      .run();

    expect(deleteExpiredVerifications()).toBe(1);
    expect(
      testDb
        .select()
        .from(verification)
        .all()
        .map((v) => v.id),
    ).toEqual(["v-new"]);
  });
});
