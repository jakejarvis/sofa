import { reloadAppAsync } from "expo";
import * as Localization from "expo-localization";
import { I18nManager } from "react-native";

import { activateLocale, isLocaleRTL, SUPPORTED_LOCALES, type SupportedLocale } from "@sofa/i18n";

import { globalStorage } from "./mmkv";

const LOCALE_STORAGE_KEY = "sofa:locale";

export function getPersistedLocale(): SupportedLocale {
  const stored = globalStorage.getString(LOCALE_STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
    return stored as SupportedLocale;
  }
  const deviceLocales = Localization.getLocales();
  for (const loc of deviceLocales) {
    const lang = loc.languageCode;
    if (lang && SUPPORTED_LOCALES.includes(lang as SupportedLocale)) {
      return lang as SupportedLocale;
    }
  }
  return "en";
}

export function setPersistedLocale(locale: SupportedLocale): void {
  globalStorage.set(LOCALE_STORAGE_KEY, locale);
  const rtl = isLocaleRTL(locale);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}

export function initLocale(): Promise<void> {
  const locale = getPersistedLocale();
  const rtl = isLocaleRTL(locale);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  // forceRTL only takes effect on the next launch — if the current layout
  // doesn't match (e.g. fresh install on an RTL device), reload immediately.
  if (I18nManager.isRTL !== rtl) {
    reloadAppAsync();
  }
  if (locale !== "en") {
    return activateLocale(locale);
  }
  return Promise.resolve();
}
