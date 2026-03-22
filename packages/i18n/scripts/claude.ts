#!/usr/bin/env bun
/**
 * Translates empty PO file entries using Claude Code CLI.
 *
 * Usage:
 *   bun scripts/translate.ts <locale|all> [--model <model>] [--batch-size <n>] [--dry-run]
 *
 * Examples:
 *   bun scripts/translate.ts fr
 *   bun scripts/translate.ts all --model sonnet
 *   bun scripts/translate.ts de --dry-run
 */

import { resolve } from "node:path";

const SIMPLE_PLACEHOLDER_RE = /^[a-zA-Z0-9_]+$/;
const ICU_ARG_NAME_RE = /^([a-zA-Z0-9_]+)\s*,/;
const NUMBERED_TAG_RE = /<\/?\d+\/?>/g;
const LEADING_WS_RE = /^\s*/;
const TRAILING_WS_RE = /\s*$/;
const EDGE_WS_RE = /^\s|\s$/;

import type { CatalogType } from "@lingui/conf";
import { formatter } from "@lingui/format-po";

import linguiConfig from "../../../lingui.config";

const poFormat = formatter();

// ─── Config ──────────────────────────────────────────────

const SOURCE_LOCALE = linguiConfig.sourceLocale ?? "en";
const LOCALES = (linguiConfig.locales as string[]).filter((l) => l !== SOURCE_LOCALE);

const DEFAULT_MODEL = "sonnet";
const DEFAULT_BATCH_SIZE = 100;
const MAX_RETRIES = 3;

const PO_DIR = resolve(import.meta.dir, "../src/po");
const CONTEXT_FILE = resolve(import.meta.dir, "../../../crowdin-context.jsonl");

/** Resolve a locale code to its English display name via Intl */
function localeName(code: string): string {
  return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
}

