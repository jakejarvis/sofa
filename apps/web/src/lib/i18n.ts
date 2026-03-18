import { activateLocale, SUPPORTED_LOCALES, type SupportedLocale } from "@sofa/i18n";

const LOCALE_STORAGE_KEY = "sofa:locale";

export function getPersistedLocale(): SupportedLocale {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
    return stored as SupportedLocale;
  }
  const browserLang = navigator.language.split("-")[0];
  if (SUPPORTED_LOCALES.includes(browserLang as SupportedLocale)) {
    return browserLang as SupportedLocale;
  }
  return "en";
}

export function setPersistedLocale(locale: SupportedLocale): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.documentElement.lang = locale;
}

let initialized = false;

export async function initLocale(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const locale = getPersistedLocale();
  document.documentElement.lang = locale;
  if (locale !== "en") {
    await activateLocale(locale);
  }
}
