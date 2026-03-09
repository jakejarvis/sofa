import { atom } from "jotai";
import type { Season } from "@/lib/orpc/schemas";

export const titleIdAtom = atom("");
export const titleTypeAtom = atom<"movie" | "tv">("movie");
export const titleNameAtom = atom("");
export const seasonsAtom = atom<Season[]>([]);
export const userStatusAtom = atom<string | null>(null);
export const userRatingAtom = atom(0);
export const episodeWatchesAtom = atom<string[]>([]);
export const watchingEpAtom = atom<string | null>(null);
