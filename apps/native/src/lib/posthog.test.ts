import { describe, expect, it, vi } from "vitest";

const store = new Map<string, boolean | string>();

vi.mock("@/lib/mmkv", () => ({
  globalStorage: {
    getBoolean: (key: string) => {
      const v = store.get(key);
      return typeof v === "boolean" ? v : undefined;
    },
    getString: (key: string) => {
      const v = store.get(key);
      return typeof v === "string" ? v : undefined;
    },
    set: (key: string, value: boolean | string) => {
      store.set(key, value);
    },
  },
}));

vi.mock("posthog-react-native", () => ({ PostHog: vi.fn<() => void>() }));

const mod = await import("./posthog");

describe("analytics consent", () => {
  it("is off by default", () => {
    store.clear();
    expect(mod.isAnalyticsEnabled()).toBe(false);
  });

  it("follows the explicit preference", () => {
    mod.setAnalyticsEnabled(true);
    expect(mod.isAnalyticsEnabled()).toBe(true);
    mod.setAnalyticsEnabled(false);
    expect(mod.isAnalyticsEnabled()).toBe(false);
  });
});

describe("screenNameFromSegments", () => {
  it("names screens from route patterns without dynamic values", () => {
    const f = mod.screenNameFromSegments;
    expect(f(["(tabs)", "(home)", "index"])).toBe("home");
    expect(f(["(tabs)", "(search)", "index"])).toBe("search");
    expect(f(["(tabs)", "(library)", "history"])).toBe("library/history");
    expect(f(["(tabs)", "(home)", "upcoming"])).toBe("home/upcoming");
    expect(f(["(auth)", "login"])).toBe("login");
    expect(f(["title", "[id]"])).toBe("title/[id]");
    expect(f(["person", "[id]"])).toBe("person/[id]");
    expect(f([])).toBe("home");
  });
});
