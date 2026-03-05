import { atom } from "jotai";
import { loadable } from "jotai/utils";
import { fetchUserStatuses } from "@/lib/actions/watchlist";

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

export const genreResultsLoadable = loadable(genreResultsAsyncAtom);

const genreUserStatusesAsyncAtom = atom(async (get) => {
  const genre = get(selectedGenreAtom);
  if (genre === null) return null;
  const genreResults = await get(genreResultsAsyncAtom);
  if (!genreResults || genreResults.length === 0) return {};
  return fetchUserStatuses(
    genreResults.map((r) => ({ tmdbId: r.tmdbId, type: r.type })),
  );
});

export const genreUserStatusesLoadable = loadable(genreUserStatusesAsyncAtom);
