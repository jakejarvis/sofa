import { defineConfig } from "@lingui/conf";
import { formatter } from "@lingui/format-po";

export default defineConfig({
  locales: ["en", "fr", "de", "es", "it", "pt"],
  sourceLocale: "en",
  catalogs: [
    {
      path: "packages/i18n/src/po/{locale}",
      include: ["apps/web/src", "apps/native/src"],
    },
  ],
  format: formatter(),
  compileNamespace: "ts",
});
