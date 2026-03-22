import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import { clearAllTables, insertUser } from "@sofa/test/db";

import { setSetting } from "../src/settings";
import { isTelemetryEnabled, performTelemetryReport } from "../src/telemetry";

const TEST_NOW = new Date("2026-03-01T12:00:00Z");

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TEST_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  clearAllTables();
  insertUser("user-1");
});

describe("isTelemetryEnabled", () => {
  test("returns false when setting is not set", () => {
    expect(isTelemetryEnabled()).toBe(false);
  });

  test("returns true when setting is 'true'", () => {
    setSetting("telemetryEnabled", "true");
    expect(isTelemetryEnabled()).toBe(true);
  });

  test("returns false when setting is 'false'", () => {
    setSetting("telemetryEnabled", "false");
    expect(isTelemetryEnabled()).toBe(false);
  });
});

describe("performTelemetryReport", () => {
  test("skips when telemetry is disabled", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await performTelemetryReport();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("sends report when telemetry is enabled", async () => {
    setSetting("telemetryEnabled", "true");

    vi.spyOn(globalThis, "fetch").mockImplementation(
      (async () => new Response(null, { status: 200 })) as unknown as typeof fetch,
    );

    await performTelemetryReport();

    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    const url = String(call[0]);
    expect(url).toContain("/v1/telemetry");

    const init = call[1] as RequestInit;
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body as string);
    expect(body).toHaveProperty("instanceId");
    expect(body).toHaveProperty("version");
    expect(body).toHaveProperty("users");
    expect(body).toHaveProperty("titles");
    expect(body).toHaveProperty("features");
  });

  test("respects 24-hour report interval", async () => {
    setSetting("telemetryEnabled", "true");
    setSetting("telemetryLastReportedAt", TEST_NOW.toISOString());

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await performTelemetryReport();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("reports again after interval expires", async () => {
    setSetting("telemetryEnabled", "true");
    const oldDate = new Date(TEST_NOW.getTime() - 25 * 60 * 60 * 1000).toISOString();
    setSetting("telemetryLastReportedAt", oldDate);

    vi.spyOn(globalThis, "fetch").mockImplementation(
      (async () => new Response(null, { status: 200 })) as unknown as typeof fetch,
    );

    await performTelemetryReport();
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  test("does not throw on fetch failure", async () => {
    setSetting("telemetryEnabled", "true");

    vi.spyOn(globalThis, "fetch").mockImplementation(
      (async () => new Response(null, { status: 500 })) as unknown as typeof fetch,
    );

    await expect(performTelemetryReport()).resolves.toBeUndefined();
  });
});
