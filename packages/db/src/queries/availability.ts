import { and, eq } from "drizzle-orm";

import { db } from "../client";
import { availabilityOffers } from "../schema";

export function replaceAvailabilityTransaction(
  titleId: string,
  region: string,
  offers: (typeof availabilityOffers.$inferInsert)[],
): void {
  db.transaction((tx) => {
    tx.delete(availabilityOffers)
      .where(and(eq(availabilityOffers.titleId, titleId), eq(availabilityOffers.region, region)))
      .run();

    if (offers.length > 0) {
      tx.insert(availabilityOffers).values(offers).onConflictDoNothing().run();
    }
  });
}

export function getAvailabilityOffers(titleId: string) {
  return db.select().from(availabilityOffers).where(eq(availabilityOffers.titleId, titleId)).all();
}
