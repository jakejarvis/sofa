import type { PostHogCustomStorage } from "posthog-react-native";
import { PostHog } from "posthog-react-native";

import { storage } from "@/lib/mmkv";

const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

const ANALYTICS_ENABLED_KEY = "sofa_analytics_enabled";

const posthogStorage: PostHogCustomStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
};

// PostHog throws if apiKey is empty, so only construct when configured.
export const posthog: PostHog | null = posthogApiKey
  ? new PostHog(posthogApiKey, {
      host,
      defaultOptIn: storage.getBoolean(ANALYTICS_ENABLED_KEY) ?? true,
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

export function isAnalyticsEnabled(): boolean {
  return storage.getBoolean(ANALYTICS_ENABLED_KEY) ?? true;
}

export function setAnalyticsEnabled(enabled: boolean): void {
  storage.set(ANALYTICS_ENABLED_KEY, enabled);
  if (enabled) {
    posthog?.optIn();
  } else {
    posthog?.optOut();
  }
}
