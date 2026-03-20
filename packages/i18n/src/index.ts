import { i18n, type Messages } from "@lingui/core";

import type { SupportedLocale } from "./locales";
import { messages as enMessages } from "./po/en.po";

export { SUPPORTED_LOCALES, type SupportedLocale } from "./locales";

// English always bundled — zero async on default locale
i18n.load("en", enMessages);
i18n.activate("en");

const loaders: Record<Exclude<SupportedLocale, "en">, () => Promise<{ messages: Messages }>> = {
  fr: () => import("./po/fr.po"),
  de: () => import("./po/de.po"),
  es: () => import("./po/es.po"),
  it: () => import("./po/it.po"),
  pt: () => import("./po/pt.po"),
};

export async function activateLocale(locale: SupportedLocale): Promise<void> {
  if (locale === "en") {
    i18n.activate("en");
    return;
  }
  const { messages } = await loaders[locale]();
  i18n.load(locale, messages);
  i18n.activate(locale);
}

export { i18n };
