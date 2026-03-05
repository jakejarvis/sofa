export interface Episode {
  id: string;
  episodeNumber: number;
  name: string | null;
  overview: string | null;
  stillPath: string | null;
  airDate: string | null;
  runtimeMinutes: number | null;
}

export interface Season {
  id: string;
  seasonNumber: number;
  name: string | null;
  episodes: Episode[];
}

export interface AvailabilityOffer {
  providerId: number;
  providerName: string;
  logoPath: string | null;
  offerType: string;
}

export interface RecommendedTitle {
  id: string;
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  firstAirDate: string | null;
  voteAverage: number | null;
}

export interface ColorPalette {
  vibrant: string | null;
  darkVibrant: string | null;
  lightVibrant: string | null;
  muted: string | null;
  darkMuted: string | null;
  lightMuted: string | null;
}

export interface ResolvedTitle {
  id: string;
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  originalTitle: string | null;
  overview: string | null;
  releaseDate: string | null;
  firstAirDate: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  popularity: number | null;
  voteAverage: number | null;
  voteCount: number | null;
  status: string | null;
  colorPalette: ColorPalette | null;
  trailerVideoKey: string | null;
}
