export interface TmdbSearchResult {
  id: number;
  media_type: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  profile_path?: string | null;
  popularity: number;
  vote_average: number;
  vote_count: number;
}

export interface TmdbSearchResponse {
  page: number;
  results: TmdbSearchResult[];
  total_pages: number;
  total_results: number;
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  popularity: number;
  vote_average: number;
  vote_count: number;
  status: string;
  genres: TmdbGenre[];
  release_dates?: {
    results: {
      iso_3166_1: string;
      release_dates: { certification: string; type: number }[];
    }[];
  };
}

export interface TmdbTvDetails {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  first_air_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  popularity: number;
  vote_average: number;
  vote_count: number;
  status: string;
  number_of_seasons: number;
  genres: TmdbGenre[];
  content_ratings?: {
    results: { iso_3166_1: string; rating: string }[];
  };
  external_ids?: TmdbExternalIds;
  seasons: TmdbSeasonSummary[];
}

export interface TmdbExternalIds {
  tvdb_id: number | null;
  imdb_id: string | null;
}

export interface TmdbSeasonSummary {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string | null;
  episode_count: number;
}

export interface TmdbSeasonDetails {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string | null;
  episodes: TmdbEpisode[];
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
}

export interface TmdbWatchProviderResponse {
  id: number;
  results: Record<
    string,
    {
      link?: string;
      flatrate?: TmdbProvider[];
      rent?: TmdbProvider[];
      buy?: TmdbProvider[];
      free?: TmdbProvider[];
      ads?: TmdbProvider[];
    }
  >;
}

export interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface TmdbRecommendationResponse {
  page: number;
  results: TmdbSearchResult[];
  total_pages: number;
  total_results: number;
}

export interface TmdbFindResult {
  movie_results: TmdbSearchResult[];
  tv_results: TmdbSearchResult[];
  tv_episode_results: {
    id: number;
    episode_number: number;
    name: string;
    season_number: number;
    show_id: number;
  }[];
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
  size: number;
  iso_639_1: string;
  iso_3166_1: string;
}

export interface TmdbVideosResponse {
  id: number;
  results: TmdbVideo[];
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbGenreListResponse {
  genres: TmdbGenre[];
}

// ─── Person / Credits types ─────────────────────────────────────────

export interface TmdbCastMember {
  id: number;
  name: string;
  profile_path: string | null;
  character: string;
  order: number;
  popularity: number;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  profile_path: string | null;
  department: string;
  job: string;
  popularity: number;
}

export interface TmdbMovieCreditsResponse {
  id: number;
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

export interface TmdbTvAggregateCastMember {
  id: number;
  name: string;
  profile_path: string | null;
  roles: { character: string; episode_count: number }[];
  total_episode_count: number;
  order: number;
  popularity: number;
}

export interface TmdbTvAggregateCrewMember {
  id: number;
  name: string;
  profile_path: string | null;
  jobs: { job: string; episode_count: number }[];
  department: string;
  total_episode_count: number;
  popularity: number;
}

export interface TmdbTvAggregateCreditsResponse {
  id: number;
  cast: TmdbTvAggregateCastMember[];
  crew: TmdbTvAggregateCrewMember[];
}

export interface TmdbPersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  imdb_id: string | null;
  also_known_as: string[];
  popularity: number;
}

export interface TmdbPersonCombinedCredits {
  id: number;
  cast: (TmdbSearchResult & { character?: string; episode_count?: number })[];
  crew: (TmdbSearchResult & { department?: string; job?: string })[];
}

export interface TmdbPersonSearchResult {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
  known_for: TmdbSearchResult[];
}

export interface TmdbPersonSearchResponse {
  page: number;
  results: TmdbPersonSearchResult[];
  total_pages: number;
  total_results: number;
}
