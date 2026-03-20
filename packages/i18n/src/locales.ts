export interface LocaleInfo {
  code: string;
  name: string;
  nativeName: string;
}

export const LOCALE_INFO = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "fr", name: "French", nativeName: "Fran\u00e7ais" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "es", name: "Spanish", nativeName: "Espa\u00f1ol" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "pt", name: "Portuguese", nativeName: "Portugu\u00eas" },
] as const satisfies readonly LocaleInfo[];

export type SupportedLocale = (typeof LOCALE_INFO)[number]["code"];

export const SUPPORTED_LOCALES = LOCALE_INFO.map((l) => l.code) as SupportedLocale[];
