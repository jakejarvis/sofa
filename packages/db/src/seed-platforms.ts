import { sql } from "drizzle-orm";

import { db } from "./client";
import { platforms } from "./schema";

interface SeedPlatform {
  tmdbProviderId: number;
  name: string;
  urlTemplate: string;
  displayOrder: number;
}

const SEED_DATA: SeedPlatform[] = [
  // Netflix
  {
    tmdbProviderId: 8,
    name: "Netflix",
    urlTemplate: "https://www.netflix.com/search?q={title}",
    displayOrder: 1,
  },
  {
    tmdbProviderId: 1796,
    name: "Netflix basic with Ads",
    urlTemplate: "https://www.netflix.com/search?q={title}",
    displayOrder: 2,
  },

  // Amazon
  {
    tmdbProviderId: 9,
    name: "Amazon Prime Video",
    urlTemplate: "https://www.amazon.com/s?i=instant-video&k={title}",
    displayOrder: 3,
  },
  {
    tmdbProviderId: 10,
    name: "Amazon Video",
    urlTemplate: "https://www.amazon.com/s?i=instant-video&k={title}",
    displayOrder: 4,
  },
  {
    tmdbProviderId: 119,
    name: "Amazon Prime Video",
    urlTemplate: "https://www.amazon.com/s?i=instant-video&k={title}",
    displayOrder: 5,
  },

  // Disney+
  {
    tmdbProviderId: 337,
    name: "Disney+",
    urlTemplate: "https://www.disneyplus.com/search/{title}",
    displayOrder: 6,
  },

  // Apple
  {
    tmdbProviderId: 2,
    name: "Apple iTunes",
    urlTemplate: "https://tv.apple.com/search?term={title}",
    displayOrder: 7,
  },
  {
    tmdbProviderId: 350,
    name: "Apple TV+",
    urlTemplate: "https://tv.apple.com/search?term={title}",
    displayOrder: 8,
  },

  // Hulu
  {
    tmdbProviderId: 15,
    name: "Hulu",
    urlTemplate: "https://www.hulu.com/search?q={title}",
    displayOrder: 9,
  },

  // Max (HBO)
  {
    tmdbProviderId: 384,
    name: "HBO Max",
    urlTemplate: "https://play.max.com/search?q={title}",
    displayOrder: 10,
  },
  {
    tmdbProviderId: 1899,
    name: "Max",
    urlTemplate: "https://play.max.com/search?q={title}",
    displayOrder: 11,
  },

  // Paramount+
  {
    tmdbProviderId: 531,
    name: "Paramount+",
    urlTemplate: "https://www.paramountplus.com/search/?q={title}",
    displayOrder: 12,
  },

  // Peacock
  {
    tmdbProviderId: 386,
    name: "Peacock",
    urlTemplate: "https://www.peacocktv.com/search?q={title}",
    displayOrder: 13,
  },

  // Google Play
  {
    tmdbProviderId: 3,
    name: "Google Play Movies",
    urlTemplate: "https://play.google.com/store/search?q={title}&c=movies",
    displayOrder: 14,
  },

  // YouTube
  {
    tmdbProviderId: 192,
    name: "YouTube",
    urlTemplate: "https://www.youtube.com/results?search_query={title}",
    displayOrder: 15,
  },

  // Crunchyroll
  {
    tmdbProviderId: 283,
    name: "Crunchyroll",
    urlTemplate: "https://www.crunchyroll.com/search?q={title}",
    displayOrder: 16,
  },

  // Free / ad-supported
  {
    tmdbProviderId: 73,
    name: "Tubi",
    urlTemplate: "https://tubitv.com/search/{title}",
    displayOrder: 17,
  },
  {
    tmdbProviderId: 300,
    name: "Pluto TV",
    urlTemplate: "https://pluto.tv/search/details?q={title}",
    displayOrder: 18,
  },

  // Other
  {
    tmdbProviderId: 257,
    name: "fuboTV",
    urlTemplate: "https://www.fubo.tv/search/{title}",
    displayOrder: 19,
  },
  {
    tmdbProviderId: 43,
    name: "Starz",
    urlTemplate: "https://www.starz.com/search?query={title}",
    displayOrder: 20,
  },
  {
    tmdbProviderId: 37,
    name: "Showtime",
    urlTemplate: "https://www.sho.com/search?q={title}",
    displayOrder: 21,
  },
];

export function seedPlatforms(): void {
  const insert = db
    .insert(platforms)
    .values({
      id: sql.placeholder("id"),
      tmdbProviderId: sql.placeholder("tmdbProviderId"),
      name: sql.placeholder("name"),
      urlTemplate: sql.placeholder("urlTemplate"),
      displayOrder: sql.placeholder("displayOrder"),
    })
    .onConflictDoUpdate({
      target: platforms.tmdbProviderId,
      set: {
        name: sql`excluded.name`,
        urlTemplate: sql`excluded.urlTemplate`,
        displayOrder: sql`excluded.displayOrder`,
      },
    })
    .prepare();

  db.transaction(() => {
    for (const p of SEED_DATA) {
      insert.execute({
        id: Bun.randomUUIDv7(),
        tmdbProviderId: p.tmdbProviderId,
        name: p.name,
        urlTemplate: p.urlTemplate,
        displayOrder: p.displayOrder,
      });
    }
  });
}
