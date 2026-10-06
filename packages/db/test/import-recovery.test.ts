import { beforeEach, describe, expect, test } from "vitest";

import { clearAllTables, eq, insertUser, testDb } from "@sofa/test/db";

import { recoverStaleImportJobs } from "../src/queries/imports";
import { importJobs } from "../src/schema";

beforeEach(() => {
  clearAllTables();
});

function insertJob(
  id: string,
  userId: string,
  status: "pending" | "running" | "success" | "cancelled",
) {
  testDb
    .insert(importJobs)
    .values({
      id,
      userId,
      source: "trakt",
      status,
      payload: "{}",
      importWatches: true,
      importWatchlist: true,
      importRatings: true,
      createdAt: new Date(),
    })
    .run();
}

function getJob(id: string) {
  return testDb.select().from(importJobs).where(eq(importJobs.id, id)).get()!;
}

describe("recoverStaleImportJobs", () => {
  test("errors out pending and running jobs only", () => {
    insertUser("u1");
    // importJobs_active_user allows one pending/running job per user
    insertUser("u2");
    insertJob("j-pending", "u1", "pending");
    insertJob("j-running", "u2", "running");
    insertJob("j-success", "u1", "success");
    insertJob("j-cancelled", "u1", "cancelled");

    expect(recoverStaleImportJobs()).toBe(2);

    for (const id of ["j-pending", "j-running"]) {
      const job = getJob(id);
      expect(job.status).toBe("error");
      expect(job.finishedAt).toBeInstanceOf(Date);
      expect(job.errors).toContain("Import interrupted by server restart");
    }
    for (const [id, status] of [
      ["j-success", "success"],
      ["j-cancelled", "cancelled"],
    ] as const) {
      const job = getJob(id);
      expect(job.status).toBe(status);
      expect(job.finishedAt).toBeNull();
      expect(job.errors).toBeNull();
    }
  });
});
