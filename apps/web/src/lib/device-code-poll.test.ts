import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { startDevicePoll } from "./device-code-poll";

const INTERVAL = 1000;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("startDevicePoll", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("only has one request in flight at a time", async () => {
    const pending = deferred<string>();
    const poll = vi.fn<(signal: AbortSignal) => Promise<string>>(() => pending.promise);
    const poller = startDevicePoll({
      poll,
      onResponse: () => false,
      onExpired: vi.fn<() => void>(),
      intervalMs: INTERVAL,
      expiresAt: Date.now() + 60 * INTERVAL,
    });

    await vi.advanceTimersByTimeAsync(INTERVAL * 3);
    expect(poll).toHaveBeenCalledTimes(1);
    poller.stop();
  });

  test("polls again after a response that is not final", async () => {
    const first = deferred<string>();
    const poll = vi.fn<(signal: AbortSignal) => Promise<string>>();
    poll.mockReturnValueOnce(first.promise);
    poll.mockResolvedValue("pending");
    const onResponse = vi.fn<(response: string) => boolean>(() => false);
    const poller = startDevicePoll({
      poll,
      onResponse,
      onExpired: vi.fn<() => void>(),
      intervalMs: INTERVAL,
      expiresAt: Date.now() + 60 * INTERVAL,
    });

    await vi.advanceTimersByTimeAsync(INTERVAL);
    expect(poll).toHaveBeenCalledTimes(1);

    first.resolve("pending");
    await vi.advanceTimersByTimeAsync(INTERVAL);
    expect(onResponse).toHaveBeenCalledTimes(2);
    expect(poll).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  test("drops late responses after stop()", async () => {
    const pending = deferred<string>();
    let received: AbortSignal | undefined;
    const poll = vi.fn<(signal: AbortSignal) => Promise<string>>((signal) => {
      received = signal;
      return pending.promise;
    });
    const onResponse = vi.fn<(response: string) => boolean>(() => false);
    const poller = startDevicePoll({
      poll,
      onResponse,
      onExpired: vi.fn<() => void>(),
      intervalMs: INTERVAL,
      expiresAt: Date.now() + 60 * INTERVAL,
    });

    await vi.advanceTimersByTimeAsync(INTERVAL);
    expect(poll).toHaveBeenCalledTimes(1);

    poller.stop();
    pending.resolve("late");
    await vi.advanceTimersByTimeAsync(INTERVAL * 3);

    expect(onResponse).not.toHaveBeenCalled();
    expect(received?.aborted).toBe(true);
    expect(poll).toHaveBeenCalledTimes(1);
  });

  test("calls onExpired once when the code expires before the first poll", async () => {
    const poll = vi.fn<(signal: AbortSignal) => Promise<string>>(async () => "pending");
    const onExpired = vi.fn<() => void>();
    startDevicePoll({
      poll,
      onResponse: () => false,
      onExpired,
      intervalMs: INTERVAL,
      expiresAt: Date.now() + INTERVAL / 2,
    });

    await vi.advanceTimersByTimeAsync(INTERVAL * 3);
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(poll).not.toHaveBeenCalled();
  });

  test("keeps polling after a request error", async () => {
    const poll = vi.fn<(signal: AbortSignal) => Promise<string>>();
    poll.mockRejectedValueOnce(new Error("network"));
    poll.mockResolvedValue("ok");
    const onResponse = vi.fn<(response: string) => boolean>(() => true);
    startDevicePoll({
      poll,
      onResponse,
      onExpired: vi.fn<() => void>(),
      intervalMs: INTERVAL,
      expiresAt: Date.now() + 60 * INTERVAL,
    });

    await vi.advanceTimersByTimeAsync(INTERVAL * 2);
    expect(poll).toHaveBeenCalledTimes(2);
    expect(onResponse).toHaveBeenCalledTimes(1);
    expect(onResponse).toHaveBeenCalledWith("ok");
  });
});
