import { atom } from "jotai";
import { loadable } from "jotai/utils";

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
