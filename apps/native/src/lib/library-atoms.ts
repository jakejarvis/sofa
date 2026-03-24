import { atom } from "jotai";

export type SortBy =
  | "added_at"
  | "title"
  | "release_date"
  | "user_rating"
  | "vote_average"
  | "popularity";

export const libraryActiveFilterCountAtom = atom(0);
export const librarySortByAtom = atom<SortBy>("added_at");
export const librarySortDirectionAtom = atom<"asc" | "desc">("desc");
