import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { resolveLocale } from "@/lib/resolve-locale";
import { SUPPORTED_LOCALES } from "@sofa/i18n/locales";

describe("resolveLocale", () => {
  test("matches a supported language with a region", () => {
    expect(resolveLocale(["de-DE"])).toBe("de");
  });

  test("skips an unsupported first language", () => {
    expect(resolveLocale(["fa-IR", "fr-FR"])).toBe("fr");
  });

  test("maps the legacy Android Hebrew code", () => {
    expect(resolveLocale(["iw-IL"])).toBe("he");
    expect(resolveLocale(["he-IL"])).toBe("he");
  });

  test("matches on the primary subtag regardless of script, region or case", () => {
    expect(resolveLocale(["zh-Hant-TW"])).toBe("zh");
    expect(resolveLocale(["pt-BR"])).toBe("pt");
    expect(resolveLocale(["EN_us"])).toBe("en");
  });

  test("falls back to English", () => {
    expect(resolveLocale([null, "ko-KR"])).toBe("ko");
    expect(resolveLocale(["fa-IR"])).toBe("en");
    expect(resolveLocale([])).toBe("en");
  });
});

describe("app.json", () => {
  test("app.json declares every supported locale to the OS (add new locales to the expo-localization plugin)", () => {
    const appJson = JSON.parse(
      readFileSync(fileURLToPath(new URL("../../app.json", import.meta.url)), "utf8"),
    ) as { expo: { plugins: unknown[] } };
    const entry = appJson.expo.plugins.find(
      (plugin): plugin is [string, { supportedLocales: string[] }] =>
        Array.isArray(plugin) && plugin[0] === "expo-localization",
    );
    expect(entry).toBeDefined();
    expect([...(entry?.[1].supportedLocales ?? [])].sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });
});
