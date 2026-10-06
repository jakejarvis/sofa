import { describe, expect, test } from "vitest";

import { restoreRootFileType } from "../src/orpc/restore-file-type";

async function resolveThroughInterceptor(
  headers: Record<string, string | undefined>,
  body: unknown,
): Promise<unknown> {
  let resolved: unknown;
  await restoreRootFileType()({
    request: { url: "/rpc/x", method: "POST", headers, resolveBody: async () => body },
    next: async (options?: { request: { resolveBody: () => Promise<unknown> } }) => {
      resolved = await (
        options ?? { request: { resolveBody: async () => body } }
      ).request.resolveBody();
      return { matched: false };
    },
  } as never);
  return resolved;
}

describe("restoreRootFileType", () => {
  test("re-types a root-level File from the Content-Type header", async () => {
    const wrong = new File([new Uint8Array([1, 2, 3])], "a.png", {
      type: "text/plain;charset=utf-8",
    });
    const result = await resolveThroughInterceptor({ "content-type": "image/png" }, wrong);
    expect(result).toBeInstanceOf(File);
    expect((result as File).type).toBe("image/png");
    expect((result as File).name).toBe("a.png");
    expect((result as File).size).toBe(3);
  });

  test("leaves non-File bodies untouched", async () => {
    const json = { a: 1 };
    expect(await resolveThroughInterceptor({ "content-type": "application/json" }, json)).toBe(
      json,
    );
  });

  test("leaves a File alone when the type already matches", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    expect(await resolveThroughInterceptor({ "content-type": "image/png" }, file)).toBe(file);
  });

  test("passes through when there is no Content-Type header", async () => {
    const file = new File(["x"], "a.bin", { type: "" });
    expect(await resolveThroughInterceptor({}, file)).toBe(file);
  });
});
