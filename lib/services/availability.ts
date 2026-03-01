import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { availabilityOffers, titles } from "@/lib/db/schema";
import { getWatchProviders } from "@/lib/tmdb/client";

export async function refreshAvailability(titleId: string) {
  const title = await db
    .select()
    .from(titles)
    .where(eq(titles.id, titleId))
    .get();
  if (!title) return;

  const data = await getWatchProviders(title.tmdbId, title.type);
  const us = data.results?.US;
  if (!us) return;

  const now = new Date();
  const offerTypes = ["flatrate", "rent", "buy", "free", "ads"] as const;

  // Delete existing offers for this title+region
  await db
    .delete(availabilityOffers)
    .where(
      and(
        eq(availabilityOffers.titleId, titleId),
        eq(availabilityOffers.region, "US"),
      ),
    )
    .run();

  for (const offerType of offerTypes) {
    const providers = us[offerType];
    if (!providers) continue;

    for (const p of providers) {
      await db
        .insert(availabilityOffers)
        .values({
          titleId,
          region: "US",
          providerId: p.provider_id,
          providerName: p.provider_name,
          logoPath: p.logo_path,
          offerType,
          link: us.link ?? null,
          lastFetchedAt: now,
        })
        .onConflictDoNothing()
        .run();
    }
  }
}

export async function getAvailability(titleId: string) {
  return db
    .select()
    .from(availabilityOffers)
    .where(eq(availabilityOffers.titleId, titleId))
    .all();
}
