export interface DevicePollOptions<T> {
  /** One poll request. Receives an AbortSignal that fires when the poller stops. */
  poll: (signal: AbortSignal) => Promise<T>;
  /** Called with each response; return true to stop polling. Never called after stop(). */
  onResponse: (response: T) => boolean;
  /** Called once when expiresAt passes without onResponse returning true. */
  onExpired: () => void;
  intervalMs: number;
  expiresAt: number;
}

/**
 * Polls one request at a time: the next request is scheduled only after the previous one
 * settles, and nothing is delivered after stop(). Request errors are ignored (keep polling).
 */
export function startDevicePoll<T>(options: DevicePollOptions<T>): { stop: () => void } {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const stop = () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    controller.abort();
  };

  const tick = async () => {
    if (stopped) return;
    if (Date.now() > options.expiresAt) {
      stop();
      options.onExpired();
      return;
    }
    try {
      const response = await options.poll(controller.signal);
      if (stopped) return;
      if (options.onResponse(response)) {
        stop();
        return;
      }
    } catch {
      if (stopped) return;
    }
    timer = setTimeout(tick, options.intervalMs);
  };

  timer = setTimeout(tick, options.intervalMs);
  return { stop };
}
