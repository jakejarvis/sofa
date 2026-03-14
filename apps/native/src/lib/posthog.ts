import type { PostHogCustomStorage } from "posthog-react-native";
import { PostHog } from "posthog-react-native";

import { globalStorage } from "@/lib/mmkv";

const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

const ANALYTICS_ENABLED_KEY = "sofa_analytics_enabled";
const ANALYTICS_EXPLICIT_KEY = "sofa_analytics_explicit";
const ATT_MIGRATED_KEY = "sofa_att_migrated";

const posthogStorage: PostHogCustomStorage = {
  getItem: (key: string) => globalStorage.getString(key) ?? null,
  setItem: (key: string, value: string) => globalStorage.set(key, value),
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
  return globalStorage.getBoolean(ANALYTICS_EXPLICIT_KEY) === true;
}

/** Current analytics enabled state (explicit preference or default). */
export function isAnalyticsEnabled(): boolean {
  return globalStorage.getBoolean(ANALYTICS_ENABLED_KEY) ?? true;
}

/** Called by the settings toggle — marks the preference as explicit. */
export function setAnalyticsEnabled(enabled: boolean): void {
  globalStorage.set(ANALYTICS_ENABLED_KEY, enabled);
  globalStorage.set(ANALYTICS_EXPLICIT_KEY, true);
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
  // One-time migration: on the first launch after the ATT update, check if
  // the user had previously toggled analytics via the settings switch (which
  // was the only way ANALYTICS_ENABLED_KEY got set before ATT). If so,
  // promote it to an explicit preference so the ATT result doesn't overwrite
  // it. This runs exactly once — subsequent launches skip it because
  // ATT_MIGRATED_KEY is set, preventing applyTrackingTransparency's own
  // writes to ANALYTICS_ENABLED_KEY from being misidentified as legacy.
  if (!globalStorage.getBoolean(ATT_MIGRATED_KEY)) {
    globalStorage.set(ATT_MIGRATED_KEY, true);
    if (
      globalStorage.getBoolean(ANALYTICS_ENABLED_KEY) !== undefined &&
      !hasExplicitPreference()
    ) {
      globalStorage.set(ANALYTICS_EXPLICIT_KEY, true);
    }
  }

  if (hasExplicitPreference()) {
    // User already made a choice in settings — honour it.
    const enabled = isAnalyticsEnabled();
    syncPosthog(enabled);
    return enabled;
  }

  // No explicit preference yet — follow the ATT result.
  globalStorage.set(ANALYTICS_ENABLED_KEY, granted);
  syncPosthog(granted);
  return granted;
}
