import {
  activateLocale,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@sofa/i18n";
import * as Localization from "expo-localization";
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
}

export function initLocale(): void {
  const locale = getPersistedLocale();
  if (locale !== "en") {
    activateLocale(locale);
  }
}
