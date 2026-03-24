import {
  ensurePlatformForTmdbProvider,
  getAvailabilityForTitle,
  replaceAvailabilityTransaction,
} from "@sofa/db/queries/availability";
import { getTitleById } from "@sofa/db/queries/title";
import type { titleAvailability } from "@sofa/db/schema";
import { createLogger } from "@sofa/logger";
import { getWatchProviders } from "@sofa/tmdb/client";

const log = createLogger("availability");

export async function refreshAvailability(titleId: string) {
  const title = getTitleById(titleId);
  if (!title) return;

  const data = await getWatchProviders(title.tmdbId, title.type);
  const us = data.results?.US;
  const now = new Date();
  const offerTypes = ["flatrate", "rent", "buy", "free", "ads"] as const;

  const allOfferRows: (typeof titleAvailability.$inferInsert)[] = [];
  if (us) {
    for (const offerType of offerTypes) {
      const providers = us[offerType];
      if (!providers) continue;
      for (const p of providers) {
        const platformId = ensurePlatformForTmdbProvider(
          p.provider_id,
          p.provider_name ?? "",
          p.logo_path ?? null,
        );
        allOfferRows.push({
          titleId,
          platformId,
          offerType,
          region: "US",
          lastFetchedAt: now,
        });
      }
    }
  }

  replaceAvailabilityTransaction(titleId, "US", allOfferRows);

  if (!us) {
    log.debug(`No US providers for title ${titleId}; cleared cached offers`);
    return;
  }

  const total = offerTypes.reduce((n, t) => n + (us[t]?.length ?? 0), 0);
  log.debug(`Refreshed availability for title ${titleId}: ${total} offers`);
}

export function getAvailability(titleId: string) {
  return getAvailabilityForTitle(titleId);
}
