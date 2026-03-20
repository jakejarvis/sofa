import { defineConfig } from "@lingui/conf";
import { formatter } from "@lingui/format-po";

export default defineConfig({
  locales: ["en", "fr", "de", "es", "it", "pt", "nl", "ar", "he", "zh", "ja", "ko"],
  sourceLocale: "en",
  catalogs: [
    {
      path: "<rootDir>/packages/i18n/src/po/{locale}",
      include: ["<rootDir>/apps/web/src", "<rootDir>/apps/native/src"],
    },
  ],
  format: formatter({
    lineNumbers: false,
  }),
  fallbackLocales: {
    default: "en",
  },
});
