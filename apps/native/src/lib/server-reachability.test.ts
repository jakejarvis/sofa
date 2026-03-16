import { afterEach, expect, mock, test } from "bun:test";

mock.module("expo-network", () => ({
  addNetworkStateListener() {
    return {
      remove() {},
    };
  },
  getNetworkStateAsync: async () => ({
    isConnected: true,
    isInternetReachable: true,
  }),
}));

mock.module("react-native", () => ({
  AppState: {
    currentState: "active",
    addEventListener() {
      return {
        remove() {},
      };
    },
  },
}));

mock.module("@/lib/server-url", () => ({
  onServerUrlChange: () => () => {},
}));

afterEach(() => {
  mock.restore();
});

test("transport failures set unreachable and any server response clears it", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;

  globalThis.fetch = mock(() => {
    requestCount += 1;

    if (requestCount === 1) {
      return Promise.reject(new TypeError("Network request failed"));
    }

    return Promise.resolve(new Response(null, { status: 503 }));
  }) as unknown as typeof fetch;

  try {
    const { getIsReachable, serverFetch } = await import(
      "./server-reachability"
    );

    await expect(serverFetch("http://sofa.test/rpc")).rejects.toThrow(
      "Network request failed",
    );
    expect(getIsReachable()).toBe(false);

    const response = await serverFetch("http://sofa.test/api/auth/session");
    expect(response.status).toBe(503);
    expect(getIsReachable()).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
