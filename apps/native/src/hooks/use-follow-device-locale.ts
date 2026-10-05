import { useLocales } from "expo-localization";
import { useEffect } from "react";

import { applyLocale } from "@/lib/i18n";
import { resolveLocale } from "@/lib/resolve-locale";

/**
 * Keep the app language in step with the OS setting. Android delivers per-app and system language
 * changes without restarting the activity; iOS relaunches the app instead, so there this only
 * confirms the language chosen at start-up.
 */
export function useFollowDeviceLocale(): void {
  const deviceLocales = useLocales();
  const locale = resolveLocale(deviceLocales.map((l) => l.languageTag));

  useEffect(() => {
    applyLocale(locale).catch(() => {});
  }, [locale]);
}
