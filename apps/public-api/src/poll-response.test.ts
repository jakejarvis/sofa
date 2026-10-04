import { describe, expect, test } from "vitest";

import { authorizedPollBody, MAX_POLL_RESPONSE_BYTES } from "./poll-response";

describe("authorizedPollBody", () => {
  test("passes small payloads through", () => {
    expect(authorizedPollBody({ a: 1 })).toEqual({ status: "authorized", data: { a: 1 } });
  });

  test("turns an oversized payload into a fetch_error", () => {
    const body = authorizedPollBody({ blob: "x".repeat(MAX_POLL_RESPONSE_BYTES) });
    expect(body).toMatchObject({
      status: "fetch_error",
      error: expect.stringContaining("export file"),
    });
  });
});
