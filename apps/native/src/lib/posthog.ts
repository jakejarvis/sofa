import type { PostHogCustomStorage } from "posthog-react-native";
import { PostHog } from "posthog-react-native";

import { globalStorage } from "@/lib/mmkv";

const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

const ANALYTICS_ENABLED_KEY = "sofa_analytics_enabled";
const ANALYTICS_EXPLICIT_KEY = "sofa_analytics_explicit";

const posthogStorage: PostHogCustomStorage = {
  getItem: (key: string) => globalStorage.getString(key) ?? null,
  setItem: (key: string, value: string) => globalStorage.set(key, value),
};

// PostHog throws if apiKey is empty, so only construct when configured.
// Start opted-out; initAnalytics() in root layout will opt in based on stored preference.
export const posthog: PostHog | null = posthogApiKey
  ? new PostHog(posthogApiKey, {
      host,
      defaultOptIn: false,
      customStorage: posthogStorage,
      captureAppLifecycleEvents: true,
      personProfiles: "never",
      errorTracking: {
        autocapture: {
          uncaughtExceptions: true,
          unhandledRejections: true,
        },
      },
    })
  : null;

/** Current analytics enabled state: explicit preference, else off — see docs/content/docs/telemetry.mdx. */
export function isAnalyticsEnabled(): boolean {
  return globalStorage.getBoolean(ANALYTICS_ENABLED_KEY) ?? false;
}

/** Route groups that only wrap layouts; the tab groups inside `(tabs)` do name the screen. */
const LAYOUT_GROUPS = new Set(["(tabs)", "(auth)"]);

/**
 * PostHog screen name from Expo Router segments, without dynamic values:
 * ["(tabs)", "(search)", "index"] → "search", ["(tabs)", "(library)", "history"] →
 * "library/history", ["title", "[id]"] → "title/[id]".
 */
export function screenNameFromSegments(segments: readonly string[]): string {
  const parts = segments
    .filter((s) => !LAYOUT_GROUPS.has(s) && s !== "index")
    .map((s) => (s.startsWith("(") && s.endsWith(")") ? s.slice(1, -1) : s));
  return parts.length > 0 ? parts.join("/") : "home";
}

/** Called by the settings toggle — marks the preference as explicit. */
export function setAnalyticsEnabled(enabled: boolean): void {
  globalStorage.set(ANALYTICS_ENABLED_KEY, enabled);
  globalStorage.set(ANALYTICS_EXPLICIT_KEY, true);
  syncPosthog(enabled);
}

/**
 * Sync PostHog opt-in/out state based on the resolved analytics flag.
 * Called from initAnalytics() and from the settings toggle.
 */
export function syncPosthog(enabled: boolean): void {
  if (enabled) {
    posthog?.optIn();
  } else {
    posthog?.optOut();
  }
}

/**
 * Initialize analytics on app startup.
 * Reads the stored preference and syncs PostHog opt-in/out state.
 */
export function initAnalytics(): void {
  syncPosthog(isAnalyticsEnabled());
}
