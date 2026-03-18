import { i18n, type Messages } from "@lingui/core";
import { messages as enMessages } from "./po/en";

export const SUPPORTED_LOCALES = ["en", "fr", "de", "es", "it", "pt"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// English always bundled — zero async on default locale
i18n.load("en", enMessages);
i18n.activate("en");

const loaders: Record<string, () => Promise<{ messages: Messages }>> = {
  fr: () => import("./po/fr"),
  de: () => import("./po/de"),
  es: () => import("./po/es"),
  it: () => import("./po/it"),
  pt: () => import("./po/pt"),
};

export async function activateLocale(locale: SupportedLocale): Promise<void> {
  if (locale === "en") {
    i18n.activate("en");
    return;
  }
  const loader = loaders[locale];
  if (!loader) {
    i18n.activate("en");
    return;
  }
  const { messages } = await loader();
  i18n.load(locale, messages);
  i18n.activate(locale);
}

export { i18n };