function usage(): never {
  console.log(
    "Usage: bun scripts/translate.ts <locale|all> [--model <model>] [--batch-size <n>] [--dry-run]",
  );
  console.log(`  Locales: ${LOCALES.join(", ")}`);
  process.exit(1);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

// ─── AI Context ──────────────────────────────────────────

interface ContextEntry {
  text: string;
  ai_context: string;
}

async function loadContext(): Promise<Map<string, string>> {
  const contextMap = new Map<string, string>();
  const file = Bun.file(CONTEXT_FILE);

  if (!(await file.exists())) {
    console.log("  (no crowdin-context.jsonl found, translating without AI context)\n");
    return contextMap;
  }

  const text = await file.text();
  const lines = text.split("\n");

  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;

    try {
      const entry: ContextEntry = JSON.parse(line);

      if (typeof entry.text !== "string" || typeof entry.ai_context !== "string") {
        throw new Error("expected { text: string, ai_context: string }");
      }

      contextMap.set(entry.text, entry.ai_context);
    } catch (error) {
      // oxlint-disable-next-line preserve-caught-error
      throw new Error(
        `Invalid JSONL entry in ${CONTEXT_FILE} at line ${index + 1}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  console.log(`  Loaded ${contextMap.size} AI context entries from crowdin-context.jsonl\n`);
  return contextMap;
}

// ─── CLI Args ────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let locale: string | undefined;
  let model = DEFAULT_MODEL;
  let batchSize = DEFAULT_BATCH_SIZE;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--model") {
      const value = args[++i];
      if (!value || value.startsWith("--")) {
        fail("Missing value for --model");
      }
      model = value;
      continue;
    }

    if (arg === "--batch-size") {
      const value = args[++i];
      if (!value || value.startsWith("--")) {
        fail("Missing value for --batch-size");
      }

      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        fail(`Invalid --batch-size: ${value}`);
      }

      batchSize = parsed;
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg.startsWith("--")) {
      fail(`Unknown flag: ${arg}`);
    }

    if (locale) {
      fail(`Unexpected extra positional argument: ${arg}`);
    }

    locale = arg;
  }

  if (!locale) {
    usage();
  }

  if (locale !== "all" && !LOCALES.includes(locale)) {
    fail(`Unknown locale: ${locale}. Valid: ${LOCALES.join(", ")}, all`);
  }

  const locales: string[] = locale === "all" ? [...LOCALES] : [locale];
  return { locales, model, batchSize, dryRun };
}

// ─── PO Helpers ──────────────────────────────────────────

interface UntranslatedEntry {
  /** Lingui catalog key (may be a hashed ID like "nJw77c") */
  key: string;
  /** The actual English source text to translate */
  message: string;
}

function getUntranslatedEntries(catalog: CatalogType): UntranslatedEntry[] {
  return Object.entries(catalog)
    .filter(([, entry]) => entry && !entry.translation)
    .map(([key, entry]) => ({
      key,
      // entry.message is the source text; fall back to key for explicit-id catalogs
      message: entry.message || key,
    }));
}

// ─── Basic Structural Validation ─────────────────────────
// Catches common placeholder/tag damage. NOT a full ICU MessageFormat validator —
// does not detect argument type changes, malformed plural/select, or nested corruption.

function extractSimplePlaceholders(text: string): string[] {
  // Extract top-level ICU placeholders ({0}, {name}, {count}) while skipping
  // content words nested inside plural/select branches like {episode} in
  // "{count, plural, one {episode} other {episodes}}".
  const results: string[] = [];
  let depth = 0;
  let argStart = -1;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      if (depth === 0) argStart = i;
      depth++;
    } else if (text[i] === "}") {
      depth--;
      if (depth === 0 && argStart >= 0) {
        const inner = text.slice(argStart + 1, i);
        // Top-level simple placeholder: just an identifier, no comma (not plural/select)
        if (SIMPLE_PLACEHOLDER_RE.test(inner)) {
          results.push(`{${inner}}`);
        } else {
          // Complex ICU argument — extract just the argument name before the comma
          const argName = inner.match(ICU_ARG_NAME_RE)?.[1];
          if (argName) results.push(`{${argName}}`);
        }
        argStart = -1;
      }
    }
  }

  return results.sort();
}

function extractNumberedTags(text: string): string[] {
  // Matches <0>, </0>, <0/>, <12>, </12>, <12/>
  return Array.from(text.matchAll(NUMBERED_TAG_RE), (m) => m[0]).sort();
}

function leadingWhitespace(text: string): string {
  return text.match(LEADING_WS_RE)?.[0] ?? "";
}

function trailingWhitespace(text: string): string {
  return text.match(TRAILING_WS_RE)?.[0] ?? "";
}

function validateTranslation(source: string, translated: string): string[] {
  const issues: string[] = [];

  if (translated.length === 0 && source.length > 0) {
    issues.push("empty translation");
  }

  const srcPlaceholders = extractSimplePlaceholders(source);
  const dstPlaceholders = extractSimplePlaceholders(translated);
  if (JSON.stringify(srcPlaceholders) !== JSON.stringify(dstPlaceholders)) {
    issues.push("placeholder mismatch");
  }

  const srcTags = extractNumberedTags(source);
  const dstTags = extractNumberedTags(translated);
  if (JSON.stringify(srcTags) !== JSON.stringify(dstTags)) {
    issues.push("tag mismatch");
  }

  // Only enforce whitespace when the source has meaningful edge whitespace
  if (EDGE_WS_RE.test(source)) {
    if (leadingWhitespace(source) !== leadingWhitespace(translated)) {
      issues.push("leading whitespace mismatch");
    }

    if (trailingWhitespace(source) !== trailingWhitespace(translated)) {
      issues.push("trailing whitespace mismatch");
    }
  }

  return issues;
}

// ─── Consistency Hints ───────────────────────────────────

function buildConsistencyHints(accepted: Map<string, string>, limit = 50): string | undefined {
  if (accepted.size === 0) return undefined;

  const pairs = [...accepted.entries()]
    .slice(-limit)
    .map(([source, translated]) => `- ${JSON.stringify(source)} => ${JSON.stringify(translated)}`)
    .join("\n");

  return [
    "Previously used translations for consistency:",
    pairs,
    "Reuse these choices where appropriate.",
  ].join("\n");
}

// ─── Translation via Claude CLI ──────────────────────────

async function translateBatchRaw(
  strings: string[],
  locale: string,
  model: string,
  contextMap: Map<string, string>,
  consistencyHints?: string,
): Promise<string[]> {
  const language = localeName(locale);

  const input = strings.map((s, i) => {
    const ctx = contextMap.get(s);
    return ctx ? { index: i, text: s, context: ctx } : { index: i, text: s };
  });

  const systemPrompt = [
    "You are a professional translator for a self-hosted movie & TV tracking app called Sofa.",
    `Translate UI strings from English to ${language}.`,
    "",
    "Rules:",
    "- Return translations in the SAME ORDER as the input array, one per input string.",
    "- Return ONLY the structured output required by the schema.",
    "- Preserve leading and trailing whitespace exactly.",
    "- Preserve line breaks exactly unless the source meaning requires otherwise.",
    "- Placeholder rules (critical):",
    "  - Every placeholder in the source ({0}, {name}, {count}, etc.) MUST appear in the translation. Do NOT add, remove, or rename placeholders.",
    "  - Do NOT change placeholder types: a simple placeholder like {0} CANNOT become a complex argument like {0, plural, ...}. Keep the same structural skeleton.",
    '  - You MAY reorder placeholders to fit target language grammar (e.g. "{0} {1}" → "{1} {0}").',
    '  - For ICU plural/select blocks that ALREADY EXIST in the source: you MUST adapt plural categories to the target language\'s CLDR rules. E.g. English "one/other" may need "one/few/many/other" in some languages. Add or remove categories as needed.',
    "  - Do NOT translate ICU keywords (one, other, few, many, zero, two) or the # symbol inside plurals.",
    "- Preserve JSX-like component tags EXACTLY: <0/>, <0>text</0>, <1>…</1> — translate text between tags, keep the tags. You may reorder tags.",
    "- When adjectives/participles need to agree in number with a dynamic count, move them INSIDE the plural block so each category can have correct agreement.",
    "- Keep translations concise — these are UI labels, buttons, toasts, and short messages.",
    "- Do NOT translate brand/product names: Sofa, TMDB, Plex, Jellyfin, Emby, Trakt, Simkl, Overseerr, Jellyseerr.",
    "- Use natural, idiomatic phrasing for the target language.",
    "- Consistency: translate the same English term the same way every time.",
    '- Each input has a "text" field to translate. Some also have a "context" field explaining where/how the string is used — use this to produce more accurate translations.',
    "- If a string is already a brand name, code token, identifier, or path, keep it unchanged.",
    ...(consistencyHints ? ["", consistencyHints] : []),
  ].join("\n");

  const prompt = JSON.stringify(input);

  const schema = JSON.stringify({
    type: "object",
    additionalProperties: false,
    properties: {
      translations: {
        type: "array",
        items: { type: "string" },
        minItems: strings.length,
        maxItems: strings.length,
      },
    },
    required: ["translations"],
  });

  const proc = Bun.spawn(
    [
      "claude",
      "-p",
      "--output-format",
      "json",
      "--json-schema",
      schema,
      "--model",
      model,
      "--no-session-persistence",
      "--system-prompt",
      systemPrompt,
      "--tools",
      "",
    ],
    { stdout: "pipe", stderr: "pipe", stdin: new Response(prompt) },
  );

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`Claude CLI failed (exit ${exitCode}): ${stderr || stdout}`);
  }

  let result: { translations: string[] };
  try {
    const parsed = JSON.parse(stdout);
    const structured = parsed.structured_output ?? parsed.result ?? parsed;
    result = typeof structured === "string" ? JSON.parse(structured) : structured;
  } catch {
    throw new Error(`Failed to parse Claude response. Raw output:\n${stdout.slice(0, 1000)}`);
  }

  if (!Array.isArray(result.translations) || result.translations.length !== strings.length) {
    throw new Error(
      `Expected ${strings.length} translations, got ${result.translations?.length ?? 0}.\nRaw: ${stdout.slice(0, 1000)}`,
    );
  }

  return result.translations;
}

async function translateBatch(
  strings: string[],
  locale: string,
  model: string,
  contextMap: Map<string, string>,
  consistencyHints?: string,
): Promise<string[]> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const translations = await translateBatchRaw(
        strings,
        locale,
        model,
        contextMap,
        consistencyHints,
      );

      const validationErrors: string[] = [];
      for (let i = 0; i < strings.length; i++) {
        const issues = validateTranslation(strings[i], translations[i]);
        if (issues.length > 0) {
          validationErrors.push(
            `index ${i}: ${issues.join(", ")}\nsource: ${JSON.stringify(strings[i])}\ntranslation: ${JSON.stringify(translations[i])}`,
          );
        }
      }

      if (validationErrors.length > 0) {
        throw new Error(
          `Translation validation failed:\n${validationErrors.slice(0, 10).join("\n\n")}${
            validationErrors.length > 10
              ? `\n\n...and ${validationErrors.length - 10} more validation errors`
              : ""
          }`,
        );
      }

      return translations;
    } catch (error) {
      lastError = error;

      if (attempt < MAX_RETRIES) {
        const delayMs = 500 * attempt;
        console.warn(
          `      attempt ${attempt}/${MAX_RETRIES} failed; retrying in ${delayMs}ms\n      ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        await Bun.sleep(delayMs);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

// ─── Main ────────────────────────────────────────────────

async function translateLocale(
  locale: string,
  model: string,
  batchSize: number,
  dryRun: boolean,
  contextMap: Map<string, string>,
) {
  const filePath = resolve(PO_DIR, `${locale}.po`);
  const file = Bun.file(filePath);

  if (!(await file.exists())) {
    throw new Error(`PO file not found for locale "${locale}": ${filePath}`);
  }

  const content = await file.text();
  const ctx = { locale, sourceLocale: SOURCE_LOCALE, filename: filePath };
  const catalog = await poFormat.parse(content, ctx);

  const untranslated = getUntranslatedEntries(catalog);

  if (untranslated.length === 0) {
    console.log(`  ${locale}: all strings already translated`);
    return;
  }

  console.log(`  ${locale}: ${untranslated.length} strings to translate`);

  if (dryRun) {
    console.log(`  ${locale}: dry run — skipping`);
    return;
  }

  // Map of catalog key → translated string
  const translations = new Map<string, string>();
  // Map of source message → translated string (for consistency hints + validation)
  const messageTranslations = new Map<string, string>();
  const totalBatches = Math.ceil(untranslated.length / batchSize);

  for (let i = 0; i < totalBatches; i++) {
    const batch = untranslated.slice(i * batchSize, (i + 1) * batchSize);
    const messages = batch.map((e) => e.message);

    console.log(`    batch ${i + 1}/${totalBatches} (${batch.length} strings)...`);

    const hints = buildConsistencyHints(messageTranslations);
    const translated = await translateBatch(messages, locale, model, contextMap, hints);

    for (let j = 0; j < batch.length; j++) {
      translations.set(batch[j].key, translated[j]);
      messageTranslations.set(batch[j].message, translated[j]);
    }
  }

  // Write translations back to catalog using keys
  for (const [key, msgstr] of translations) {
    if (catalog[key]) {
      catalog[key].translation = msgstr;
    }
  }
  const serialized = await poFormat.serialize(catalog, { ...ctx, existing: content });
  await Bun.write(filePath, serialized);
  console.log(`  ${locale}: wrote ${translations.size} translations`);
}

const { locales, model, batchSize, dryRun } = parseArgs();

console.log(
  `Translating PO files via Claude (model: ${model}, batch size: ${batchSize})${dryRun ? " [DRY RUN]" : ""}\n`,
);

const contextMap = await loadContext();

// Process locales sequentially to reduce CLI/rate-limit pressure and keep logs readable.
for (const locale of locales) {
  await translateLocale(locale, model, batchSize, dryRun, contextMap);
}

// if (!dryRun) {
//   // Re-extract to restore #. placeholder comments that @lingui/format-po's
//   // serialize() strips during the round-trip.
//   console.log("Re-extracting to restore comments...");
//   const extract = Bun.spawn(["bun", "run", "i18n:extract"], {
//     stdout: "inherit",
//     stderr: "inherit",
//   });
//   if ((await extract.exited) !== 0) {
//     console.error("Extraction failed");
//     process.exit(1);
//   }
// }

console.log("Done!");
