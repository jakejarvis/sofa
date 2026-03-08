import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { availabilityOffers, titles } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { getWatchProviders } from "@/lib/tmdb/client";

const log = createLogger("availability");

export async function refreshAvailability(titleId: string) {
  const title = db.select().from(titles).where(eq(titles.id, titleId)).get();
  if (!title) return;

  const data = await getWatchProviders(title.tmdbId, title.type);
  const us = data.results?.US;
  if (!us) {
    log.debug(`No US providers for title ${titleId}`);
    return;
  }

  const now = new Date();
  const offerTypes = ["flatrate", "rent", "buy", "free", "ads"] as const;

  // Collect all offer rows, then batch insert in a single transaction
  const allOfferRows: (typeof availabilityOffers.$inferInsert)[] = [];
  for (const offerType of offerTypes) {
    const providers = us[offerType];
    if (!providers) continue;
    for (const p of providers) {
      allOfferRows.push({
        titleId,
        region: "US",
        providerId: p.provider_id,
        providerName: p.provider_name ?? "",
        logoPath: p.logo_path ?? "",
        offerType,
        link: us.link ?? null,
        lastFetchedAt: now,
      });
    }
  }

  db.transaction((tx) => {
    tx.delete(availabilityOffers)
      .where(
        and(
          eq(availabilityOffers.titleId, titleId),
          eq(availabilityOffers.region, "US"),
        ),
      )
      .run();

    if (allOfferRows.length > 0) {
      tx.insert(availabilityOffers)
        .values(allOfferRows)
        .onConflictDoNothing()
        .run();
    }
  });

  const total = offerTypes.reduce((n, t) => n + (us[t]?.length ?? 0), 0);
  log.debug(`Refreshed availability for title ${titleId}: ${total} offers`);
}

export function getAvailability(titleId: string) {
  return db
    .select()
    .from(availabilityOffers)
    .where(eq(availabilityOffers.titleId, titleId))
    .all();
}
