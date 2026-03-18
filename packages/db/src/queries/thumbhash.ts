import { eq } from "drizzle-orm";

import { db } from "../client";
import { episodes, persons, seasons, titles } from "../schema";

export function updateTitlePosterThumbHash(titleId: string, hash: string | null): void {
  db.update(titles).set({ posterThumbHash: hash }).where(eq(titles.id, titleId)).run();
}

export function updateTitleBackdropThumbHash(titleId: string, hash: string | null): void {
  db.update(titles).set({ backdropThumbHash: hash }).where(eq(titles.id, titleId)).run();
}

export function updateSeasonPosterThumbHash(seasonId: string, hash: string | null): void {
  db.update(seasons).set({ posterThumbHash: hash }).where(eq(seasons.id, seasonId)).run();
}

export function updateEpisodeStillThumbHash(episodeId: string, hash: string | null): void {
  db.update(episodes).set({ stillThumbHash: hash }).where(eq(episodes.id, episodeId)).run();
}

export function updatePersonProfileThumbHash(personId: string, hash: string | null): void {
  db.update(persons).set({ profileThumbHash: hash }).where(eq(persons.id, personId)).run();
}
