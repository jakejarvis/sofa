import type { SupportedLocale } from "./index";

export interface LocaleInfo {
  code: SupportedLocale;
  name: string;
  nativeName: string;
}

export const LOCALE_INFO: LocaleInfo[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "fr", name: "French", nativeName: "Fran\u00e7ais" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "es", name: "Spanish", nativeName: "Espa\u00f1ol" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "pt", name: "Portuguese", nativeName: "Portugu\u00eas" },
];
