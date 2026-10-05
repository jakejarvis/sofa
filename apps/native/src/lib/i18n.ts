import { reloadAppAsync } from "expo";
import * as Localization from "expo-localization";
import { I18nManager } from "react-native";

import { activateLocale, isLocaleRTL, type SupportedLocale } from "@sofa/i18n";

import { globalStorage } from "./mmkv";
import { resolveLocale } from "./resolve-locale";

// Written by app versions that had an in-app language picker. The OS language setting is now the
// only source of truth; the key is deleted on launch.
const LEGACY_LOCALE_STORAGE_KEY = "sofa:locale";

let appliedLocale: SupportedLocale | null = null;

export function getDeviceLocale(): SupportedLocale {
  return resolveLocale(Localization.getLocales().map((l) => l.languageTag));
}

/**
 * Activate `locale`'s catalog. When its layout direction differs from the running one, store the
 * new direction and reload: React Native only reads it at start-up. The flag is persisted
 * natively, so this also clears a direction forced by the old in-app picker.
 */
export function applyLocale(locale: SupportedLocale): Promise<void> {
  if (locale === appliedLocale) return Promise.resolve();
  appliedLocale = locale;
  const rtl = isLocaleRTL(locale);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  if (I18nManager.isRTL !== rtl) {
    reloadAppAsync();
  }
  return activateLocale(locale);
}

export function initLocale(): Promise<void> {
  globalStorage.remove(LEGACY_LOCALE_STORAGE_KEY);
  return applyLocale(getDeviceLocale());
}
