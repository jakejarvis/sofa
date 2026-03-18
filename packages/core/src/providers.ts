/**
 * Provider registry mapping TMDB provider IDs to search URL templates.
 *
 * To add a new provider:
 * 1. Find the TMDB provider_id (visible in availability data or TMDB API)
 * 2. Add an entry below with the service's search URL using {title} placeholder
 */

interface ProviderConfig {
  name: string;
  searchUrl: string;
}

// TMDB provider_id → search URL config
const providers: Record<number, ProviderConfig> = {
  // Netflix
  8: { name: "Netflix", searchUrl: "https://www.netflix.com/search?q={title}" },
  1796: {
    name: "Netflix basic with Ads",
    searchUrl: "https://www.netflix.com/search?q={title}",
  },

  // Amazon
  9: {
    name: "Amazon Prime Video",
    searchUrl: "https://www.amazon.com/s?i=instant-video&k={title}",
  },
  10: {
    name: "Amazon Video",
    searchUrl: "https://www.amazon.com/s?i=instant-video&k={title}",
  },
  119: {
    name: "Amazon Prime Video",
    searchUrl: "https://www.amazon.com/s?i=instant-video&k={title}",
  },

  // Disney+
  337: {
    name: "Disney+",
    searchUrl: "https://www.disneyplus.com/search/{title}",
  },

  // Apple
  2: {
    name: "Apple iTunes",
    searchUrl: "https://tv.apple.com/search?term={title}",
  },
  350: {
    name: "Apple TV+",
    searchUrl: "https://tv.apple.com/search?term={title}",
  },

  // Hulu
  15: { name: "Hulu", searchUrl: "https://www.hulu.com/search?q={title}" },

  // Max (HBO)
  384: { name: "HBO Max", searchUrl: "https://play.max.com/search?q={title}" },
  1899: { name: "Max", searchUrl: "https://play.max.com/search?q={title}" },

  // Paramount+
  531: {
    name: "Paramount+",
    searchUrl: "https://www.paramountplus.com/search/?q={title}",
  },

  // Peacock
  386: {
    name: "Peacock",
    searchUrl: "https://www.peacocktv.com/search?q={title}",
  },

  // Google Play
  3: {
    name: "Google Play Movies",
    searchUrl: "https://play.google.com/store/search?q={title}&c=movies",
  },

  // YouTube
  192: {
    name: "YouTube",
    searchUrl: "https://www.youtube.com/results?search_query={title}",
  },

  // Crunchyroll
  283: {
    name: "Crunchyroll",
    searchUrl: "https://www.crunchyroll.com/search?q={title}",
  },

  // Free / ad-supported
  73: { name: "Tubi", searchUrl: "https://tubitv.com/search/{title}" },
  300: {
    name: "Pluto TV",
    searchUrl: "https://pluto.tv/search/details?q={title}",
  },

  // Other
  257: { name: "fuboTV", searchUrl: "https://www.fubo.tv/search/{title}" },
  43: {
    name: "Starz",
    searchUrl: "https://www.starz.com/search?query={title}",
  },
  37: {
    name: "Showtime",
    searchUrl: "https://www.sho.com/search?q={title}",
  },
};

const providerRegistry: ReadonlyMap<number, ProviderConfig> = new Map(
  Object.entries(providers).map(([id, config]) => [Number(id), config]),
);

export function generateProviderUrl(providerId: number, titleName: string): string | null {
  const config = providerRegistry.get(providerId);
  if (!config) return null;
  return config.searchUrl.replace("{title}", encodeURIComponent(titleName));
}
