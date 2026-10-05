import { describe, expect, test } from "vitest";

import { QUERY_GC_TIME, QUERY_PERSIST_MAX_AGE } from "@/lib/query-config";

describe("query cache lifetimes", () => {
  test("gcTime is at least the persister maxAge", () => {
    expect(QUERY_GC_TIME).toBeGreaterThanOrEqual(QUERY_PERSIST_MAX_AGE);
  });
});
