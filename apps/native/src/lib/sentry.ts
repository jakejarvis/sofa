import * as Sentry from "@sentry/react-native";

import { globalStorage } from "@/lib/mmkv";

const CRASH_REPORTING_ENABLED_KEY = "sofa_crash_reporting_enabled";
const CRASH_REPORTING_EXPLICIT_KEY = "sofa_crash_reporting_explicit";

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";

/** Whether the user has explicitly set a crash reporting preference. */
export function hasExplicitCrashPreference(): boolean {
  return globalStorage.getBoolean(CRASH_REPORTING_EXPLICIT_KEY) === true;
}

/** Current crash reporting enabled state (explicit preference or default=true). */
export function isCrashReportingEnabled(): boolean {
  return globalStorage.getBoolean(CRASH_REPORTING_ENABLED_KEY) ?? true;
}

/**
 * Called by the settings toggle — marks the preference as explicit.
 * Takes effect on next app restart (Sentry native handlers are installed at init).
 */
export function setCrashReportingEnabled(enabled: boolean): void {
  globalStorage.set(CRASH_REPORTING_ENABLED_KEY, enabled);
  globalStorage.set(CRASH_REPORTING_EXPLICIT_KEY, true);
}

/**
 * Initialize Sentry. Must be called at module scope in the root layout
 * (before any React renders) so native crash handlers are installed early.
 *
 * The `enabled` flag is read synchronously from MMKV. Toggling the
 * setting in Settings takes effect on the next app restart.
 */
export function initSentry(): void {
  if (!sentryDsn) return;

  Sentry.init({
    dsn: sentryDsn,
    enabled: isCrashReportingEnabled(),

    // --- Privacy ---
    sendDefaultPii: false,

    // --- Crashes only: disable performance/session features ---
    tracesSampleRate: 0,
    profilesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    attachScreenshot: false,
    attachViewHierarchy: false,

    beforeBreadcrumb(breadcrumb) {
      // Keep only console errors and sentry-internal breadcrumbs.
      // Drop navigation, http, UI tap, etc. to avoid leaking screen params.
      if (breadcrumb.category === "console" && breadcrumb.level === "error") {
        return breadcrumb;
      }
      if (breadcrumb.category === "sentry") {
        return breadcrumb;
      }
      return null;
    },

    // PII scrubbing for JS errors (does NOT run for native crashes, but
    // native crashes only contain stack traces + device info, no PII).
    beforeSend(event) {
      delete event.user;
      delete event.request;

      if (event.breadcrumbs) {
        for (const crumb of event.breadcrumbs) {
          if (crumb.data) {
            delete crumb.data.params;
            delete crumb.data.query;
          }
        }
      }

      return event;
    },

    integrations(integrations) {
      return integrations.filter((i) => {
        if (i.name === "Screenshot") return false;
        if (i.name === "ViewHierarchy") return false;
        if (i.name === "UserInteraction") return false;
        return true;
      });
    },

    environment: __DEV__ ? "development" : "production",
  });
}

export { Sentry };
