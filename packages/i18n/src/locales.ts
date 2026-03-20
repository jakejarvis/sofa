export interface LocaleInfo {
  code: string;
  name: string;
  nativeName: string;
  isRTL: boolean;
}

export const LOCALE_INFO = [
  { code: "en", name: "English", nativeName: "English", isRTL: false },
  { code: "fr", name: "French", nativeName: "Fran\u00e7ais", isRTL: false },
  { code: "de", name: "German", nativeName: "Deutsch", isRTL: false },
  { code: "es", name: "Spanish", nativeName: "Espa\u00f1ol", isRTL: false },
  { code: "it", name: "Italian", nativeName: "Italiano", isRTL: false },
  { code: "pt", name: "Portuguese", nativeName: "Portugu\u00eas", isRTL: false },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", isRTL: false },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
    isRTL: true,
  },
  {
    code: "he",
    name: "Hebrew",
    nativeName: "\u05e2\u05d1\u05e8\u05d9\u05ea",
    isRTL: true,
  },
  {
    code: "zh",
    name: "Chinese",
    nativeName: "\u4e2d\u6587",
    isRTL: false,
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "\u65e5\u672c\u8a9e",
    isRTL: false,
  },
  {
    code: "ko",
    name: "Korean",
    nativeName: "\ud55c\uad6d\uc5b4",
    isRTL: false,
  },
] as const satisfies readonly LocaleInfo[];

export type SupportedLocale = (typeof LOCALE_INFO)[number]["code"];

export const SUPPORTED_LOCALES = LOCALE_INFO.map((l) => l.code) as SupportedLocale[];

export function isLocaleRTL(code: string): boolean {
  return LOCALE_INFO.find((l) => l.code === code)?.isRTL ?? false;
}

export function getDirection(code: string): "ltr" | "rtl" {
  return isLocaleRTL(code) ? "rtl" : "ltr";
}
