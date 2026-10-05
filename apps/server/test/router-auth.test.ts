import { isProcedure } from "@orpc/server";
import { describe, expect, test } from "vitest";

import { admin, authed } from "../src/orpc/middleware";
import { implementedRouter } from "../src/orpc/router";

// Procedures that are intentionally callable without a session.
const PUBLIC_PROCEDURES = new Set(["system.publicInfo"]);

function collectProcedures(
  node: unknown,
  path: string[] = [],
): { path: string; middlewares: readonly unknown[] }[] {
  if (isProcedure(node)) {
    return [{ path: path.join("."), middlewares: node["~orpc"].middlewares }];
  }
  return Object.entries(node as Record<string, unknown>).flatMap(([key, child]) =>
    collectProcedures(child, [...path, key]),
  );
}

const procedures = collectProcedures(implementedRouter);

describe("router authorization", () => {
  test("finds every procedure", () => {
    expect(procedures.length).toBeGreaterThanOrEqual(50);
  });

  test.each(procedures.filter((p) => !PUBLIC_PROCEDURES.has(p.path)))(
    "$path requires a session",
    ({ middlewares }) => {
      expect(middlewares.includes(authed) || middlewares.includes(admin)).toBe(true);
    },
  );

  test.each(procedures.filter((p) => p.path.startsWith("admin.")))(
    "$path requires an admin",
    ({ middlewares }) => {
      expect(middlewares.includes(admin)).toBe(true);
    },
  );

  test("public procedures have no auth middleware", () => {
    for (const proc of procedures.filter((p) => PUBLIC_PROCEDURES.has(p.path))) {
      expect(proc.middlewares.includes(authed) || proc.middlewares.includes(admin)).toBe(false);
    }
  });
});
