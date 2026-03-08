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
  watchUrl: string | null;
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

export interface CastMember {
  id: string;
  personId: string;
  name: string;
  character: string | null;
  department: string;
  job: string | null;
  displayOrder: number;
  episodeCount: number | null;
  profilePath: string | null;
  tmdbId: number;
}

export interface ResolvedPerson {
  id: string;
  tmdbId: number;
  name: string;
  biography: string | null;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  profilePath: string | null;
  knownForDepartment: string | null;
  imdbId: string | null;
}

export interface PersonCredit {
  titleId: string;
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  firstAirDate: string | null;
  voteAverage: number | null;
  character: string | null;
  department: string;
  job: string | null;
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
  contentRating: string | null;
  colorPalette: ColorPalette | null;
  trailerVideoKey: string | null;
  genres: string[];
}
