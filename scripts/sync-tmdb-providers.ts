/**
 * Pulls all watch providers from the TMDB API, updates logo paths for existing
 * providers, and auto-appends any missing ones to platforms.json.
 *
 * Usage: bun scripts/sync-tmdb-providers.ts [--region US]
 */

import type { SeedPlatform } from "../packages/db/src/seed-platforms";
import { getWatchProviderList } from "../packages/tmdb/src/client";

const region = process.argv.includes("--region")
  ? (process.argv[process.argv.indexOf("--region") + 1] ?? "US")
  : "US";

console.log(`Fetching TMDB watch providers for region: ${region}\n`);

const [movieProviders, tvProviders] = await Promise.all([
  getWatchProviderList("movie", region),
  getWatchProviderList("tv", region),
]);

// Union by provider_id, preferring movie entry for metadata
const allProviders = new Map<
  number,
  {
    provider_id: number;
    provider_name: string;
    logo_path: string | null;
    display_priorities: Record<string, number>;
  }
>();
for (const p of [...movieProviders, ...tvProviders]) {
  if (!allProviders.has(p.provider_id)) {
    allProviders.set(p.provider_id, p);
  }
}

// Read current platforms JSON
const jsonPath = new URL("../packages/db/src/platforms.json", import.meta.url).pathname;
const seedData: SeedPlatform[] = await Bun.file(jsonPath).json();

// Build set of known TMDB IDs
const knownIds = new Set(seedData.flatMap((p) => p.tmdbProviderIds));

// Update logo paths for existing entries
let logosUpdated = 0;
for (const entry of seedData) {
  const firstId = entry.tmdbProviderIds[0];
  if (firstId == null) continue;
  const tmdbProvider = allProviders.get(firstId);
  if (!tmdbProvider?.logo_path) continue;
  if (entry.logoPath !== tmdbProvider.logo_path) {
    entry.logoPath = tmdbProvider.logo_path;
    logosUpdated++;
  }
}
console.log(`Updated ${logosUpdated} logo paths for existing entries\n`);

// Find missing providers
const missing = [...allProviders.values()]
  .filter((p) => !knownIds.has(p.provider_id))
  .sort((a, b) => {
    const aPriority = a.display_priorities?.[region] ?? 999;
    const bPriority = b.display_priorities?.[region] ?? 999;
    return aPriority - bPriority;
  });

console.log(`Total TMDB providers for ${region}: ${allProviders.size}`);
console.log(`Already in seed data: ${knownIds.size}`);
console.log(`Missing: ${missing.length}\n`);

if (missing.length > 0) {
  for (const p of missing) {
    seedData.push({
      tmdbProviderIds: [p.provider_id],
      name: p.provider_name,
      logoPath: p.logo_path,
      urlTemplate: "",
      isSubscription: true,
    });
  }

  console.log(`Added ${missing.length} new providers`);
  console.log("\nTop 20 added:");
  for (const p of missing.slice(0, 20)) {
    const priority = p.display_priorities?.[region] ?? "?";
    console.log(`  [${p.provider_id}] ${p.provider_name} (priority: ${priority})`);
  }
  if (missing.length > 20) {
    console.log(`  ... and ${missing.length - 20} more`);
  }
}

await Bun.write(jsonPath, JSON.stringify(seedData, null, 2) + "\n");
console.log(`\nWrote ${seedData.length} providers to platforms.json`);
