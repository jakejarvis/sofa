import type { PostHogCustomStorage } from "posthog-react-native";
import { PostHog } from "posthog-react-native";

import { storage } from "@/lib/mmkv";

const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

const ANALYTICS_ENABLED_KEY = "sofa_analytics_enabled";
const ANALYTICS_EXPLICIT_KEY = "sofa_analytics_explicit";

const posthogStorage: PostHogCustomStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
};

// PostHog throws if apiKey is empty, so only construct when configured.
// Start opted-out; the ATT check in root layout will opt in if appropriate.
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

/** Whether the user has explicitly set a preference via the settings toggle. */
export function hasExplicitPreference(): boolean {
  return storage.getBoolean(ANALYTICS_EXPLICIT_KEY) === true;
}

/** Current analytics enabled state (explicit preference or default). */
export function isAnalyticsEnabled(): boolean {
  return storage.getBoolean(ANALYTICS_ENABLED_KEY) ?? true;
}

/** Called by the settings toggle — marks the preference as explicit. */
export function setAnalyticsEnabled(enabled: boolean): void {
  storage.set(ANALYTICS_ENABLED_KEY, enabled);
  storage.set(ANALYTICS_EXPLICIT_KEY, true);
  syncPosthog(enabled);
}

/**
 * Sync PostHog opt-in/out state based on the resolved analytics flag.
 * Called after ATT check and from the settings toggle.
 */
export function syncPosthog(enabled: boolean): void {
  if (enabled) {
    posthog?.optIn();
  } else {
    posthog?.optOut();
  }
}

/**
 * Resolve analytics state after an ATT permission check.
 * If the user has an explicit preference (or a legacy preference from before
 * ATT was introduced), that wins. Otherwise the ATT result is stored as the
 * current default and PostHog is synced.
 *
 * Returns the resolved enabled state so callers can decide whether to proceed
 * with identifying, etc.
 */
export function applyTrackingTransparency(granted: boolean): boolean {
  // Migrate legacy preference: if the user previously toggled analytics
  // (ANALYTICS_ENABLED_KEY exists) but the explicit flag was never set
  // (pre-ATT upgrade), treat it as an explicit choice so we don't overwrite it.
  const legacyValue = storage.getBoolean(ANALYTICS_ENABLED_KEY);
  if (legacyValue !== undefined && !hasExplicitPreference()) {
    storage.set(ANALYTICS_EXPLICIT_KEY, true);
  }

  if (hasExplicitPreference()) {
    // User already made a choice in settings — honour it.
    const enabled = isAnalyticsEnabled();
    syncPosthog(enabled);
    return enabled;
  }

  // No explicit preference yet — follow the ATT result.
  storage.set(ANALYTICS_ENABLED_KEY, granted);
  syncPosthog(granted);
  return granted;
}
