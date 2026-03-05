import { atom } from "jotai";
import { unwrap } from "jotai/utils";
import {
  fetchEpisodeProgress,
  fetchUserStatuses,
} from "@/lib/actions/watchlist";

type TitleStatus = "watchlist" | "in_progress" | "completed";

interface TitleRowItem {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
}

export const selectedGenreAtom = atom<number | null>(null);
export const mediaTypeAtom = atom<"movie" | "tv">("movie");
export const defaultItemsAtom = atom<TitleRowItem[]>([]);
export const initialUserStatusesAtom = atom<Record<string, TitleStatus>>({});
export const initialEpisodeProgressAtom = atom<
  Record<string, { watched: number; total: number }>
>({});

const genreResultsAsyncAtom = atom(async (get) => {
  const genre = get(selectedGenreAtom);
  const mediaType = get(mediaTypeAtom);
  if (genre === null) return null;
  const res = await fetch(
    `/api/explore/discover?type=${mediaType}&genre=${genre}&sort_by=popularity.desc`,
  );
  const data = await res.json();
  return (data.results ?? []) as TitleRowItem[];
});

export const genreResultsAtom = unwrap(genreResultsAsyncAtom);

interface GenreEnrichments {
  statuses: Record<string, TitleStatus>;
  progress: Record<string, { watched: number; total: number }>;
}

const genreEnrichmentsAsyncAtom = atom(
  async (get): Promise<GenreEnrichments | null> => {
    const genre = get(selectedGenreAtom);
    if (genre === null) return null;
    const genreResults = await get(genreResultsAsyncAtom);
    if (!genreResults || genreResults.length === 0)
      return { statuses: {}, progress: {} };
    const items = genreResults.map((r) => ({ tmdbId: r.tmdbId, type: r.type }));
    const [statuses, progress] = await Promise.all([
      fetchUserStatuses(items),
      fetchEpisodeProgress(items),
    ]);
    return { statuses, progress };
  },
);

export const genreEnrichmentsAtom = unwrap(genreEnrichmentsAsyncAtom);
