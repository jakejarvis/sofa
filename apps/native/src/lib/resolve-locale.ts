import { SUPPORTED_LOCALES, type SupportedLocale } from "@sofa/i18n/locales";

const SUBTAG_SEPARATOR = /[-_]/;

// Android's java.util.Locale can still report Hebrew as the legacy "iw".
const LEGACY_LANGUAGE_CODES: Record<string, string> = { iw: "he" };

/**
 * The first of the user's preferred languages (BCP-47 tags, in preference order) that Sofa has a
 * catalog for, else English. Matches on the primary language subtag: "pt-BR" → "pt",
 * "zh-Hant-TW" → "zh".
 */
export function resolveLocale(
  languageTags: readonly (string | null | undefined)[],
): SupportedLocale {
  for (const tag of languageTags) {
    if (!tag) continue;
    const primary = (tag.split(SUBTAG_SEPARATOR)[0] ?? "").toLowerCase();
    const code = LEGACY_LANGUAGE_CODES[primary] ?? primary;
    if ((SUPPORTED_LOCALES as readonly string[]).includes(code)) {
      return code as SupportedLocale;
    }
  }
  return "en";
}
